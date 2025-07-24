import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPersonaMood extends Document {
  persona: Types.ObjectId;
  value: number; // -100 to 100 scale
  reason: string;
  trigger: {
    type:
      | 'conversation'
      | 'milestone'
      | 'feedback'
      | 'time'
      | 'manual'
      | 'system';
    source?: string;
    details?: string;
  };
  context: {
    conversationId?: Types.ObjectId;
    userId?: Types.ObjectId;
    projectId?: Types.ObjectId;
    milestoneId?: Types.ObjectId;
  };
  duration: {
    expected: number; // in minutes
    actual?: number; // in minutes
  };
  intensity: 'low' | 'medium' | 'high' | string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  calculateIntensity(): string;
  getMoodDescription(): string;
  isExpired(): boolean;
}

const personaMoodSchema = new Schema<IPersonaMood>(
  {
    persona: {
      type: Schema.Types.ObjectId,
      ref: 'Persona',
      required: [true, 'Persona is required'],
    },
    value: {
      type: Number,
      required: [true, 'Mood value is required'],
      min: [-100, 'Mood value cannot be below -100'],
      max: [100, 'Mood value cannot exceed 100'],
    },
    reason: {
      type: String,
      required: [true, 'Mood reason is required'],
      trim: true,
      minlength: [5, 'Reason must be at least 5 characters long'],
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    trigger: {
      type: {
        type: String,
        required: [true, 'Trigger type is required'],
        enum: {
          values: [
            'conversation',
            'milestone',
            'feedback',
            'time',
            'manual',
            'system',
          ],
          message: 'Trigger type must be one of the allowed values',
        },
      },
      source: {
        type: String,
        trim: true,
        maxlength: [100, 'Source cannot exceed 100 characters'],
      },
      details: {
        type: String,
        trim: true,
        maxlength: [1000, 'Details cannot exceed 1000 characters'],
      },
    },
    context: {
      conversationId: {
        type: Schema.Types.ObjectId,
        ref: 'Conversation',
      },
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
      },
      milestoneId: {
        type: Schema.Types.ObjectId,
        ref: 'Milestone',
      },
    },
    duration: {
      expected: {
        type: Number,
        required: [true, 'Expected duration is required'],
        min: [1, 'Expected duration must be at least 1 minute'],
        max: [10080, 'Expected duration cannot exceed 1 week'],
        default: 60, // 1 hour default
      },
      actual: {
        type: Number,
        min: [0, 'Actual duration cannot be negative'],
        max: [10080, 'Actual duration cannot exceed 1 week'],
      },
    },
    intensity: {
      type: String,
      required: [true, 'Intensity is required'],
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Intensity must be one of the allowed values',
      },
      default: 'medium',
    },
    tags: [
      {
        type: String,
        trim: true,
        minlength: [2, 'Tag must be at least 2 characters long'],
        maxlength: [20, 'Tag cannot exceed 20 characters'],
        validate: {
          validator: function (tags: string[]) {
            return tags.length <= 10;
          },
          message: 'Cannot have more than 10 tags',
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
personaMoodSchema.index({ persona: 1 });
personaMoodSchema.index({ 'trigger.type': 1 });
personaMoodSchema.index({ intensity: 1 });
personaMoodSchema.index({ isActive: 1 });
personaMoodSchema.index({ createdAt: -1 });
personaMoodSchema.index({ tags: 1 });

// Compound indexes for common queries
personaMoodSchema.index({ persona: 1, isActive: 1 });
personaMoodSchema.index({ persona: 1, createdAt: -1 });
personaMoodSchema.index({ 'context.conversationId': 1, isActive: 1 });
personaMoodSchema.index({ 'context.projectId': 1, isActive: 1 });

// Pre-save middleware to calculate intensity
personaMoodSchema.pre('save', function (next) {
  if (!this.intensity) {
    this.intensity = this.calculateIntensity();
  }
  next();
});

// Instance method to calculate intensity based on mood value
personaMoodSchema.methods.calculateIntensity = function ():
  | 'low'
  | 'medium'
  | 'high' {
  const absValue = Math.abs(this.value);

  if (absValue <= 20) return 'low';
  if (absValue <= 60) return 'medium';
  return 'high';
};

// Instance method to get mood description
personaMoodSchema.methods.getMoodDescription = function (): string {
  const mood = this.value;
  if (mood >= 80) return 'Very Positive';
  if (mood >= 60) return 'Positive';
  if (mood >= 40) return 'Neutral';
  if (mood >= 20) return 'Slightly Negative';
  if (mood >= 0) return 'Negative';
  return 'Very Negative';
};

// Instance method to check if mood is expired
personaMoodSchema.methods.isExpired = function (): boolean {
  const now = new Date();
  const created = this.createdAt;
  const expectedDurationMs = this.duration.expected * 60 * 1000; // Convert minutes to milliseconds

  return now.getTime() - created.getTime() > expectedDurationMs;
};

// Virtual for mood description
personaMoodSchema.virtual('moodDescription').get(function () {
  return this.getMoodDescription();
});

// Virtual for duration description
personaMoodSchema.virtual('durationDescription').get(function () {
  const minutes = this.duration.expected;
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours}h ${remainingMinutes}m`;
});

// Virtual for age description
personaMoodSchema.virtual('ageDescription').get(function () {
  const now = new Date();
  const diff = now.getTime() - this.createdAt.getTime();
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
});

// Virtual for status
personaMoodSchema.virtual('status').get(function () {
  if (!this.isActive) return 'Inactive';
  if (this.isExpired()) return 'Expired';
  return 'Active';
});

// Ensure virtual fields are serialized
personaMoodSchema.set('toJSON', { virtuals: true });

export const PersonaMood = mongoose.model<IPersonaMood>(
  'PersonaMood',
  personaMoodSchema
);
