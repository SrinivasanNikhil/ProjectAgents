import { Types } from 'mongoose';
import { Milestone, IMilestone } from '../models/Milestone';
import { Project } from '../models/Project';
import { Persona } from '../models/Persona';
import { User } from '../models/User';
import { Artifact } from '../models/Artifact';
import { logger } from '../config/logger';

export interface CreateMilestoneData {
  project: Types.ObjectId | string;
  name: string;
  description: string;
  dueDate: Date;
  type: 'deliverable' | 'review' | 'presentation' | 'feedback';
  requirements?: Array<{
    title: string;
    description: string;
    isRequired: boolean;
    type: 'file' | 'text' | 'link' | 'presentation';
  }>;
  personaSignOffs?: Types.ObjectId[];
  evaluation?: {
    rubric: Array<{
      criterion: string;
      weight: number;
      maxScore: number;
      description: string;
    }>;
  };
  settings?: {
    requireAllPersonaApprovals?: boolean;
    allowResubmission?: boolean;
    maxResubmissions?: number;
    autoCloseAfterDays?: number;
  };
}

export interface UpdateMilestoneData extends Partial<CreateMilestoneData> {
  status?: 'pending' | 'in-progress' | 'completed' | 'overdue';
}

export interface MilestoneFilters {
  project?: Types.ObjectId | string;
  status?: string;
  type?: string;
  dueDate?: {
    start?: Date;
    end?: Date;
  };
  overdue?: boolean;
}

export interface PersonaSignOffData {
  personaId: Types.ObjectId | string;
  status: 'pending' | 'approved' | 'rejected' | 'requested-changes';
  feedback?: string;
  satisfactionScore?: number;
}

export interface SubmissionData {
  studentId: Types.ObjectId | string;
  artifacts: Types.ObjectId[];
  description: string;
}

export interface CreateCheckpointData {
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

class MilestoneService {
  /**
   * Create a new milestone
   */
  async createMilestone(data: CreateMilestoneData, createdBy: Types.ObjectId): Promise<IMilestone> {
    try {
      // Validate project exists and user has access
      const project = await Project.findById(data.project);
      if (!project) {
        throw new Error('Project not found');
      }

      // Validate personas exist and belong to the project
      if (data.personaSignOffs && data.personaSignOffs.length > 0) {
        const personas = await Persona.find({
          _id: { $in: data.personaSignOffs },
          project: data.project,
        });
        
        if (personas.length !== data.personaSignOffs.length) {
          throw new Error('One or more personas not found or do not belong to the project');
        }
      }

      // Create milestone
      const milestone = new Milestone({
        ...data,
        project: new Types.ObjectId(data.project as string),
        personaSignOffs: (data.personaSignOffs || []).map(personaId => ({
          persona: new Types.ObjectId(personaId as string),
          status: 'pending',
        })),
      });

      await milestone.save();

      // Update project milestone count
      await Project.findByIdAndUpdate(data.project, {
        $inc: { 'metadata.totalMilestones': 1 },
        'metadata.lastActivity': new Date(),
      });

      logger.info('Milestone created successfully', {
        milestoneId: milestone._id,
        projectId: data.project,
        createdBy,
      });

      return milestone;
    } catch (error) {
      logger.error('Error creating milestone', { error, data, createdBy });
      throw error;
    }
  }

  /**
   * Create a new checkpoint under a milestone
   */
  async createCheckpoint(
    milestoneId: Types.ObjectId | string,
    checkpoint: CreateCheckpointData,
    createdBy: Types.ObjectId
  ): Promise<IMilestone | null> {
    try {
      const milestone = await Milestone.findById(milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      // Validate personas if provided
      if (checkpoint.personaSignOffs && checkpoint.personaSignOffs.length > 0) {
        const personas = await Persona.find({
          _id: { $in: checkpoint.personaSignOffs },
          project: milestone.project,
        });
        if (personas.length !== checkpoint.personaSignOffs.length) {
          throw new Error('One or more personas not found or do not belong to the project');
        }
      }

      await milestone.addCheckpoint({
        title: checkpoint.title,
        description: checkpoint.description,
        dueDate: checkpoint.dueDate,
        requirements: checkpoint.requirements || [],
        personaSignOffs: (checkpoint.personaSignOffs || []).map((id) => new Types.ObjectId(id as string)),
      });

      logger.info('Checkpoint created', { milestoneId, createdBy });
      return await this.getMilestoneById(milestoneId);
    } catch (error) {
      logger.error('Error creating checkpoint', { error, milestoneId, checkpoint, createdBy });
      throw error;
    }
  }

  /**
   * Update checkpoint data
   */
  async updateCheckpoint(
    milestoneId: Types.ObjectId | string,
    checkpointId: Types.ObjectId | string,
    data: Partial<CreateCheckpointData & { status: 'pending' | 'in-progress' | 'completed' | 'overdue' }>,
    updatedBy: Types.ObjectId
  ): Promise<IMilestone | null> {
    try {
      const milestone = await Milestone.findById(milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      await milestone.updateCheckpoint(new Types.ObjectId(checkpointId as string), {
        title: data.title!,
        description: data.description!,
        dueDate: data.dueDate!,
        status: data.status as any,
        requirements: data.requirements!,
      });

      logger.info('Checkpoint updated', { milestoneId, checkpointId, updatedBy });
      return await this.getMilestoneById(milestoneId);
    } catch (error) {
      logger.error('Error updating checkpoint', { error, milestoneId, checkpointId, data, updatedBy });
      throw error;
    }
  }

  /**
   * Delete checkpoint
   */
  async deleteCheckpoint(
    milestoneId: Types.ObjectId | string,
    checkpointId: Types.ObjectId | string,
    deletedBy: Types.ObjectId
  ): Promise<IMilestone | null> {
    try {
      const milestone = await Milestone.findById(milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }
      await milestone.deleteCheckpoint(new Types.ObjectId(checkpointId as string));
      logger.info('Checkpoint deleted', { milestoneId, checkpointId, deletedBy });
      return await this.getMilestoneById(milestoneId);
    } catch (error) {
      logger.error('Error deleting checkpoint', { error, milestoneId, checkpointId, deletedBy });
      throw error;
    }
  }

  /**
   * Update checkpoint persona sign-off
   */
  async updateCheckpointSignOff(
    milestoneId: Types.ObjectId | string,
    checkpointId: Types.ObjectId | string,
    signOffData: PersonaSignOffData,
    updatedBy: Types.ObjectId
  ): Promise<IMilestone | null> {
    try {
      const milestone = await Milestone.findById(milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      // Validate persona exists and belongs to the project
      const persona = await Persona.findOne({
        _id: signOffData.personaId,
        project: milestone.project,
      });
      if (!persona) {
        throw new Error('Persona not found or does not belong to the project');
      }

      await milestone.updateCheckpointSignOff(
        new Types.ObjectId(checkpointId as string),
        new Types.ObjectId(signOffData.personaId as string),
        signOffData.status,
        signOffData.feedback,
        signOffData.satisfactionScore
      );

      logger.info('Checkpoint sign-off updated', { milestoneId, checkpointId, personaId: signOffData.personaId, updatedBy });
      return await this.getMilestoneById(milestoneId);
    } catch (error) {
      logger.error('Error updating checkpoint sign-off', { error, milestoneId, checkpointId, signOffData, updatedBy });
      throw error;
    }
  }

  /**
   * Get milestone by ID with populated references
   */
  async getMilestoneById(milestoneId: Types.ObjectId | string): Promise<IMilestone | null> {
    try {
      const milestone = await Milestone.findById(milestoneId)
        .populate('project', 'name description')
        .populate('personaSignOffs.persona', 'name role')
        .populate('submissions.student', 'firstName lastName email')
        .populate('submissions.artifacts', 'name type fileInfo')
        .populate('evaluation.completedBy', 'firstName lastName')
        .populate('checkpoints.personaSignOffs.persona', 'name role');

      return milestone;
    } catch (error) {
      logger.error('Error fetching milestone', { error, milestoneId });
      throw error;
    }
  }

  /**
   * Get milestones with filtering and pagination
   */
  async getMilestones(
    filters: MilestoneFilters = {},
    options: {
      page?: number;
      limit?: number;
      sort?: Record<string, 1 | -1>;
      populate?: boolean;
    } = {}
  ): Promise<{
    milestones: IMilestone[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        sort = { dueDate: 1 },
        populate = true,
      } = options;

      // Build query
      const query: any = {};

      if (filters.project) {
        query.project = new Types.ObjectId(filters.project as string);
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.type) {
        query.type = filters.type;
      }

      if (filters.dueDate) {
        query.dueDate = {};
        if (filters.dueDate.start) {
          query.dueDate.$gte = filters.dueDate.start;
        }
        if (filters.dueDate.end) {
          query.dueDate.$lte = filters.dueDate.end;
        }
      }

      if (filters.overdue) {
        query.dueDate = { ...query.dueDate, $lt: new Date() };
        query.status = { $ne: 'completed' };
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      
      let milestonesQuery = Milestone.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);

      if (populate) {
        milestonesQuery = milestonesQuery
          .populate('project', 'name description')
          .populate('personaSignOffs.persona', 'name role')
          .populate('submissions.student', 'firstName lastName');
      }

      const [milestones, total] = await Promise.all([
        milestonesQuery.exec(),
        Milestone.countDocuments(query),
      ]);

      return {
        milestones,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching milestones', { error, filters, options });
      throw error;
    }
  }

  /**
   * Update milestone
   */
  async updateMilestone(
    milestoneId: Types.ObjectId | string,
    data: UpdateMilestoneData,
    updatedBy: Types.ObjectId
  ): Promise<IMilestone | null> {
    try {
      const milestone = await Milestone.findById(milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      // Update milestone fields
      Object.assign(milestone, data);
      await milestone.save();

      // Update project last activity
      await Project.findByIdAndUpdate(milestone.project, {
        'metadata.lastActivity': new Date(),
      });

      logger.info('Milestone updated successfully', {
        milestoneId,
        updatedBy,
        changes: Object.keys(data),
      });

      return await this.getMilestoneById(milestoneId);
    } catch (error) {
      logger.error('Error updating milestone', { error, milestoneId, data, updatedBy });
      throw error;
    }
  }

  /**
   * Delete milestone
   */
  async deleteMilestone(milestoneId: Types.ObjectId | string, deletedBy: Types.ObjectId): Promise<void> {
    try {
      const milestone = await Milestone.findById(milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      await Milestone.findByIdAndDelete(milestoneId);

      // Update project milestone count
      await Project.findByIdAndUpdate(milestone.project, {
        $inc: { 'metadata.totalMilestones': -1 },
        'metadata.lastActivity': new Date(),
      });

      logger.info('Milestone deleted successfully', {
        milestoneId,
        projectId: milestone.project,
        deletedBy,
      });
    } catch (error) {
      logger.error('Error deleting milestone', { error, milestoneId, deletedBy });
      throw error;
    }
  }

  /**
   * Add or update persona sign-off
   */
  async updatePersonaSignOff(
    milestoneId: Types.ObjectId | string,
    signOffData: PersonaSignOffData,
    updatedBy: Types.ObjectId
  ): Promise<IMilestone | null> {
    try {
      const milestone = await Milestone.findById(milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      // Validate persona exists and belongs to the project
      const persona = await Persona.findOne({
        _id: signOffData.personaId,
        project: milestone.project,
      });
      if (!persona) {
        throw new Error('Persona not found or does not belong to the project');
      }

      // Update or add sign-off
      await milestone.updatePersonaSignOff(
        new Types.ObjectId(signOffData.personaId as string),
        signOffData.status,
        signOffData.feedback,
        signOffData.satisfactionScore
      );

      // Check if milestone should be marked as completed
      const allApproved = milestone.personaSignOffs.every(
        signOff => signOff.status === 'approved'
      );
      
      if (allApproved && milestone.settings.requireAllPersonaApprovals) {
        milestone.status = 'completed';
        await milestone.save();
      }

      logger.info('Persona sign-off updated', {
        milestoneId,
        personaId: signOffData.personaId,
        status: signOffData.status,
        updatedBy,
      });

      return await this.getMilestoneById(milestoneId);
    } catch (error) {
      logger.error('Error updating persona sign-off', { error, milestoneId, signOffData, updatedBy });
      throw error;
    }
  }

  /**
   * Add student submission
   */
  async addSubmission(
    milestoneId: Types.ObjectId | string,
    submissionData: SubmissionData
  ): Promise<IMilestone | null> {
    try {
      const milestone = await Milestone.findById(milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      // Validate student exists
      const student = await User.findById(submissionData.studentId);
      if (!student || student.role !== 'student') {
        throw new Error('Student not found');
      }

      // Validate artifacts exist
      if (submissionData.artifacts.length > 0) {
        const artifacts = await Artifact.find({
          _id: { $in: submissionData.artifacts },
          project: milestone.project,
        });
        
        if (artifacts.length !== submissionData.artifacts.length) {
          throw new Error('One or more artifacts not found or do not belong to the project');
        }
      }

      // Add submission
      await milestone.addSubmission(
        new Types.ObjectId(submissionData.studentId as string),
        submissionData.artifacts.map(id => new Types.ObjectId(id as string)),
        submissionData.description
      );

      // Update milestone status if not already in progress
      if (milestone.status === 'pending') {
        milestone.status = 'in-progress';
        await milestone.save();
      }

      logger.info('Submission added to milestone', {
        milestoneId,
        studentId: submissionData.studentId,
        artifactCount: submissionData.artifacts.length,
      });

      return await this.getMilestoneById(milestoneId);
    } catch (error) {
      logger.error('Error adding submission', { error, milestoneId, submissionData });
      throw error;
    }
  }

  /**
   * Get project milestones summary
   */
  async getProjectMilestonesSummary(projectId: Types.ObjectId | string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    upcomingDeadlines: IMilestone[];
  }> {
    try {
      const [milestones, upcomingDeadlines] = await Promise.all([
        Milestone.find({ project: projectId }),
        Milestone.find({
          project: projectId,
          dueDate: {
            $gte: new Date(),
            $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
          },
          status: { $ne: 'completed' },
        })
          .sort({ dueDate: 1 })
          .limit(5)
          .populate('personaSignOffs.persona', 'name role'),
      ]);

      const now = new Date();
      const summary = {
        total: milestones.length,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        upcomingDeadlines,
      };

      milestones.forEach(milestone => {
        switch (milestone.status) {
          case 'pending':
            summary.pending++;
            break;
          case 'in-progress':
            summary.inProgress++;
            break;
          case 'completed':
            summary.completed++;
            break;
        }

        if (milestone.dueDate < now && milestone.status !== 'completed') {
          summary.overdue++;
        }
      });

      return summary;
    } catch (error) {
      logger.error('Error fetching project milestones summary', { error, projectId });
      throw error;
    }
  }

  /**
   * Get milestone analytics
   */
  async getMilestoneAnalytics(
    projectId: Types.ObjectId | string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    completionRate: number;
    averageCompletionTime: number;
    personaEngagement: Array<{
      personaId: Types.ObjectId;
      personaName: string;
      signOffCount: number;
      averageSatisfaction: number;
    }>;
    milestoneTypeDistribution: Record<string, number>;
    submissionStats: {
      totalSubmissions: number;
      averageSubmissionsPerMilestone: number;
      resubmissionRate: number;
    };
  }> {
    try {
      const query: any = { project: projectId };
      
      if (dateRange) {
        query.createdAt = {
          $gte: dateRange.start,
          $lte: dateRange.end,
        };
      }

      const milestones = await Milestone.find(query)
        .populate('personaSignOffs.persona', 'name');

      const completed = milestones.filter(m => m.status === 'completed');
      const completionRate = milestones.length > 0 ? (completed.length / milestones.length) * 100 : 0;

      // Calculate average completion time
      const completionTimes = completed
        .filter(m => m.createdAt && m.updatedAt)
        .map(m => m.updatedAt.getTime() - m.createdAt.getTime());
      
      const averageCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
        : 0;

      // Persona engagement analysis
      const personaEngagement = new Map();
      milestones.forEach(milestone => {
        milestone.personaSignOffs.forEach(signOff => {
          const personaId = signOff.persona._id.toString();
          const persona = signOff.persona as any;
          
          if (!personaEngagement.has(personaId)) {
            personaEngagement.set(personaId, {
              personaId: signOff.persona._id,
              personaName: persona.name,
              signOffCount: 0,
              satisfactionScores: [],
            });
          }
          
          const engagement = personaEngagement.get(personaId);
          engagement.signOffCount++;
          
          if (signOff.satisfactionScore) {
            engagement.satisfactionScores.push(signOff.satisfactionScore);
          }
        });
      });

      const personaEngagementArray = Array.from(personaEngagement.values()).map(engagement => ({
        personaId: engagement.personaId,
        personaName: engagement.personaName,
        signOffCount: engagement.signOffCount,
        averageSatisfaction: engagement.satisfactionScores.length > 0
          ? engagement.satisfactionScores.reduce((sum: number, score: number) => sum + score, 0) / engagement.satisfactionScores.length
          : 0,
      }));

      // Milestone type distribution
      const milestoneTypeDistribution: Record<string, number> = {};
      milestones.forEach(milestone => {
        milestoneTypeDistribution[milestone.type] = (milestoneTypeDistribution[milestone.type] || 0) + 1;
      });

      // Submission stats
      const totalSubmissions = milestones.reduce((sum, m) => sum + m.submissions.length, 0);
      const averageSubmissionsPerMilestone = milestones.length > 0 ? totalSubmissions / milestones.length : 0;
      
      const resubmissions = milestones.reduce((sum, m) => {
        return sum + m.submissions.filter(s => s.status === 'needs-revision').length;
      }, 0);
      const resubmissionRate = totalSubmissions > 0 ? (resubmissions / totalSubmissions) * 100 : 0;

      return {
        completionRate,
        averageCompletionTime,
        personaEngagement: personaEngagementArray,
        milestoneTypeDistribution,
        submissionStats: {
          totalSubmissions,
          averageSubmissionsPerMilestone,
          resubmissionRate,
        },
      };
    } catch (error) {
      logger.error('Error fetching milestone analytics', { error, projectId, dateRange });
      throw error;
    }
  }
}

export const milestoneService = new MilestoneService();
export default milestoneService;