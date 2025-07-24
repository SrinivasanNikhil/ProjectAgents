import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { getFileStorageConfig, validateFile } from '../config/fileStorage';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const config = getFileStorageConfig();

  // Check file size
  if (file.size && file.size > config.maxFileSize) {
    cb(
      new Error(
        `File size ${file.size} bytes exceeds maximum allowed size of ${config.maxFileSize} bytes`
      )
    );
    return;
  }

  // Check MIME type
  if (!config.allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error(`MIME type ${file.mimetype} is not allowed`));
    return;
  }

  // Check file extension
  const extension = file.originalname
    .toLowerCase()
    .substring(file.originalname.lastIndexOf('.'));
  if (!config.allowedExtensions.includes(extension)) {
    cb(new Error(`File extension ${extension} is not allowed`));
    return;
  }

  cb(null, true);
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: getFileStorageConfig().maxFileSize,
    files: 1, // Allow only one file at a time
  },
});

// Single file upload middleware
export const uploadSingle = upload.single('file');

// Multiple files upload middleware (for future use)
export const uploadMultiple = upload.array('files', 10); // Max 10 files

// Error handling middleware for file uploads
export const handleFileUploadError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof multer.MulterError) {
    logger.error('Multer error:', error);

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large',
          error: 'File size exceeds the maximum allowed limit',
          code: 'FILE_TOO_LARGE',
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files',
          error: 'Number of files exceeds the maximum allowed limit',
          code: 'TOO_MANY_FILES',
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field',
          error: 'File field name is not expected',
          code: 'UNEXPECTED_FILE_FIELD',
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          error: error.message,
          code: 'FILE_UPLOAD_ERROR',
        });
    }
  }

  if (
    (error.message && error.message.includes('MIME type')) ||
    error.message.includes('File extension') ||
    error.message.includes('File size')
  ) {
    return res.status(400).json({
      success: false,
      message: 'File validation failed',
      error: error.message,
      code: 'FILE_VALIDATION_ERROR',
    });
  }

  // Pass other errors to the next error handler
  next(error);
};

// Validation middleware for file upload requests
export const validateFileUploadRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file provided',
      error: 'File is required',
      code: 'NO_FILE_PROVIDED',
    });
  }

  // Additional validation can be added here
  const config = getFileStorageConfig();
  const validation = validateFile(req.file, config);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'File validation failed',
      error: validation.error,
      code: 'FILE_VALIDATION_ERROR',
    });
  }

  next();
};

// Middleware to check if file exists in request
export const requireFile = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'File is required',
      error: 'No file uploaded',
      code: 'FILE_REQUIRED',
    });
  }
  next();
};

// Middleware to validate file metadata
export const validateFileMetadata = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, description, category, tags, externalLinks } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file metadata',
      error: 'File name is required and must be a non-empty string',
      code: 'INVALID_FILE_NAME',
    });
  }

  if (name.length > 255) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file metadata',
      error: 'File name cannot exceed 255 characters',
      code: 'FILE_NAME_TOO_LONG',
    });
  }

  // Validate description if provided
  if (
    description &&
    (typeof description !== 'string' || description.length > 1000)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file metadata',
      error: 'Description cannot exceed 1000 characters',
      code: 'DESCRIPTION_TOO_LONG',
    });
  }

  // Validate category if provided
  const validCategories = [
    'requirement',
    'design',
    'implementation',
    'testing',
    'documentation',
    'presentation',
    'other',
  ];

  if (category && !validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file metadata',
      error: `Category must be one of: ${validCategories.join(', ')}`,
      code: 'INVALID_CATEGORY',
    });
  }

  // Validate tags if provided
  if (tags) {
    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file metadata',
        error: 'Tags must be an array',
        code: 'INVALID_TAGS_FORMAT',
      });
    }

    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file metadata',
          error: 'Each tag must be a string and cannot exceed 50 characters',
          code: 'INVALID_TAG',
        });
      }
    }
  }

  // Validate external links if provided
  if (externalLinks) {
    if (!Array.isArray(externalLinks)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file metadata',
        error: 'External links must be an array',
        code: 'INVALID_EXTERNAL_LINKS_FORMAT',
      });
    }

    for (const link of externalLinks) {
      if (!link.url || !link.title) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file metadata',
          error: 'External links must have both url and title',
          code: 'INVALID_EXTERNAL_LINK',
        });
      }

      if (typeof link.url !== 'string' || !link.url.match(/^https?:\/\/.+/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file metadata',
          error: 'External link URL must be a valid HTTP/HTTPS URL',
          code: 'INVALID_EXTERNAL_LINK_URL',
        });
      }

      if (typeof link.title !== 'string' || link.title.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file metadata',
          error: 'External link title cannot exceed 200 characters',
          code: 'EXTERNAL_LINK_TITLE_TOO_LONG',
        });
      }

      if (
        link.description &&
        (typeof link.description !== 'string' || link.description.length > 500)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file metadata',
          error: 'External link description cannot exceed 500 characters',
          code: 'EXTERNAL_LINK_DESCRIPTION_TOO_LONG',
        });
      }
    }
  }

  next();
};

// Combined middleware for file upload with validation
export const uploadFileWithValidation = [
  uploadSingle,
  handleFileUploadError,
  requireFile,
  validateFileMetadata,
];
