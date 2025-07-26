import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMeeting extends Document {
  project: Types.ObjectId;
  milestone: Types.ObjectId;
  title: string;
  description: string;
  scheduledDate: Date;
  duration: number; // in minutes
  status:
    | 'scheduled'
    | 'in-progress'
    | 'completed'
    | 'cancelled'
    | 'rescheduled';
  meetingType:
    | 'milestone-review'
    | 'progress-check'
    | 'presentation'
    | 'feedback-session';

  // Participants
  participants: Array<{
    type: 'student' | 'persona' | 'instructor';
    id: Types.ObjectId;
    name: string;
    email: string;
    role: string;
    status: 'invited' | 'confirmed' | 'declined' | 'attended' | 'no-show';
    responseDate?: Date;
  }>;

  // Meeting details
  agenda: Array<{
    title: string;
    description: string;
    duration: number; // in minutes
    presenter?: Types.ObjectId;
    order: number;
  }>;

  // Meeting room and settings
  meetingRoom: {
    url?: string;
    platform: 'zoom' | 'teams' | 'google-meet' | 'custom' | 'in-person';
    roomId?: string;
    password?: string;
    instructions?: string;
  };

  // Meeting notes and outcomes
  notes: {
    preMeeting?: string;
    duringMeeting?: string;
    postMeeting?: string;
    actionItems: Array<{
      description: string;
      assignedTo: Types.ObjectId;
      dueDate?: Date;
      status: 'pending' | 'in-progress' | 'completed';
      completedAt?: Date;
    }>;
  };

  // Feedback and evaluation
  feedback: Array<{
    from: Types.ObjectId;
    to: Types.ObjectId;
    rating: number; // 1-5 scale
    comments: string;
    submittedAt: Date;
  }>;

  // Meeting recording and materials
  materials: Array<{
    type: 'presentation' | 'document' | 'recording' | 'other';
    title: string;
    url: string;
    uploadedBy: Types.ObjectId;
    uploadedAt: Date;
    size?: number;
  }>;

  // Reminders and notifications
  reminders: Array<{
    type: 'email' | 'push' | 'sms';
    scheduledFor: Date;
    sent: boolean;
    sentAt?: Date;
    recipient: Types.ObjectId;
  }>;

  // Settings
  settings: {
    allowRecording: boolean;
    requireConfirmation: boolean;
    autoRecord: boolean;
    maxParticipants: number;
    allowLateJoin: boolean;
    requireAttendance: boolean;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    milestone: {
      type: Schema.Types.ObjectId,
      ref: 'Milestone',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Meeting title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Meeting description cannot exceed 1000 characters'],
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: [15, 'Meeting duration must be at least 15 minutes'],
      max: [480, 'Meeting duration cannot exceed 8 hours'],
    },
    status: {
      type: String,
      enum: [
        'scheduled',
        'in-progress',
        'completed',
        'cancelled',
        'rescheduled',
      ],
      default: 'scheduled',
    },
    meetingType: {
      type: String,
      enum: [
        'milestone-review',
        'progress-check',
        'presentation',
        'feedback-session',
      ],
      required: true,
    },
    participants: [
      {
        type: {
          type: String,
          enum: ['student', 'persona', 'instructor'],
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
        email: {
          type: String,
          required: true,
          trim: true,
          lowercase: true,
        },
        role: {
          type: String,
          required: true,
          trim: true,
        },
        status: {
          type: String,
          enum: ['invited', 'confirmed', 'declined', 'attended', 'no-show'],
          default: 'invited',
        },
        responseDate: {
          type: Date,
        },
      },
    ],
    agenda: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: [200, 'Agenda item title cannot exceed 200 characters'],
        },
        description: {
          type: String,
          required: true,
          trim: true,
          maxlength: [
            500,
            'Agenda item description cannot exceed 500 characters',
          ],
        },
        duration: {
          type: Number,
          required: true,
          min: [1, 'Agenda item duration must be at least 1 minute'],
        },
        presenter: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        order: {
          type: Number,
          required: true,
          min: [1, 'Order must be at least 1'],
        },
      },
    ],
    meetingRoom: {
      url: {
        type: String,
        trim: true,
      },
      platform: {
        type: String,
        enum: ['zoom', 'teams', 'google-meet', 'custom', 'in-person'],
        required: true,
      },
      roomId: {
        type: String,
        trim: true,
      },
      password: {
        type: String,
        trim: true,
      },
      instructions: {
        type: String,
        trim: true,
        maxlength: [1000, 'Meeting instructions cannot exceed 1000 characters'],
      },
    },
    notes: {
      preMeeting: {
        type: String,
        trim: true,
        maxlength: [5000, 'Pre-meeting notes cannot exceed 5000 characters'],
      },
      duringMeeting: {
        type: String,
        trim: true,
        maxlength: [
          10000,
          'During meeting notes cannot exceed 10000 characters',
        ],
      },
      postMeeting: {
        type: String,
        trim: true,
        maxlength: [5000, 'Post-meeting notes cannot exceed 5000 characters'],
      },
      actionItems: [
        {
          description: {
            type: String,
            required: true,
            trim: true,
            maxlength: [
              500,
              'Action item description cannot exceed 500 characters',
            ],
          },
          assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          dueDate: {
            type: Date,
          },
          status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed'],
            default: 'pending',
          },
          completedAt: {
            type: Date,
          },
        },
      ],
    },
    feedback: [
      {
        from: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        to: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: [1, 'Rating must be at least 1'],
          max: [5, 'Rating cannot exceed 5'],
        },
        comments: {
          type: String,
          required: true,
          trim: true,
          maxlength: [1000, 'Feedback comments cannot exceed 1000 characters'],
        },
        submittedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
      },
    ],
    materials: [
      {
        type: {
          type: String,
          enum: ['presentation', 'document', 'recording', 'other'],
          required: true,
        },
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: [200, 'Material title cannot exceed 200 characters'],
        },
        url: {
          type: String,
          required: true,
          trim: true,
        },
        uploadedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        uploadedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
        size: {
          type: Number,
          min: [0, 'File size cannot be negative'],
        },
      },
    ],
    reminders: [
      {
        type: {
          type: String,
          enum: ['email', 'push', 'sms'],
          required: true,
        },
        scheduledFor: {
          type: Date,
          required: true,
        },
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: {
          type: Date,
        },
        recipient: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      },
    ],
    settings: {
      allowRecording: {
        type: Boolean,
        default: true,
      },
      requireConfirmation: {
        type: Boolean,
        default: true,
      },
      autoRecord: {
        type: Boolean,
        default: false,
      },
      maxParticipants: {
        type: Number,
        default: 20,
        min: [1, 'Max participants must be at least 1'],
        max: [100, 'Max participants cannot exceed 100'],
      },
      allowLateJoin: {
        type: Boolean,
        default: true,
      },
      requireAttendance: {
        type: Boolean,
        default: true,
      },
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
meetingSchema.index({ project: 1 });
meetingSchema.index({ milestone: 1 });
meetingSchema.index({ scheduledDate: 1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ 'participants.id': 1 });
meetingSchema.index({ meetingType: 1 });

// Method to check if meeting is upcoming
meetingSchema.methods.isUpcoming = function (): boolean {
  const now = new Date();
  const meetingTime = this.scheduledDate;
  const endTime = new Date(meetingTime.getTime() + this.duration * 60000);

  return now < meetingTime && this.status === 'scheduled';
};

// Method to check if meeting is in progress
meetingSchema.methods.isInProgress = function (): boolean {
  const now = new Date();
  const meetingTime = this.scheduledDate;
  const endTime = new Date(meetingTime.getTime() + this.duration * 60000);

  return now >= meetingTime && now <= endTime && this.status === 'in-progress';
};

// Method to check if meeting is overdue
meetingSchema.methods.isOverdue = function (): boolean {
  const now = new Date();
  const endTime = new Date(
    this.scheduledDate.getTime() + this.duration * 60000
  );

  return now > endTime && this.status === 'scheduled';
};

// Method to add participant
meetingSchema.methods.addParticipant = function (
  type: 'student' | 'persona' | 'instructor',
  id: Types.ObjectId,
  name: string,
  email: string,
  role: string
) {
  const existingParticipant = this.participants.find(
    (p: any) => p.id.toString() === id.toString()
  );

  if (!existingParticipant) {
    this.participants.push({
      type,
      id,
      name,
      email,
      role,
      status: 'invited',
    });
  }

  return this.save();
};

// Method to update participant status
meetingSchema.methods.updateParticipantStatus = function (
  participantId: Types.ObjectId,
  status: 'invited' | 'confirmed' | 'declined' | 'attended' | 'no-show'
) {
  const participant = this.participants.find(
    (p: any) => p.id.toString() === participantId.toString()
  );

  if (participant) {
    participant.status = status;
    participant.responseDate = new Date();
  }

  return this.save();
};

// Method to start meeting
meetingSchema.methods.startMeeting = function () {
  this.status = 'in-progress';
  this.startedAt = new Date();
  return this.save();
};

// Method to end meeting
meetingSchema.methods.endMeeting = function () {
  this.status = 'completed';
  this.endedAt = new Date();
  return this.save();
};

// Method to add action item
meetingSchema.methods.addActionItem = function (
  description: string,
  assignedTo: Types.ObjectId,
  dueDate?: Date
) {
  this.notes.actionItems.push({
    description,
    assignedTo,
    dueDate,
    status: 'pending',
  });

  return this.save();
};

// Method to add feedback
meetingSchema.methods.addFeedback = function (
  from: Types.ObjectId,
  to: Types.ObjectId,
  rating: number,
  comments: string
) {
  this.feedback.push({
    from,
    to,
    rating,
    comments,
    submittedAt: new Date(),
  });

  return this.save();
};

// Virtual for meeting end time
meetingSchema.virtual('endTime').get(function () {
  return new Date(this.scheduledDate.getTime() + this.duration * 60000);
});

// Virtual for attendance percentage
meetingSchema.virtual('attendancePercentage').get(function () {
  if (this.participants.length === 0) return 0;

  const attended = this.participants.filter(
    (p: any) => p.status === 'attended'
  ).length;

  return Math.round((attended / this.participants.length) * 100);
});

// Virtual for average feedback rating
meetingSchema.virtual('averageFeedbackRating').get(function () {
  if (this.feedback.length === 0) return null;

  const sum = this.feedback.reduce((acc: number, f: any) => acc + f.rating, 0);
  return Math.round((sum / this.feedback.length) * 10) / 10;
});

// Ensure virtual fields are serialized
meetingSchema.set('toJSON', { virtuals: true });

export const Meeting = mongoose.model<IMeeting>('Meeting', meetingSchema);
