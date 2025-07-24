import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { Types } from 'mongoose';
import { logger } from '../config/logger';
import {
  FileStorageConfig,
  validateFile,
  getFileCategory,
  generateUniqueFilename,
  getFileType,
} from '../config/fileStorage';
import { Artifact, IArtifact } from '../models/Artifact';

export interface FileUploadResult {
  success: boolean;
  artifact?: IArtifact;
  error?: string;
  fileInfo?: {
    originalName: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
    extension: string;
  };
}

export interface FileDownloadResult {
  success: boolean;
  stream?: Readable;
  fileInfo?: {
    filename: string;
    mimeType: string;
    size: number;
  };
  error?: string;
}

export interface FileDeleteResult {
  success: boolean;
  error?: string;
}

export class FileService {
  private config: FileStorageConfig;
  private s3Client: AWS.S3 | null;
  private localStorage: { uploadDir: string; publicUrl: string } | null;

  constructor(
    config: FileStorageConfig,
    s3Client: AWS.S3 | null,
    localStorage: { uploadDir: string; publicUrl: string } | null
  ) {
    this.config = config;
    this.s3Client = s3Client;
    this.localStorage = localStorage;
  }

  /**
   * Upload a file and create an artifact record
   */
  async uploadFile(
    file: Express.Multer.File,
    projectId: Types.ObjectId,
    uploadedBy: Types.ObjectId,
    metadata: {
      name: string;
      description?: string;
      category?: string;
      tags?: string[];
      externalLinks?: Array<{
        url: string;
        title: string;
        description?: string;
      }>;
    }
  ): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = validateFile(file, this.config);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Generate unique filename
      const filename = generateUniqueFilename(file.originalname);
      const fileType = getFileType(file.mimetype);
      const category = metadata.category || getFileCategory(file.mimetype);

      // Upload file to storage
      const uploadResult = await this.uploadToStorage(file, filename, category);
      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        };
      }

      // Create artifact record
      const artifact = new Artifact({
        project: projectId,
        uploadedBy,
        name: metadata.name,
        description: metadata.description,
        type: fileType as any,
        category: category as any,
        fileInfo: {
          originalName: file.originalname,
          filename,
          url: uploadResult.url!,
          size: file.size,
          mimeType: file.mimetype,
          extension: path.extname(file.originalname).toLowerCase(),
        },
        metadata: {
          version: 1,
          isLatest: true,
          tags: metadata.tags || [],
          externalLinks: metadata.externalLinks || [],
        },
        permissions: {
          owner: uploadedBy,
          sharedWith: [],
          isPublic: false,
          allowDownload: true,
          allowEdit: false,
        },
        usage: {
          downloadCount: 0,
          viewCount: 0,
          lastModified: new Date(),
        },
        status: 'active',
      });

      const savedArtifact = await artifact.save();
      logger.info(
        `File uploaded successfully: ${filename} for project ${projectId}`
      );

      return {
        success: true,
        artifact: savedArtifact,
        fileInfo: uploadResult.fileInfo,
      };
    } catch (error) {
      logger.error('File upload failed:', error);
      return {
        success: false,
        error: 'File upload failed',
      };
    }
  }

  /**
   * Download a file by artifact ID
   */
  async downloadFile(
    artifactId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<FileDownloadResult> {
    try {
      // Get artifact
      const artifact = await Artifact.findById(artifactId);
      if (!artifact) {
        return {
          success: false,
          error: 'Artifact not found',
        };
      }

      // Check access permissions
      if (!artifact.hasAccess(userId)) {
        return {
          success: false,
          error: 'Access denied',
        };
      }

      // Increment download count
      await artifact.incrementDownloadCount();

      // Download from storage
      const downloadResult = await this.downloadFromStorage(artifact.fileInfo);
      if (!downloadResult.success) {
        return {
          success: false,
          error: downloadResult.error,
        };
      }

      return {
        success: true,
        stream: downloadResult.stream,
        fileInfo: {
          filename: artifact.fileInfo.originalName,
          mimeType: artifact.fileInfo.mimeType,
          size: artifact.fileInfo.size,
        },
      };
    } catch (error) {
      logger.error('File download failed:', error);
      return {
        success: false,
        error: 'File download failed',
      };
    }
  }

  /**
   * Delete a file and its artifact record
   */
  async deleteFile(
    artifactId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<FileDeleteResult> {
    try {
      // Get artifact
      const artifact = await Artifact.findById(artifactId);
      if (!artifact) {
        return {
          success: false,
          error: 'Artifact not found',
        };
      }

      // Check permissions
      if (!artifact.canEdit(userId)) {
        return {
          success: false,
          error: 'Permission denied',
        };
      }

      // Delete from storage
      const deleteResult = await this.deleteFromStorage(artifact.fileInfo);
      if (!deleteResult.success) {
        logger.warn(
          `Failed to delete file from storage: ${deleteResult.error}`
        );
      }

      // Mark artifact as deleted
      artifact.status = 'deleted';
      await artifact.save();

      logger.info(`File deleted successfully: ${artifact.fileInfo.filename}`);
      return { success: true };
    } catch (error) {
      logger.error('File deletion failed:', error);
      return {
        success: false,
        error: 'File deletion failed',
      };
    }
  }

  /**
   * Get file preview URL
   */
  async getPreviewUrl(
    artifactId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<string | null> {
    try {
      const artifact = await Artifact.findById(artifactId);
      if (!artifact || !artifact.hasAccess(userId)) {
        return null;
      }

      // Increment view count
      await artifact.incrementViewCount();

      return artifact.fileInfo.url;
    } catch (error) {
      logger.error('Failed to get preview URL:', error);
      return null;
    }
  }

  /**
   * Create a new version of an existing artifact
   */
  async createNewVersion(
    artifactId: Types.ObjectId,
    file: Express.Multer.File,
    uploadedBy: Types.ObjectId
  ): Promise<FileUploadResult> {
    try {
      // Get original artifact
      const originalArtifact = await Artifact.findById(artifactId);
      if (!originalArtifact) {
        return {
          success: false,
          error: 'Original artifact not found',
        };
      }

      // Validate file
      const validation = validateFile(file, this.config);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Generate unique filename
      const filename = generateUniqueFilename(file.originalname);
      const category = getFileCategory(file.mimetype);

      // Upload new file
      const uploadResult = await this.uploadToStorage(file, filename, category);
      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        };
      }

      // Create new version
      const newArtifact = await originalArtifact.createNewVersion(
        {
          originalName: file.originalname,
          filename,
          url: uploadResult.url!,
          size: file.size,
          mimeType: file.mimetype,
          extension: path.extname(file.originalname).toLowerCase(),
        },
        uploadedBy
      );

      logger.info(
        `New version created: ${filename} for artifact ${artifactId}`
      );
      return {
        success: true,
        artifact: newArtifact,
        fileInfo: uploadResult.fileInfo,
      };
    } catch (error) {
      logger.error('Version creation failed:', error);
      return {
        success: false,
        error: 'Version creation failed',
      };
    }
  }

  /**
   * Upload file to storage (S3 or local)
   */
  private async uploadToStorage(
    file: Express.Multer.File,
    filename: string,
    category: string
  ): Promise<{
    success: boolean;
    url?: string;
    fileInfo?: any;
    error?: string;
  }> {
    if (this.config.provider === 's3' && this.s3Client) {
      return this.uploadToS3(file, filename, category);
    } else if (this.config.provider === 'local' && this.localStorage) {
      return this.uploadToLocal(file, filename, category);
    } else {
      return {
        success: false,
        error: 'No storage provider configured',
      };
    }
  }

  /**
   * Upload file to S3
   */
  private async uploadToS3(
    file: Express.Multer.File,
    filename: string,
    category: string
  ): Promise<{
    success: boolean;
    url?: string;
    fileInfo?: any;
    error?: string;
  }> {
    try {
      const key = `${category}/${filename}`;
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.config.s3!.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      };

      await this.s3Client!.putObject(params).promise();

      const url = `https://${this.config.s3!.bucket}.s3.${this.config.s3!.region}.amazonaws.com/${key}`;

      return {
        success: true,
        url,
        fileInfo: {
          originalName: file.originalname,
          filename,
          url,
          size: file.size,
          mimeType: file.mimetype,
          extension: path.extname(file.originalname).toLowerCase(),
        },
      };
    } catch (error) {
      logger.error('S3 upload failed:', error);
      return {
        success: false,
        error: 'S3 upload failed',
      };
    }
  }

  /**
   * Upload file to local storage
   */
  private async uploadToLocal(
    file: Express.Multer.File,
    filename: string,
    category: string
  ): Promise<{
    success: boolean;
    url?: string;
    fileInfo?: any;
    error?: string;
  }> {
    try {
      const categoryDir = path.join(this.localStorage!.uploadDir, category);
      const filePath = path.join(categoryDir, filename);

      // Ensure category directory exists
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(filePath, file.buffer);

      const url = `${this.localStorage!.publicUrl}/${category}/${filename}`;

      return {
        success: true,
        url,
        fileInfo: {
          originalName: file.originalname,
          filename,
          url,
          size: file.size,
          mimeType: file.mimetype,
          extension: path.extname(file.originalname).toLowerCase(),
        },
      };
    } catch (error) {
      logger.error('Local upload failed:', error);
      return {
        success: false,
        error: 'Local upload failed',
      };
    }
  }

  /**
   * Download file from storage
   */
  private async downloadFromStorage(
    fileInfo: any
  ): Promise<{ success: boolean; stream?: Readable; error?: string }> {
    if (this.config.provider === 's3' && this.s3Client) {
      return this.downloadFromS3(fileInfo);
    } else if (this.config.provider === 'local' && this.localStorage) {
      return this.downloadFromLocal(fileInfo);
    } else {
      return {
        success: false,
        error: 'No storage provider configured',
      };
    }
  }

  /**
   * Download file from S3
   */
  private async downloadFromS3(
    fileInfo: any
  ): Promise<{ success: boolean; stream?: Readable; error?: string }> {
    try {
      const key = fileInfo.url.split('.com/')[1];
      const params: AWS.S3.GetObjectRequest = {
        Bucket: this.config.s3!.bucket,
        Key: key,
      };

      const result = await this.s3Client!.getObject(params).promise();
      const stream = new Readable();
      stream.push(result.Body);
      stream.push(null);

      return {
        success: true,
        stream,
      };
    } catch (error) {
      logger.error('S3 download failed:', error);
      return {
        success: false,
        error: 'S3 download failed',
      };
    }
  }

  /**
   * Download file from local storage
   */
  private async downloadFromLocal(
    fileInfo: any
  ): Promise<{ success: boolean; stream?: Readable; error?: string }> {
    try {
      const filePath = fileInfo.url.replace(
        this.localStorage!.publicUrl,
        this.localStorage!.uploadDir
      );

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'File not found',
        };
      }

      const stream = fs.createReadStream(filePath);
      return {
        success: true,
        stream,
      };
    } catch (error) {
      logger.error('Local download failed:', error);
      return {
        success: false,
        error: 'Local download failed',
      };
    }
  }

  /**
   * Delete file from storage
   */
  private async deleteFromStorage(
    fileInfo: any
  ): Promise<{ success: boolean; error?: string }> {
    if (this.config.provider === 's3' && this.s3Client) {
      return this.deleteFromS3(fileInfo);
    } else if (this.config.provider === 'local' && this.localStorage) {
      return this.deleteFromLocal(fileInfo);
    } else {
      return {
        success: false,
        error: 'No storage provider configured',
      };
    }
  }

  /**
   * Delete file from S3
   */
  private async deleteFromS3(
    fileInfo: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const key = fileInfo.url.split('.com/')[1];
      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: this.config.s3!.bucket,
        Key: key,
      };

      await this.s3Client!.deleteObject(params).promise();
      return { success: true };
    } catch (error) {
      logger.error('S3 deletion failed:', error);
      return {
        success: false,
        error: 'S3 deletion failed',
      };
    }
  }

  /**
   * Delete file from local storage
   */
  private async deleteFromLocal(
    fileInfo: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const filePath = fileInfo.url.replace(
        this.localStorage!.publicUrl,
        this.localStorage!.uploadDir
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return { success: true };
    } catch (error) {
      logger.error('Local deletion failed:', error);
      return {
        success: false,
        error: 'Local deletion failed',
      };
    }
  }
}
