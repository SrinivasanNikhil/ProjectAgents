import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'instructor' | 'administrator';
  department?: string;
  studentId?: string;
  instructorId?: string;
  profilePicture?: string;
  isActive: boolean;
  lastLogin?: Date;
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      chat: boolean;
    };
    theme: 'light' | 'dark' | 'auto';
    language: string;
  };
  stats: {
    totalProjects: number;
    totalConversations: number;
    totalArtifacts: number;
    lastActivity: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
  isInstructor(): boolean;
  isStudent(): boolean;
  isAdministrator(): boolean;
  canAccessProject(projectId: Types.ObjectId): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
      validate: {
        validator: function (email: string) {
          return email.length >= 5 && email.length <= 254;
        },
        message: 'Email must be between 5 and 254 characters',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      validate: {
        validator: function (password: string) {
          // At least one uppercase, one lowercase, one number, one special character
          const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
          return passwordRegex.test(password);
        },
        message:
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      },
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [1, 'First name cannot be empty'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
      match: [
        /^[a-zA-Z\s\-']+$/,
        'First name can only contain letters, spaces, hyphens, and apostrophes',
      ],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [1, 'Last name cannot be empty'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
      match: [
        /^[a-zA-Z\s\-']+$/,
        'Last name can only contain letters, spaces, hyphens, and apostrophes',
      ],
    },
    role: {
      type: String,
      enum: {
        values: ['student', 'instructor', 'administrator'],
        message: 'Role must be student, instructor, or administrator',
      },
      required: [true, 'Role is required'],
      default: 'student',
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, 'Department name cannot exceed 100 characters'],
      validate: {
        validator: function (this: IUser) {
          return this.role === 'administrator' || !!this.department;
        },
        message: 'Department is required for students and instructors',
      },
    },
    studentId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      validate: {
        validator: function (this: IUser) {
          if (this.role === 'student') {
            return !!this.studentId && this.studentId.length >= 3;
          }
          return true;
        },
        message:
          'Valid student ID is required for students (minimum 3 characters)',
      },
    },
    instructorId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      validate: {
        validator: function (this: IUser) {
          if (this.role === 'instructor') {
            return !!this.instructorId && this.instructorId.length >= 3;
          }
          return true;
        },
        message:
          'Valid instructor ID is required for instructors (minimum 3 characters)',
      },
    },
    profilePicture: {
      type: String,
      trim: true,
      validate: {
        validator: function (url: string) {
          if (!url) return true;
          const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
          return urlRegex.test(url);
        },
        message: 'Profile picture must be a valid image URL',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      validate: {
        validator: function (date: Date) {
          if (!date) return true;
          return date <= new Date();
        },
        message: 'Last login date cannot be in the future',
      },
    },
    preferences: {
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
        chat: {
          type: Boolean,
          default: true,
        },
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto',
      },
      language: {
        type: String,
        default: 'en',
        match: [
          /^[a-z]{2}(-[A-Z]{2})?$/,
          'Language must be in ISO 639-1 format (e.g., en, en-US)',
        ],
      },
    },
    stats: {
      totalProjects: {
        type: Number,
        default: 0,
        min: [0, 'Total projects cannot be negative'],
      },
      totalConversations: {
        type: Number,
        default: 0,
        min: [0, 'Total conversations cannot be negative'],
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
    toJSON: {
      transform: function (doc, ret: any) {
        if (ret.password) {
          delete ret.password;
        }
        return ret;
      },
    },
  }
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'stats.lastActivity': -1 });
userSchema.index({ studentId: 1 }, { sparse: true });
userSchema.index({ instructorId: 1 }, { sparse: true });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Pre-save middleware to validate role-specific fields
userSchema.pre('save', function (next) {
  if (this.role === 'student' && !this.studentId) {
    return next(new Error('Student ID is required for students'));
  }
  if (this.role === 'instructor' && !this.instructorId) {
    return next(new Error('Instructor ID is required for instructors'));
  }
  if (this.role === 'administrator' && !this.department) {
    return next(new Error('Department is required for administrators'));
  }
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to get full name
userSchema.methods.getFullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

// Instance method to check if user is instructor
userSchema.methods.isInstructor = function (): boolean {
  return this.role === 'instructor';
};

// Instance method to check if user is student
userSchema.methods.isStudent = function (): boolean {
  return this.role === 'student';
};

// Instance method to check if user is administrator
userSchema.methods.isAdministrator = function (): boolean {
  return this.role === 'administrator';
};

// Instance method to check if user can access a project
userSchema.methods.canAccessProject = async function (
  projectId: Types.ObjectId
): Promise<boolean> {
  const Project = mongoose.model('Project');

  if (this.role === 'administrator') {
    return true;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return false;
  }

  if (this.role === 'instructor') {
    return project.instructor.toString() === this._id.toString();
  }

  if (this.role === 'student') {
    return project.students.some(
      (studentId: Types.ObjectId) =>
        studentId.toString() === this._id.toString()
    );
  }

  return false;
};

// Virtual for display name
userSchema.virtual('displayName').get(function () {
  return this.getFullName();
});

// Virtual for initials
userSchema.virtual('initials').get(function () {
  return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

export const User = mongoose.model<IUser>('User', userSchema);
