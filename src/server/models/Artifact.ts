import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IArtifact extends Document {
  project: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  name: string;
  description?: string;
  type:
    | 'document'
    | 'image'
    | 'video'
    | 'code'
    | 'presentation'
    | 'mockup'
    | 'other';
  category:
    | 'requirement'
    | 'design'
    | 'implementation'
    | 'testing'
    | 'documentation'
    | 'presentation'
    | 'other';
  fileInfo: {
    originalName: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
    extension: string;
  };
  metadata: {
    version: number;
    isLatest: boolean;
    parentVersion?: Types.ObjectId;
    tags: string[];
    externalLinks?: Array<{
      url: string;
      title: string;
      description?: string;
    }>;
  };
  permissions: {
    owner: Types.ObjectId;
    sharedWith: Types.ObjectId[];
    isPublic: boolean;
    allowDownload: boolean;
    allowEdit: boolean;
  };
  usage: {
    downloadCount: number;
    viewCount: number;
    lastAccessed?: Date;
    lastModified: Date;
  };
  status: 'active' | 'archived' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  incrementViewCount(): Promise<IArtifact>;
  incrementDownloadCount(): Promise<IArtifact>;
  createNewVersion(
    newFileInfo: any,
    uploadedBy: Types.ObjectId
  ): Promise<IArtifact>;
  hasAccess(userId: Types.ObjectId): boolean;
  canEdit(userId: Types.ObjectId): boolean;
  // Virtual properties
  fileSizeFormatted: string;
  fileTypeIcon: string;
}

const artifactSchema = new Schema<IArtifact>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [255, 'Artifact name cannot exceed 255 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: [
        'document',
        'image',
        'video',
        'code',
        'presentation',
        'mockup',
        'other',
      ],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'requirement',
        'design',
        'implementation',
        'testing',
        'documentation',
        'presentation',
        'other',
      ],
      required: true,
    },
    fileInfo: {
      originalName: {
        type: String,
        required: true,
        trim: true,
        maxlength: [255, 'Original filename cannot exceed 255 characters'],
      },
      filename: {
        type: String,
        required: true,
        trim: true,
        maxlength: [255, 'Filename cannot exceed 255 characters'],
      },
      url: {
        type: String,
        required: true,
        trim: true,
      },
      size: {
        type: Number,
        required: true,
        min: [0, 'File size cannot be negative'],
      },
      mimeType: {
        type: String,
        required: true,
        trim: true,
      },
      extension: {
        type: String,
        required: true,
        trim: true,
        maxlength: [10, 'File extension cannot exceed 10 characters'],
      },
    },
    metadata: {
      version: {
        type: Number,
        required: true,
        default: 1,
        min: [1, 'Version must be at least 1'],
      },
      isLatest: {
        type: Boolean,
        default: true,
      },
      parentVersion: {
        type: Schema.Types.ObjectId,
        ref: 'Artifact',
      },
      tags: [
        {
          type: String,
          trim: true,
          maxlength: [50, 'Tag cannot exceed 50 characters'],
        },
      ],
      externalLinks: [
        {
          url: {
            type: String,
            required: true,
            trim: true,
            match: [/^https?:\/\/.+/, 'Invalid URL format'],
          },
          title: {
            type: String,
            required: true,
            trim: true,
            maxlength: [200, 'Link title cannot exceed 200 characters'],
          },
          description: {
            type: String,
            trim: true,
            maxlength: [500, 'Link description cannot exceed 500 characters'],
          },
        },
      ],
    },
    permissions: {
      owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      sharedWith: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      isPublic: {
        type: Boolean,
        default: false,
      },
      allowDownload: {
        type: Boolean,
        default: true,
      },
      allowEdit: {
        type: Boolean,
        default: false,
      },
    },
    usage: {
      downloadCount: {
        type: Number,
        default: 0,
        min: [0, 'Download count cannot be negative'],
      },
      viewCount: {
        type: Number,
        default: 0,
        min: [0, 'View count cannot be negative'],
      },
      lastAccessed: {
        type: Date,
      },
      lastModified: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
artifactSchema.index({ project: 1 });
artifactSchema.index({ uploadedBy: 1 });
artifactSchema.index({ type: 1 });
artifactSchema.index({ category: 1 });
artifactSchema.index({ status: 1 });
artifactSchema.index({ 'metadata.tags': 1 });
artifactSchema.index({ 'permissions.owner': 1 });
artifactSchema.index({ 'permissions.sharedWith': 1 });
artifactSchema.index({ createdAt: -1 });

// Method to increment view count
artifactSchema.methods.incrementViewCount = function () {
  this.usage.viewCount += 1;
  this.usage.lastAccessed = new Date();
  return this.save();
};

// Method to increment download count
artifactSchema.methods.incrementDownloadCount = function () {
  this.usage.downloadCount += 1;
  this.usage.lastAccessed = new Date();
  return this.save();
};

// Method to create new version
artifactSchema.methods.createNewVersion = function (
  newFileInfo: any,
  uploadedBy: Types.ObjectId
) {
  // Mark current version as not latest
  this.metadata.isLatest = false;
  this.save();

  // Create new artifact with incremented version
  const newArtifact = new Artifact({
    project: this.project,
    uploadedBy,
    name: this.name,
    description: this.description,
    type: this.type,
    category: this.category,
    fileInfo: newFileInfo,
    metadata: {
      version: this.metadata.version + 1,
      isLatest: true,
      parentVersion: this._id,
      tags: this.metadata.tags,
      externalLinks: this.metadata.externalLinks,
    },
    permissions: this.permissions,
    usage: {
      downloadCount: 0,
      viewCount: 0,
      lastModified: new Date(),
    },
  });

  return newArtifact.save();
};

// Method to check if user has access
artifactSchema.methods.hasAccess = function (userId: Types.ObjectId) {
  return (
    this.permissions.owner.toString() === userId.toString() ||
    this.permissions.isPublic ||
    this.permissions.sharedWith.some(
      (id: Types.ObjectId) => id.toString() === userId.toString()
    )
  );
};

// Method to check if user can edit
artifactSchema.methods.canEdit = function (userId: Types.ObjectId) {
  return (
    this.permissions.owner.toString() === userId.toString() ||
    (this.permissions.allowEdit && this.hasAccess(userId))
  );
};

// Virtual for file size in human readable format
artifactSchema.virtual('fileSizeFormatted').get(function () {
  const bytes = this.fileInfo.size;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for file type icon
artifactSchema.virtual('fileTypeIcon').get(function () {
  const typeMap: { [key: string]: string } = {
    document: '📄',
    image: '🖼️',
    video: '🎥',
    code: '💻',
    presentation: '📊',
    mockup: '🎨',
    other: '📎',
  };
  return typeMap[this.type] || '📎';
});

// Ensure virtual fields are serialized
artifactSchema.set('toJSON', { virtuals: true });

export const Artifact = mongoose.model<IArtifact>('Artifact', artifactSchema);
