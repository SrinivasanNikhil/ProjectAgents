import AWS from 'aws-sdk';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

export interface FileStorageConfig {
  provider: 's3' | 'local';
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string;
  };
  local?: {
    uploadDir: string;
    publicUrl: string;
  };
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  imageProcessing?: {
    enabled: boolean;
    maxWidth: number;
    maxHeight: number;
    quality: number;
  };
}

// Default configuration
const defaultConfig: FileStorageConfig = {
  provider: 'local',
  local: {
    uploadDir: path.join(process.cwd(), 'uploads'),
    publicUrl: '/uploads',
  },
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    // Code files
    'text/javascript',
    'text/typescript',
    'text/css',
    'text/html',
    'application/json',
    'application/xml',
    'text/xml',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
  ],
  allowedExtensions: [
    // Documents
    '.pdf',
    '.doc',
    '.docx',
    '.txt',
    '.md',
    '.csv',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    // Images
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.svg',
    // Videos
    '.mp4',
    '.webm',
    '.ogg',
    '.mov',
    // Code
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.css',
    '.html',
    '.json',
    '.xml',
    // Archives
    '.zip',
    '.rar',
    '.7z',
    '.gz',
  ],
  imageProcessing: {
    enabled: true,
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
  },
};

// Initialize S3 configuration
const initializeS3 = (config: FileStorageConfig) => {
  if (config.provider !== 's3' || !config.s3) {
    return null;
  }

  const s3Config: AWS.S3.ClientConfiguration = {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
    region: config.s3.region,
  };

  // Add custom endpoint for development/testing (e.g., LocalStack)
  if (config.s3.endpoint) {
    s3Config.endpoint = config.s3.endpoint;
    s3Config.s3ForcePathStyle = true;
  }

  return new AWS.S3(s3Config);
};

// Initialize local storage
const initializeLocalStorage = (config: FileStorageConfig) => {
  if (config.provider !== 'local' || !config.local) {
    return null;
  }

  const uploadDir = config.local.uploadDir;

  // Create upload directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      logger.info(`Created upload directory: ${uploadDir}`);
    } catch (error) {
      logger.error(`Failed to create upload directory: ${uploadDir}`, error);
      throw new Error(`Failed to create upload directory: ${uploadDir}`);
    }
  }

  // Create subdirectories for different file types
  const subdirs = [
    'documents',
    'images',
    'videos',
    'code',
    'archives',
    'other',
  ];
  subdirs.forEach(subdir => {
    const subdirPath = path.join(uploadDir, subdir);
    if (!fs.existsSync(subdirPath)) {
      fs.mkdirSync(subdirPath, { recursive: true });
    }
  });

  return {
    uploadDir,
    publicUrl: config.local.publicUrl,
  };
};

// Get file storage configuration
export const getFileStorageConfig = (): FileStorageConfig => {
  const config: FileStorageConfig = { ...defaultConfig };

  // Determine storage provider
  const storageProvider = process.env.FILE_STORAGE_PROVIDER || 'local';
  config.provider = storageProvider as 's3' | 'local';

  // Configure S3 if provider is S3
  if (config.provider === 's3') {
    config.s3 = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET || 'ai-personas-artifacts',
      endpoint: process.env.AWS_S3_ENDPOINT, // Optional, for LocalStack etc.
    };

    // Validate S3 configuration
    if (!config.s3.accessKeyId || !config.s3.secretAccessKey) {
      logger.warn('S3 configuration incomplete, falling back to local storage');
      config.provider = 'local';
    }
  }

  // Configure local storage
  if (config.provider === 'local') {
    config.local = {
      uploadDir:
        process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
      publicUrl: process.env.LOCAL_PUBLIC_URL || '/uploads',
    };
  }

  // Configure file size limits
  const maxFileSize = process.env.MAX_FILE_SIZE;
  if (maxFileSize) {
    config.maxFileSize = parseInt(maxFileSize);
  }

  // Configure allowed MIME types
  const allowedMimeTypes = process.env.ALLOWED_MIME_TYPES;
  if (allowedMimeTypes) {
    config.allowedMimeTypes = allowedMimeTypes
      .split(',')
      .map(type => type.trim());
  }

  // Configure allowed extensions
  const allowedExtensions = process.env.ALLOWED_EXTENSIONS;
  if (allowedExtensions) {
    config.allowedExtensions = allowedExtensions
      .split(',')
      .map(ext => ext.trim());
  }

  // Configure image processing
  const imageProcessingEnabled = process.env.IMAGE_PROCESSING_ENABLED;
  if (imageProcessingEnabled !== undefined) {
    config.imageProcessing = {
      ...config.imageProcessing!,
      enabled: imageProcessingEnabled === 'true',
    };
  }

  return config;
};

// Initialize file storage
export const initializeFileStorage = () => {
  const config = getFileStorageConfig();

  let s3Client: AWS.S3 | null = null;
  let localStorage: { uploadDir: string; publicUrl: string } | null = null;

  if (config.provider === 's3') {
    s3Client = initializeS3(config);
    if (s3Client) {
      logger.info(`File storage initialized with S3: ${config.s3!.bucket}`);
    }
  } else {
    localStorage = initializeLocalStorage(config);
    if (localStorage) {
      logger.info(
        `File storage initialized with local storage: ${localStorage.uploadDir}`
      );
    }
  }

  return {
    config,
    s3Client,
    localStorage,
  };
};

// Validate file
export const validateFile = (
  file: Express.Multer.File,
  config: FileStorageConfig
): { isValid: boolean; error?: string } => {
  // Check file size
  if (file.size > config.maxFileSize) {
    return {
      isValid: false,
      error: `File size ${file.size} bytes exceeds maximum allowed size of ${config.maxFileSize} bytes`,
    };
  }

  // Check MIME type
  if (!config.allowedMimeTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: `MIME type ${file.mimetype} is not allowed`,
    };
  }

  // Check file extension
  const extension = path.extname(file.originalname).toLowerCase();
  if (!config.allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `File extension ${extension} is not allowed`,
    };
  }

  return { isValid: true };
};

// Get file category based on MIME type
export const getFileCategory = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('document') ||
    mimeType === 'application/pdf'
  )
    return 'documents';
  if (
    mimeType.includes('javascript') ||
    mimeType.includes('typescript') ||
    mimeType.includes('css') ||
    mimeType.includes('html') ||
    mimeType.includes('json') ||
    mimeType.includes('xml')
  )
    return 'code';
  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z') ||
    mimeType.includes('gzip')
  )
    return 'archives';
  return 'other';
};

// Generate unique filename
export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, extension);
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');

  return `${sanitizedName}_${timestamp}_${random}${extension}`;
};

// Get file type from MIME type
export const getFileType = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('document') ||
    mimeType === 'application/pdf'
  )
    return 'document';
  if (
    mimeType.includes('javascript') ||
    mimeType.includes('typescript') ||
    mimeType.includes('css') ||
    mimeType.includes('html') ||
    mimeType.includes('json') ||
    mimeType.includes('xml')
  )
    return 'code';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return 'presentation';
  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z') ||
    mimeType.includes('gzip')
  )
    return 'archive';
  return 'other';
};
