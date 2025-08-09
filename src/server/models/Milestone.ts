import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMilestone extends Document {
  project: Types.ObjectId;
  name: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  type: 'deliverable' | 'review' | 'presentation' | 'feedback';
  requirements: Array<{
    title: string;
    description: string;
    isRequired: boolean;
    type: 'file' | 'text' | 'link' | 'presentation';
  }>;
  personaSignOffs: Array<{
    persona: Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected' | 'requested-changes';
    feedback?: string;
    signedOffAt?: Date;
    satisfactionScore?: number; // 1-10 scale
  }>;
  submissions: Array<{
    student: Types.ObjectId;
    submittedAt: Date;
    artifacts: Types.ObjectId[];
    description: string;
    status: 'submitted' | 'under-review' | 'approved' | 'needs-revision';
  }>;
  evaluation: {
    rubric: Array<{
      criterion: string;
      weight: number;
      maxScore: number;
      description: string;
    }>;
    scores: Map<string, number>; // studentId -> total score
    feedback: Map<string, string>; // studentId -> feedback
    completedBy?: Types.ObjectId;
    completedAt?: Date;
  };
  settings: {
    requireAllPersonaApprovals: boolean;
    allowResubmission: boolean;
    maxResubmissions: number;
    autoCloseAfterDays: number;
  };
  checkpoints: Array<{
    _id?: Types.ObjectId;
    title: string;
    description: string;
    dueDate: Date;
    status: 'pending' | 'in-progress' | 'completed' | 'overdue';
    requirements: Array<{
      title: string;
      description: string;
      isRequired: boolean;
      type: 'file' | 'text' | 'link' | 'presentation';
    }>;
    personaSignOffs: Array<{
      persona: Types.ObjectId;
      status: 'pending' | 'approved' | 'rejected' | 'requested-changes';
      feedback?: string;
      signedOffAt?: Date;
      satisfactionScore?: number;
    }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Milestone name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Milestone description cannot exceed 1000 characters'],
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'overdue'],
      default: 'pending',
    },
    type: {
      type: String,
      enum: ['deliverable', 'review', 'presentation', 'feedback'],
      required: true,
    },
    requirements: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, 'Requirement title cannot exceed 100 characters'],
        },
        description: {
          type: String,
          required: true,
          trim: true,
          maxlength: [
            500,
            'Requirement description cannot exceed 500 characters',
          ],
        },
        isRequired: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['file', 'text', 'link', 'presentation'],
          required: true,
        },
      },
    ],
    personaSignOffs: [
      {
        persona: {
          type: Schema.Types.ObjectId,
          ref: 'Persona',
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected', 'requested-changes'],
          default: 'pending',
        },
        feedback: {
          type: String,
          trim: true,
          maxlength: [1000, 'Feedback cannot exceed 1000 characters'],
        },
        signedOffAt: {
          type: Date,
        },
        satisfactionScore: {
          type: Number,
          min: [1, 'Satisfaction score cannot be below 1'],
          max: [10, 'Satisfaction score cannot exceed 10'],
        },
      },
    ],
    submissions: [
      {
        student: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        submittedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
        artifacts: [
          {
            type: Schema.Types.ObjectId,
            ref: 'Artifact',
          },
        ],
        description: {
          type: String,
          required: true,
          trim: true,
          maxlength: [
            2000,
            'Submission description cannot exceed 2000 characters',
          ],
        },
        status: {
          type: String,
          enum: ['submitted', 'under-review', 'approved', 'needs-revision'],
          default: 'submitted',
        },
      },
    ],
    checkpoints: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, 'Checkpoint title cannot exceed 100 characters'],
        },
        description: {
          type: String,
          required: true,
          trim: true,
          maxlength: [600, 'Checkpoint description cannot exceed 600 characters'],
        },
        dueDate: {
          type: Date,
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'in-progress', 'completed', 'overdue'],
          default: 'pending',
        },
        requirements: [
          {
            title: {
              type: String,
              required: true,
              trim: true,
              maxlength: [100, 'Requirement title cannot exceed 100 characters'],
            },
            description: {
              type: String,
              required: true,
              trim: true,
              maxlength: [
                500,
                'Requirement description cannot exceed 500 characters',
              ],
            },
            isRequired: {
              type: Boolean,
              default: true,
            },
            type: {
              type: String,
              enum: ['file', 'text', 'link', 'presentation'],
              required: true,
            },
          },
        ],
        personaSignOffs: [
          {
            persona: {
              type: Schema.Types.ObjectId,
              ref: 'Persona',
              required: true,
            },
            status: {
              type: String,
              enum: ['pending', 'approved', 'rejected', 'requested-changes'],
              default: 'pending',
            },
            feedback: {
              type: String,
              trim: true,
              maxlength: [1000, 'Feedback cannot exceed 1000 characters'],
            },
            signedOffAt: {
              type: Date,
            },
            satisfactionScore: {
              type: Number,
              min: [1, 'Satisfaction score cannot be below 1'],
              max: [10, 'Satisfaction score cannot exceed 10'],
            },
          },
        ],
      },
    ],
    evaluation: {
      rubric: [
        {
          criterion: {
            type: String,
            required: true,
            trim: true,
            maxlength: [100, 'Criterion cannot exceed 100 characters'],
          },
          weight: {
            type: Number,
            required: true,
            min: [0, 'Weight cannot be negative'],
            max: [100, 'Weight cannot exceed 100'],
          },
          maxScore: {
            type: Number,
            required: true,
            min: [1, 'Max score must be at least 1'],
          },
          description: {
            type: String,
            required: true,
            trim: true,
            maxlength: [
              300,
              'Criterion description cannot exceed 300 characters',
            ],
          },
        },
      ],
      scores: {
        type: Map,
        of: Number,
        default: new Map(),
      },
      feedback: {
        type: Map,
        of: String,
        default: new Map(),
      },
      completedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      completedAt: {
        type: Date,
      },
    },
    settings: {
      requireAllPersonaApprovals: {
        type: Boolean,
        default: true,
      },
      allowResubmission: {
        type: Boolean,
        default: true,
      },
      maxResubmissions: {
        type: Number,
        default: 3,
        min: [0, 'Max resubmissions cannot be negative'],
        max: [10, 'Max resubmissions cannot exceed 10'],
      },
      autoCloseAfterDays: {
        type: Number,
        default: 7,
        min: [1, 'Auto close days must be at least 1'],
        max: [90, 'Auto close days cannot exceed 90'],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
milestoneSchema.index({ project: 1 });
milestoneSchema.index({ dueDate: 1 });
milestoneSchema.index({ status: 1 });
milestoneSchema.index({ type: 1 });
milestoneSchema.index({ 'personaSignOffs.persona': 1 });
milestoneSchema.index({ 'checkpoints.dueDate': 1 });
milestoneSchema.index({ 'checkpoints.status': 1 });
milestoneSchema.index({ 'checkpoints.personaSignOffs.persona': 1 });

// Method to check if milestone is overdue
milestoneSchema.methods.isOverdue = function () {
  return this.dueDate < new Date() && this.status !== 'completed';
};

// Method to get completion percentage
milestoneSchema.methods.getCompletionPercentage = function () {
  if (this.personaSignOffs.length === 0) return 0;

  const approvedSignOffs = this.personaSignOffs.filter(
    (signOff: any) => signOff.status === 'approved'
  ).length;

  return Math.round((approvedSignOffs / this.personaSignOffs.length) * 100);
};

// Method to add persona sign-off
milestoneSchema.methods.addPersonaSignOff = function (
  personaId: Types.ObjectId
) {
  const existingSignOff = this.personaSignOffs.find(
    (signOff: any) => signOff.persona.toString() === personaId.toString()
  );

  if (!existingSignOff) {
    this.personaSignOffs.push({
      persona: personaId,
      status: 'pending',
    });
  }

  return this.save();
};

// Method to update persona sign-off status
milestoneSchema.methods.updatePersonaSignOff = function (
  personaId: Types.ObjectId,
  status: string,
  feedback?: string,
  satisfactionScore?: number
) {
  const signOff = this.personaSignOffs.find(
    (s: any) => s.persona.toString() === personaId.toString()
  );

  if (signOff) {
    signOff.status = status;
    if (feedback) signOff.feedback = feedback;
    if (satisfactionScore) signOff.satisfactionScore = satisfactionScore;
    if (status === 'approved' || status === 'rejected') {
      signOff.signedOffAt = new Date();
    }
  }

  return this.save();
};

// Method to add student submission
milestoneSchema.methods.addSubmission = function (
  studentId: Types.ObjectId,
  artifacts: Types.ObjectId[],
  description: string
) {
  this.submissions.push({
    student: studentId,
    submittedAt: new Date(),
    artifacts,
    description,
    status: 'submitted',
  });

  return this.save();
};

// Checkpoint helpers
milestoneSchema.methods.addCheckpoint = function (
  checkpoint: {
    title: string;
    description: string;
    dueDate: Date;
    requirements?: Array<{
      title: string;
      description: string;
      isRequired: boolean;
      type: 'file' | 'text' | 'link' | 'presentation';
    }>;
    personaSignOffs?: Types.ObjectId[];
  }
) {
  const newCheckpoint: any = {
    title: checkpoint.title,
    description: checkpoint.description,
    dueDate: checkpoint.dueDate,
    status: 'pending',
    requirements: checkpoint.requirements || [],
    personaSignOffs: (checkpoint.personaSignOffs || []).map((pId) => ({
      persona: pId,
      status: 'pending',
    })),
  };

  this.checkpoints.push(newCheckpoint);
  return this.save();
};

milestoneSchema.methods.updateCheckpoint = function (
  checkpointId: Types.ObjectId,
  data: Partial<{
    title: string;
    description: string;
    dueDate: Date;
    status: 'pending' | 'in-progress' | 'completed' | 'overdue';
    requirements: Array<{
      title: string;
      description: string;
      isRequired: boolean;
      type: 'file' | 'text' | 'link' | 'presentation';
    }>;
  }>
) {
  const cp = this.checkpoints.id(checkpointId);
  if (!cp) return this;

  Object.assign(cp, data);
  return this.save();
};

milestoneSchema.methods.deleteCheckpoint = function (
  checkpointId: Types.ObjectId
) {
  const cp = this.checkpoints.id(checkpointId);
  if (!cp) return this;
  cp.remove();
  return this.save();
};

milestoneSchema.methods.updateCheckpointSignOff = function (
  checkpointId: Types.ObjectId,
  personaId: Types.ObjectId,
  status: 'pending' | 'approved' | 'rejected' | 'requested-changes',
  feedback?: string,
  satisfactionScore?: number
) {
  const cp: any = this.checkpoints.id(checkpointId);
  if (!cp) return this;

  const signOff = cp.personaSignOffs.find(
    (s: any) => s.persona.toString() === personaId.toString()
  );

  if (signOff) {
    signOff.status = status;
    if (feedback) signOff.feedback = feedback;
    if (satisfactionScore) signOff.satisfactionScore = satisfactionScore;
    if (status === 'approved' || status === 'rejected') {
      signOff.signedOffAt = new Date();
    }
  } else {
    cp.personaSignOffs.push({
      persona: personaId,
      status,
      feedback,
      satisfactionScore,
      signedOffAt:
        status === 'approved' || status === 'rejected' ? new Date() : undefined,
    });
  }

  // Auto-complete checkpoint if all persona approvals are approved
  if (
    cp.personaSignOffs.length > 0 &&
    cp.personaSignOffs.every((s: any) => s.status === 'approved')
  ) {
    cp.status = 'completed';
  }

  return this.save();
};

// Virtual for days until due
milestoneSchema.virtual('daysUntilDue').get(function () {
  const now = new Date();
  const due = this.dueDate;
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for average satisfaction score
milestoneSchema.virtual('averageSatisfactionScore').get(function () {
  const scores = this.personaSignOffs
    .map((signOff: any) => signOff.satisfactionScore)
    .filter((score: number) => score !== undefined);

  if (scores.length === 0) return null;

  const sum = scores.reduce((acc: number, score: number) => acc + score, 0);
  return Math.round((sum / scores.length) * 10) / 10;
});

// Ensure virtual fields are serialized
milestoneSchema.set('toJSON', { virtuals: true });

export const Milestone = mongoose.model<IMilestone>(
  'Milestone',
  milestoneSchema
);
