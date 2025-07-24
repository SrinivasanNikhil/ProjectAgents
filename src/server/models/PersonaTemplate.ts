import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPersonaTemplate extends Document {
  name: string;
  description: string;
  category: string;
  createdBy: Types.ObjectId;
  isPublic: boolean;
  tags: string[];
  template: {
    role: string;
    background: string;
    personality: {
      traits: string[];
      communicationStyle: string;
      decisionMakingStyle: string;
      priorities: string[];
      goals: string[];
    };
    aiConfiguration: {
      model: string;
      temperature: number;
      maxTokens: number;
      systemPrompt: string;
      contextWindow: number;
    };
    availability: {
      responseTime: number;
      workingHours: {
        start: string;
        end: string;
        timezone: string;
      };
    };
  };
  usage: {
    totalUses: number;
    lastUsed: Date;
    projects: Types.ObjectId[];
  };
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  incrementUsage(projectId: Types.ObjectId): Promise<void>;
  clone(): Promise<IPersonaTemplate>;
}

const personaTemplateSchema = new Schema<IPersonaTemplate>(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      minlength: [3, 'Template name must be at least 3 characters long'],
      maxlength: [100, 'Template name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Template description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    category: {
      type: String,
      required: [true, 'Template category is required'],
      enum: {
        values: [
          'client',
          'stakeholder',
          'user',
          'manager',
          'developer',
          'designer',
          'tester',
          'business-analyst',
          'product-owner',
          'scrum-master',
          'other',
        ],
        message: 'Category must be one of the allowed values',
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    isPublic: {
      type: Boolean,
      default: false,
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
    template: {
      role: {
        type: String,
        required: [true, 'Role is required'],
        trim: true,
        minlength: [3, 'Role must be at least 3 characters long'],
        maxlength: [100, 'Role cannot exceed 100 characters'],
      },
      background: {
        type: String,
        required: [true, 'Background is required'],
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
              message: 'Template must have between 3 and 10 personality traits',
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
              message: 'Template must have between 2 and 8 priorities',
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
              message: 'Template must have between 1 and 5 goals',
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
          default: 10,
          min: [1, 'Context window cannot be below 1'],
          max: [50, 'Context window cannot exceed 50'],
        },
      },
      availability: {
        responseTime: {
          type: Number,
          default: 5,
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
    },
    usage: {
      totalUses: {
        type: Number,
        default: 0,
        min: [0, 'Total uses cannot be negative'],
      },
      lastUsed: {
        type: Date,
        default: Date.now,
      },
      projects: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Project',
        },
      ],
    },
    version: {
      type: Number,
      default: 1,
      min: [1, 'Version must be at least 1'],
    },
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
personaTemplateSchema.index({ category: 1 });
personaTemplateSchema.index({ createdBy: 1 });
personaTemplateSchema.index({ isPublic: 1 });
personaTemplateSchema.index({ isActive: 1 });
personaTemplateSchema.index({ tags: 1 });
personaTemplateSchema.index({ 'usage.totalUses': -1 });
personaTemplateSchema.index({ createdAt: -1 });

// Compound indexes for common queries
personaTemplateSchema.index({ isPublic: 1, isActive: 1 });
personaTemplateSchema.index({ category: 1, isPublic: 1 });
personaTemplateSchema.index({ createdBy: 1, isActive: 1 });

// Pre-save middleware to validate working hours
personaTemplateSchema.pre('save', function (next) {
  const start = this.template.availability.workingHours.start;
  const end = this.template.availability.workingHours.end;

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
personaTemplateSchema.pre('save', function (next) {
  if (this.template.personality.traits.length < 3) {
    return next(new Error('Template must have at least 3 personality traits'));
  }

  if (this.template.personality.priorities.length < 2) {
    return next(new Error('Template must have at least 2 priorities'));
  }

  if (this.template.personality.goals.length < 1) {
    return next(new Error('Template must have at least 1 goal'));
  }

  next();
});

// Instance method to increment usage
personaTemplateSchema.methods.incrementUsage = async function (
  projectId: Types.ObjectId
): Promise<void> {
  this.usage.totalUses += 1;
  this.usage.lastUsed = new Date();

  if (!this.usage.projects.includes(projectId)) {
    this.usage.projects.push(projectId);
  }

  await this.save();
};

// Instance method to clone template
personaTemplateSchema.methods.clone =
  async function (): Promise<IPersonaTemplate> {
    const PersonaTemplate = mongoose.model('PersonaTemplate');

    const clonedTemplate = new PersonaTemplate({
      name: `${this.name} (Copy)`,
      description: this.description,
      category: this.category,
      createdBy: this.createdBy,
      isPublic: false,
      tags: [...this.tags],
      template: { ...this.template },
      version: 1,
      isActive: true,
    });

    return await clonedTemplate.save();
  };

// Virtual for usage description
personaTemplateSchema.virtual('usageDescription').get(function () {
  if (this.usage.totalUses === 0) return 'Never used';
  if (this.usage.totalUses === 1) return 'Used once';
  return `Used ${this.usage.totalUses} times`;
});

// Virtual for last used description
personaTemplateSchema.virtual('lastUsedDescription').get(function () {
  if (!this.usage.lastUsed) return 'Never used';

  const now = new Date();
  const diff = now.getTime() - this.usage.lastUsed.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
});

// Ensure virtual fields are serialized
personaTemplateSchema.set('toJSON', { virtuals: true });

export const PersonaTemplate = mongoose.model<IPersonaTemplate>(
  'PersonaTemplate',
  personaTemplateSchema
);
