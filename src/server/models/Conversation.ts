import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage extends Document {
  conversation: Types.ObjectId;
  sender: {
    type: 'student' | 'persona';
    id: Types.ObjectId;
    name: string;
  };
  content: string;
  messageType: 'text' | 'file' | 'link' | 'milestone' | 'system';
  attachments?: Array<{
    type: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }>;
  links?: Array<{
    url: string;
    title: string;
    description?: string;
  }>;
  metadata?: {
    milestoneId?: Types.ObjectId;
    artifactId?: Types.ObjectId;
    aiResponseTime?: number;
    sentiment?: number;
  };
  isRead: boolean;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversation extends Document {
  project: Types.ObjectId;
  participants: Array<{
    type: 'student' | 'persona';
    id: Types.ObjectId;
    name: string;
  }>;
  title: string;
  conversationType: 'chat' | 'milestone-meeting' | 'group-discussion';
  status: 'active' | 'archived' | 'closed';
  lastMessage?: {
    content: string;
    sender: string;
    timestamp: Date;
  };
  messageCount: number;
  unreadCount: Map<string, number>; // userId -> count
  settings: {
    allowFileUploads: boolean;
    allowExternalLinks: boolean;
    requireModeration: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: {
        type: String,
        enum: ['student', 'persona'],
        required: true,
      },
      id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Sender name cannot exceed 100 characters'],
      },
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [5000, 'Message content cannot exceed 5000 characters'],
    },
    messageType: {
      type: String,
      enum: ['text', 'file', 'link', 'milestone', 'system'],
      default: 'text',
    },
    attachments: [
      {
        type: {
          type: String,
          required: true,
          trim: true,
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
      },
    ],
    links: [
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
    metadata: {
      milestoneId: {
        type: Schema.Types.ObjectId,
        ref: 'Milestone',
      },
      artifactId: {
        type: Schema.Types.ObjectId,
        ref: 'Artifact',
      },
      aiResponseTime: {
        type: Number,
        min: [0, 'Response time cannot be negative'],
      },
      sentiment: {
        type: Number,
        min: [-1, 'Sentiment cannot be below -1'],
        max: [1, 'Sentiment cannot exceed 1'],
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const conversationSchema = new Schema<IConversation>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    participants: [
      {
        type: {
          type: String,
          enum: ['student', 'persona'],
          required: true,
        },
        id: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, 'Participant name cannot exceed 100 characters'],
        },
      },
    ],
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Conversation title cannot exceed 200 characters'],
    },
    conversationType: {
      type: String,
      enum: ['chat', 'milestone-meeting', 'group-discussion'],
      default: 'chat',
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'closed'],
      default: 'active',
    },
    lastMessage: {
      content: {
        type: String,
        trim: true,
        maxlength: [500, 'Last message content cannot exceed 500 characters'],
      },
      sender: {
        type: String,
        trim: true,
        maxlength: [100, 'Last message sender cannot exceed 100 characters'],
      },
      timestamp: {
        type: Date,
      },
    },
    messageCount: {
      type: Number,
      default: 0,
      min: [0, 'Message count cannot be negative'],
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    settings: {
      allowFileUploads: {
        type: Boolean,
        default: true,
      },
      allowExternalLinks: {
        type: Boolean,
        default: true,
      },
      requireModeration: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ 'sender.id': 1 });
messageSchema.index({ messageType: 1 });

conversationSchema.index({ project: 1 });
conversationSchema.index({ 'participants.id': 1 });
conversationSchema.index({ status: 1 });
conversationSchema.index({ conversationType: 1 });
conversationSchema.index({ updatedAt: -1 });

// Method to mark message as read
messageSchema.methods.markAsRead = function (userId: Types.ObjectId) {
  if (!this.readBy.includes(userId)) {
    this.readBy.push(userId);
  }
  this.isRead = true;
  return this.save();
};

// Method to update conversation last message
conversationSchema.methods.updateLastMessage = function (
  content: string,
  sender: string
) {
  this.lastMessage = {
    content: content.length > 500 ? content.substring(0, 497) + '...' : content,
    sender,
    timestamp: new Date(),
  };
  this.messageCount += 1;
  this.updatedAt = new Date();
  return this.save();
};

// Method to increment unread count for participants
conversationSchema.methods.incrementUnreadCount = function (
  excludeUserId?: Types.ObjectId
) {
  this.participants.forEach((participant: any) => {
    if (
      participant.type === 'student' &&
      (!excludeUserId || participant.id.toString() !== excludeUserId.toString())
    ) {
      const currentCount = this.unreadCount.get(participant.id.toString()) || 0;
      this.unreadCount.set(participant.id.toString(), currentCount + 1);
    }
  });
  return this.save();
};

// Virtual for conversation duration
conversationSchema.virtual('duration').get(function () {
  const start = this.createdAt;
  const end = this.lastMessage?.timestamp || this.updatedAt;
  if (!start || !end) return null;

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffMinutes = Math.ceil(diffTime / (1000 * 60));
  return diffMinutes;
});

// Ensure virtual fields are serialized
conversationSchema.set('toJSON', { virtuals: true });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
export const Conversation = mongoose.model<IConversation>(
  'Conversation',
  conversationSchema
);
