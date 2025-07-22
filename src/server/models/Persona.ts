import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPersona extends Document {
  name: string;
  role: string;
  project: Types.ObjectId;
  background: string;
  personality: {
    traits: string[];
    communicationStyle: string;
    decisionMakingStyle: string;
    priorities: string[];
    goals: string[];
  };
  mood: {
    current: number; // -100 to 100 scale
    history: Array<{
      value: number;
      timestamp: Date;
      reason: string;
    }>;
  };
  aiConfiguration: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    contextWindow: number;
  };
  memory: {
    conversationHistory: Array<{
      conversationId: Types.ObjectId;
      lastInteraction: Date;
      keyPoints: string[];
    }>;
    projectKnowledge: string[];
    relationshipNotes: Map<string, string>;
  };
  availability: {
    isActive: boolean;
    responseTime: number; // in minutes
    workingHours: {
      start: string; // HH:MM format
      end: string; // HH:MM format
      timezone: string;
    };
  };
  stats: {
    totalConversations: number;
    totalMessages: number;
    averageResponseTime: number;
    lastInteraction: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  updateMood(value: number, reason: string): Promise<void>;
  addConversationToMemory(
    conversationId: Types.ObjectId,
    keyPoints: string[]
  ): Promise<void>;
  isAvailable(): boolean;
  getMoodDescription(): string;
  canInteractWithUser(userId: Types.ObjectId): Promise<boolean>;
}

const personaSchema = new Schema<IPersona>(
  {
    name: {
      type: String,
      required: [true, 'Persona name is required'],
      trim: true,
      minlength: [2, 'Persona name must be at least 2 characters long'],
      maxlength: [50, 'Persona name cannot exceed 50 characters'],
      match: [
        /^[a-zA-Z0-9\s\-_()]+$/,
        'Persona name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses',
      ],
    },
    role: {
      type: String,
      required: [true, 'Persona role is required'],
      trim: true,
      minlength: [3, 'Role must be at least 3 characters long'],
      maxlength: [100, 'Role cannot exceed 100 characters'],
      match: [
        /^[a-zA-Z0-9\s\-_()]+$/,
        'Role can only contain letters, numbers, spaces, hyphens, underscores, and parentheses',
      ],
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
      validate: {
        validator: async function (this: IPersona, projectId: Types.ObjectId) {
          const Project = mongoose.model('Project');
          const project = await Project.findById(projectId);
          return project && project.status === 'active';
        },
        message: 'Project must be a valid active project',
      },
    },
    background: {
      type: String,
      required: [true, 'Persona background is required'],
      trim: true,
      minlength: [50, 'Background must be at least 50 characters long'],
      maxlength: [2000, 'Background cannot exceed 2000 characters'],
    },
    personality: {
      traits: [
        {
          type: String,
          trim: true,
          minlength: [3, 'Trait must be at least 3 characters long'],
          maxlength: [50, 'Trait cannot exceed 50 characters'],
          validate: {
            validator: function (traits: string[]) {
              return traits.length >= 3 && traits.length <= 10;
            },
            message: 'Persona must have between 3 and 10 personality traits',
          },
        },
      ],
      communicationStyle: {
        type: String,
        required: [true, 'Communication style is required'],
        enum: {
          values: [
            'formal',
            'casual',
            'technical',
            'collaborative',
            'authoritative',
            'supportive',
          ],
          message: 'Communication style must be one of the allowed values',
        },
      },
      decisionMakingStyle: {
        type: String,
        required: [true, 'Decision making style is required'],
        enum: {
          values: [
            'analytical',
            'intuitive',
            'consensus-driven',
            'authoritative',
            'risk-averse',
            'risk-taking',
          ],
          message: 'Decision making style must be one of the allowed values',
        },
      },
      priorities: [
        {
          type: String,
          trim: true,
          minlength: [5, 'Priority must be at least 5 characters long'],
          maxlength: [100, 'Priority cannot exceed 100 characters'],
          validate: {
            validator: function (priorities: string[]) {
              return priorities.length >= 2 && priorities.length <= 8;
            },
            message: 'Persona must have between 2 and 8 priorities',
          },
        },
      ],
      goals: [
        {
          type: String,
          trim: true,
          minlength: [10, 'Goal must be at least 10 characters long'],
          maxlength: [200, 'Goal cannot exceed 200 characters'],
          validate: {
            validator: function (goals: string[]) {
              return goals.length >= 1 && goals.length <= 5;
            },
            message: 'Persona must have between 1 and 5 goals',
          },
        },
      ],
    },
    mood: {
      current: {
        type: Number,
        required: [true, 'Current mood is required'],
        default: 0,
        min: [-100, 'Mood cannot be below -100'],
        max: [100, 'Mood cannot exceed 100'],
      },
      history: [
        {
          value: {
            type: Number,
            required: [true, 'Mood value is required'],
            min: -100,
            max: 100,
          },
          timestamp: {
            type: Date,
            required: [true, 'Mood timestamp is required'],
            default: Date.now,
          },
          reason: {
            type: String,
            required: [true, 'Mood reason is required'],
            trim: true,
            minlength: [5, 'Mood reason must be at least 5 characters long'],
            maxlength: [200, 'Mood reason cannot exceed 200 characters'],
          },
        },
      ],
    },
    aiConfiguration: {
      model: {
        type: String,
        required: [true, 'AI model is required'],
        default: 'gpt-4',
        enum: {
          values: ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-2'],
          message: 'AI model must be one of the supported models',
        },
      },
      temperature: {
        type: Number,
        required: [true, 'Temperature is required'],
        default: 0.7,
        min: [0, 'Temperature cannot be below 0'],
        max: [2, 'Temperature cannot exceed 2'],
      },
      maxTokens: {
        type: Number,
        required: [true, 'Max tokens is required'],
        default: 2000,
        min: [100, 'Max tokens cannot be below 100'],
        max: [8000, 'Max tokens cannot exceed 8000'],
      },
      systemPrompt: {
        type: String,
        required: [true, 'System prompt is required'],
        minlength: [50, 'System prompt must be at least 50 characters long'],
        maxlength: [4000, 'System prompt cannot exceed 4000 characters'],
      },
      contextWindow: {
        type: Number,
        required: [true, 'Context window is required'],
        default: 10, // Number of recent conversations to include
        min: [1, 'Context window cannot be below 1'],
        max: [50, 'Context window cannot exceed 50'],
      },
    },
    memory: {
      conversationHistory: [
        {
          conversationId: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            required: [true, 'Conversation ID is required'],
          },
          lastInteraction: {
            type: Date,
            required: [true, 'Last interaction date is required'],
            default: Date.now,
          },
          keyPoints: [
            {
              type: String,
              trim: true,
              minlength: [5, 'Key point must be at least 5 characters long'],
              maxlength: [200, 'Key point cannot exceed 200 characters'],
            },
          ],
        },
      ],
      projectKnowledge: [
        {
          type: String,
          trim: true,
          minlength: [
            10,
            'Project knowledge item must be at least 10 characters long',
          ],
          maxlength: [
            500,
            'Project knowledge item cannot exceed 500 characters',
          ],
        },
      ],
      relationshipNotes: {
        type: Map,
        of: String,
        default: new Map(),
        validate: {
          validator: function (notes: Map<string, string>) {
            for (const [key, value] of notes.entries()) {
              if (value.length > 500) {
                return false;
              }
            }
            return true;
          },
          message: 'Relationship notes cannot exceed 500 characters each',
        },
      },
    },
    availability: {
      isActive: {
        type: Boolean,
        default: true,
      },
      responseTime: {
        type: Number,
        default: 5, // minutes
        min: [1, 'Response time cannot be below 1 minute'],
        max: [1440, 'Response time cannot exceed 24 hours'],
      },
      workingHours: {
        start: {
          type: String,
          required: [true, 'Working hours start time is required'],
          default: '09:00',
          match: [
            /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
            'Invalid time format. Use HH:MM',
          ],
        },
        end: {
          type: String,
          required: [true, 'Working hours end time is required'],
          default: '17:00',
          match: [
            /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
            'Invalid time format. Use HH:MM',
          ],
        },
        timezone: {
          type: String,
          required: [true, 'Timezone is required'],
          default: 'UTC',
          match: [/^[A-Za-z_]+(\/[A-Za-z_]+)*$/, 'Invalid timezone format'],
        },
      },
    },
    stats: {
      totalConversations: {
        type: Number,
        default: 0,
        min: [0, 'Total conversations cannot be negative'],
      },
      totalMessages: {
        type: Number,
        default: 0,
        min: [0, 'Total messages cannot be negative'],
      },
      averageResponseTime: {
        type: Number,
        default: 0,
        min: [0, 'Average response time cannot be negative'],
      },
      lastInteraction: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
personaSchema.index({ project: 1 });
personaSchema.index({ 'mood.current': 1 });
personaSchema.index({ 'availability.isActive': 1 });
personaSchema.index({ role: 1 });
personaSchema.index({ 'stats.lastInteraction': -1 });
personaSchema.index({ createdAt: -1 });

// Compound indexes for common queries
personaSchema.index({ project: 1, 'availability.isActive': 1 });
personaSchema.index({ project: 1, role: 1 });

// Pre-save middleware to validate working hours
personaSchema.pre('save', function (next) {
  const start = this.availability.workingHours.start;
  const end = this.availability.workingHours.end;

  const startMinutes =
    parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
  const endMinutes =
    parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);

  if (startMinutes >= endMinutes) {
    return next(new Error('Working hours end time must be after start time'));
  }

  next();
});

// Pre-save middleware to validate personality traits
personaSchema.pre('save', function (next) {
  if (this.personality.traits.length < 3) {
    return next(new Error('Persona must have at least 3 personality traits'));
  }

  if (this.personality.priorities.length < 2) {
    return next(new Error('Persona must have at least 2 priorities'));
  }

  if (this.personality.goals.length < 1) {
    return next(new Error('Persona must have at least 1 goal'));
  }

  next();
});

// Instance method to update mood
personaSchema.methods.updateMood = async function (
  value: number,
  reason: string
): Promise<void> {
  this.mood.current = Math.max(-100, Math.min(100, value));
  this.mood.history.push({
    value: this.mood.current,
    timestamp: new Date(),
    reason,
  });

  // Keep only last 50 mood entries
  if (this.mood.history.length > 50) {
    this.mood.history = this.mood.history.slice(-50);
  }

  await this.save();
};

// Instance method to add conversation to memory
personaSchema.methods.addConversationToMemory = async function (
  conversationId: Types.ObjectId,
  keyPoints: string[]
): Promise<void> {
  const existingIndex = this.memory.conversationHistory.findIndex(
    (conv: any) => conv.conversationId.toString() === conversationId.toString()
  );

  if (existingIndex >= 0) {
    // Update existing conversation
    this.memory.conversationHistory[existingIndex].lastInteraction = new Date();
    this.memory.conversationHistory[existingIndex].keyPoints = keyPoints;
  } else {
    // Add new conversation
    this.memory.conversationHistory.push({
      conversationId,
      lastInteraction: new Date(),
      keyPoints,
    });
  }

  // Keep only recent conversations based on context window
  if (
    this.memory.conversationHistory.length > this.aiConfiguration.contextWindow
  ) {
    this.memory.conversationHistory = this.memory.conversationHistory.slice(
      -this.aiConfiguration.contextWindow
    );
  }

  await this.save();
};

// Instance method to check if persona is available
personaSchema.methods.isAvailable = function (): boolean {
  if (!this.availability.isActive) {
    return false;
  }

  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', {
    hour12: false,
    timeZone: this.availability.workingHours.timezone,
  });

  return (
    currentTime >= this.availability.workingHours.start &&
    currentTime <= this.availability.workingHours.end
  );
};

// Instance method to get mood description
personaSchema.methods.getMoodDescription = function (): string {
  const mood = this.mood.current;
  if (mood >= 80) return 'Very Positive';
  if (mood >= 60) return 'Positive';
  if (mood >= 40) return 'Neutral';
  if (mood >= 20) return 'Slightly Negative';
  if (mood >= 0) return 'Negative';
  return 'Very Negative';
};

// Instance method to check if persona can interact with user
personaSchema.methods.canInteractWithUser = async function (
  userId: Types.ObjectId
): Promise<boolean> {
  const Project = mongoose.model('Project');
  const project = await Project.findById(this.project);

  if (!project) {
    return false;
  }

  return (
    project.canUserAccess(userId, 'student') ||
    project.canUserAccess(userId, 'instructor')
  );
};

// Virtual for mood description
personaSchema.virtual('moodDescription').get(function () {
  return this.getMoodDescription();
});

// Virtual for availability status
personaSchema.virtual('availabilityStatus').get(function () {
  if (!this.availability.isActive) return 'Inactive';
  if (this.isAvailable()) return 'Available';
  return 'Outside Working Hours';
});

// Virtual for response time description
personaSchema.virtual('responseTimeDescription').get(function () {
  const time = this.availability.responseTime;
  if (time < 60) return `${time} minutes`;
  const hours = Math.floor(time / 60);
  const minutes = time % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
});

// Ensure virtual fields are serialized
personaSchema.set('toJSON', { virtuals: true });

export const Persona = mongoose.model<IPersona>('Persona', personaSchema);
