import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description: string;
  projectType: string;
  industry: string;
  scope: string;
  timeline: {
    startDate: Date;
    endDate: Date;
  };
  instructor: Types.ObjectId;
  students: Types.ObjectId[];
  status: 'active' | 'completed' | 'archived';
  settings: {
    allowMidProjectChanges: boolean;
    enableConflicts: boolean;
    requireMilestoneSignOff: boolean;
  };
  metadata: {
    totalPersonas: number;
    totalConversations: number;
    totalMilestones: number;
    totalArtifacts: number;
    lastActivity: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  isOverdue(): boolean;
  getProgress(): number;
  canUserAccess(userId: Types.ObjectId, userRole: string): boolean;
  addStudent(studentId: Types.ObjectId): Promise<void>;
  removeStudent(studentId: Types.ObjectId): Promise<void>;
  updateStatus(newStatus: 'active' | 'completed' | 'archived'): Promise<void>;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [3, 'Project name must be at least 3 characters long'],
      maxlength: [100, 'Project name cannot exceed 100 characters'],
      match: [
        /^[a-zA-Z0-9\s\-_()]+$/,
        'Project name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses',
      ],
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
      minlength: [
        10,
        'Project description must be at least 10 characters long',
      ],
      maxlength: [2000, 'Project description cannot exceed 2000 characters'],
    },
    projectType: {
      type: String,
      required: [true, 'Project type is required'],
      trim: true,
      enum: {
        values: [
          'web-application',
          'mobile-app',
          'desktop-app',
          'api',
          'database',
          'ai-ml',
          'game',
          'other',
        ],
        message: 'Project type must be one of the allowed values',
      },
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
      minlength: [2, 'Industry must be at least 2 characters long'],
      maxlength: [100, 'Industry cannot exceed 100 characters'],
      match: [
        /^[a-zA-Z0-9\s\-&]+$/,
        'Industry can only contain letters, numbers, spaces, hyphens, and ampersands',
      ],
    },
    scope: {
      type: String,
      required: [true, 'Project scope is required'],
      trim: true,
      enum: {
        values: ['small', 'medium', 'large'],
        message: 'Scope must be small, medium, or large',
      },
    },
    timeline: {
      startDate: {
        type: Date,
        required: [true, 'Start date is required'],
        validate: {
          validator: function (this: IProject, date: Date) {
            return date >= new Date(new Date().setHours(0, 0, 0, 0));
          },
          message: 'Start date cannot be in the past',
        },
      },
      endDate: {
        type: Date,
        required: [true, 'End date is required'],
        validate: {
          validator: function (this: IProject, date: Date) {
            if (!this.timeline?.startDate) return true;
            const minDuration = 7; // Minimum 7 days
            const maxDuration = 365; // Maximum 1 year
            const durationDays = Math.ceil(
              (date.getTime() - this.timeline.startDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return durationDays >= minDuration && durationDays <= maxDuration;
          },
          message: 'Project duration must be between 7 days and 1 year',
        },
      },
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor is required'],
      validate: {
        validator: async function (
          this: IProject,
          instructorId: Types.ObjectId
        ) {
          const User = mongoose.model('User');
          const instructor = await User.findById(instructorId);
          return instructor && instructor.role === 'instructor';
        },
        message: 'Instructor must be a valid user with instructor role',
      },
    },
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student is required'],
        validate: {
          validator: async function (
            this: IProject,
            studentId: Types.ObjectId
          ) {
            const User = mongoose.model('User');
            const student = await User.findById(studentId);
            return student && student.role === 'student';
          },
          message: 'Student must be a valid user with student role',
        },
      },
    ],
    status: {
      type: String,
      enum: {
        values: ['active', 'completed', 'archived'],
        message: 'Status must be active, completed, or archived',
      },
      default: 'active',
    },
    settings: {
      allowMidProjectChanges: {
        type: Boolean,
        default: true,
      },
      enableConflicts: {
        type: Boolean,
        default: true,
      },
      requireMilestoneSignOff: {
        type: Boolean,
        default: true,
      },
    },
    metadata: {
      totalPersonas: {
        type: Number,
        default: 0,
        min: [0, 'Total personas cannot be negative'],
      },
      totalConversations: {
        type: Number,
        default: 0,
        min: [0, 'Total conversations cannot be negative'],
      },
      totalMilestones: {
        type: Number,
        default: 0,
        min: [0, 'Total milestones cannot be negative'],
      },
      totalArtifacts: {
        type: Number,
        default: 0,
        min: [0, 'Total artifacts cannot be negative'],
      },
      lastActivity: {
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
projectSchema.index({ instructor: 1 });
projectSchema.index({ students: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ projectType: 1 });
projectSchema.index({ industry: 1 });
projectSchema.index({ 'timeline.startDate': 1 });
projectSchema.index({ 'timeline.endDate': 1 });
projectSchema.index({ 'metadata.lastActivity': -1 });
projectSchema.index({ createdAt: -1 });

// Compound indexes for common queries
projectSchema.index({ instructor: 1, status: 1 });
projectSchema.index({ students: 1, status: 1 });
projectSchema.index({ 'timeline.endDate': 1, status: 1 });

// Pre-save middleware to validate student count
projectSchema.pre('save', function (next) {
  if (this.students.length < 1) {
    return next(new Error('Project must have at least one student'));
  }
  if (this.students.length > 10) {
    return next(new Error('Project cannot have more than 10 students'));
  }
  next();
});

// Pre-save middleware to validate timeline
projectSchema.pre('save', function (next) {
  if (this.timeline.endDate <= this.timeline.startDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

// Instance method to check if project is overdue
projectSchema.methods.isOverdue = function (): boolean {
  return this.timeline.endDate < new Date() && this.status !== 'completed';
};

// Instance method to get project progress
projectSchema.methods.getProgress = function (): number {
  const now = new Date();
  const start = this.timeline.startDate;
  const end = this.timeline.endDate;

  if (now <= start) return 0;
  if (now >= end) return 100;

  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();

  return Math.round((elapsed / totalDuration) * 100);
};

// Instance method to check if user can access project
projectSchema.methods.canUserAccess = function (
  userId: Types.ObjectId,
  userRole: string
): boolean {
  if (userRole === 'administrator') {
    return true;
  }

  if (userRole === 'instructor') {
    return this.instructor.toString() === userId.toString();
  }

  if (userRole === 'student') {
    return this.students.some(
      (studentId: Types.ObjectId) => studentId.toString() === userId.toString()
    );
  }

  return false;
};

// Instance method to add student to project
projectSchema.methods.addStudent = async function (
  studentId: Types.ObjectId
): Promise<void> {
  if (this.students.length >= 10) {
    throw new Error('Project cannot have more than 10 students');
  }

  if (
    this.students.some(
      (id: Types.ObjectId) => id.toString() === studentId.toString()
    )
  ) {
    throw new Error('Student is already in this project');
  }

  this.students.push(studentId);
  await this.save();
};

// Instance method to remove student from project
projectSchema.methods.removeStudent = async function (
  studentId: Types.ObjectId
): Promise<void> {
  const index = this.students.findIndex(
    (id: Types.ObjectId) => id.toString() === studentId.toString()
  );

  if (index === -1) {
    throw new Error('Student is not in this project');
  }

  if (this.students.length === 1) {
    throw new Error('Cannot remove the last student from project');
  }

  this.students.splice(index, 1);
  await this.save();
};

// Instance method to update project status
projectSchema.methods.updateStatus = async function (
  newStatus: 'active' | 'completed' | 'archived'
): Promise<void> {
  if (newStatus === 'completed' && this.status !== 'completed') {
    // Update metadata when completing project
    this.metadata.lastActivity = new Date();
  }

  this.status = newStatus;
  await this.save();
};

// Virtual for project duration in days
projectSchema.virtual('durationDays').get(function () {
  const start = this.timeline.startDate;
  const end = this.timeline.endDate;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for days remaining
projectSchema.virtual('daysRemaining').get(function () {
  const now = new Date();
  const end = this.timeline.endDate;
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for project status description
projectSchema.virtual('statusDescription').get(function () {
  if (this.status === 'completed') return 'Completed';
  if (this.isOverdue()) return 'Overdue';
  if (this.status === 'archived') return 'Archived';
  return 'Active';
});

// Ensure virtual fields are serialized
projectSchema.set('toJSON', { virtuals: true });

export const Project = mongoose.model<IProject>('Project', projectSchema);
