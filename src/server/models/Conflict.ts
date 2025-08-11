import mongoose, { Document, Schema, Types } from 'mongoose';

export type ConflictStatus = 'open' | 'resolved' | 'escalated';
export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IConflict extends Document {
  project: Types.ObjectId;
  conversation?: Types.ObjectId;
  participants: Array<{
    type: 'student' | 'persona';
    id: Types.ObjectId;
    name: string;
  }>;
  description: string;
  triggers: string[];
  status: ConflictStatus;
  severity: ConflictSeverity;
  startTime: Date;
  resolvedTime?: Date;
  resolutionSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const conflictSchema = new Schema<IConflict>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      index: true,
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
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    triggers: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['open', 'resolved', 'escalated'],
      default: 'open',
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
      required: true,
    },
    resolvedTime: {
      type: Date,
    },
    resolutionSummary: {
      type: String,
      trim: true,
      maxlength: [2000, 'Resolution summary cannot exceed 2000 characters'],
    },
  },
  { timestamps: true }
);

// Index combinations
conflictSchema.index({ project: 1, status: 1 });
conflictSchema.index({ conversation: 1, startTime: -1 });

export const Conflict = mongoose.model<IConflict>('Conflict', conflictSchema);
export default Conflict;