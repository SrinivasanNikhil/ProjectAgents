import { Meeting, IMeeting } from '../models/Meeting';
import { Milestone } from '../models/Milestone';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { Persona } from '../models/Persona';
import { chatService } from './chatService';
import { logger } from '../config/logger';
import { Types } from 'mongoose';

export interface CreateMeetingData {
  projectId: string;
  milestoneId: string;
  title: string;
  description: string;
  scheduledDate: Date;
  duration: number;
  meetingType:
    | 'milestone-review'
    | 'progress-check'
    | 'presentation'
    | 'feedback-session';
  participants: Array<{
    type: 'student' | 'persona' | 'instructor';
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  agenda: Array<{
    title: string;
    description: string;
    duration: number;
    presenter?: string;
    order: number;
  }>;
  meetingRoom: {
    url?: string;
    platform: 'zoom' | 'teams' | 'google-meet' | 'custom' | 'in-person';
    roomId?: string;
    password?: string;
    instructions?: string;
  };
  settings?: {
    allowRecording?: boolean;
    requireConfirmation?: boolean;
    autoRecord?: boolean;
    maxParticipants?: number;
    allowLateJoin?: boolean;
    requireAttendance?: boolean;
  };
}

export interface UpdateMeetingData {
  title?: string;
  description?: string;
  scheduledDate?: Date;
  duration?: number;
  meetingType?:
    | 'milestone-review'
    | 'progress-check'
    | 'presentation'
    | 'feedback-session';
  agenda?: Array<{
    title: string;
    description: string;
    duration: number;
    presenter?: string;
    order: number;
  }>;
  meetingRoom?: {
    url?: string;
    platform: 'zoom' | 'teams' | 'google-meet' | 'custom' | 'in-person';
    roomId?: string;
    password?: string;
    instructions?: string;
  };
  settings?: {
    allowRecording?: boolean;
    requireConfirmation?: boolean;
    autoRecord?: boolean;
    maxParticipants?: number;
    allowLateJoin?: boolean;
    requireAttendance?: boolean;
  };
}

export class MeetingService {
  /**
   * Create a new meeting
   */
  public async createMeeting(
    meetingData: CreateMeetingData
  ): Promise<IMeeting> {
    try {
      // Validate project and milestone exist
      const project = await Project.findById(meetingData.projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const milestone = await Milestone.findById(meetingData.milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      // Validate scheduled date is in the future
      if (meetingData.scheduledDate <= new Date()) {
        throw new Error('Meeting must be scheduled for a future date');
      }

      // Create meeting
      const meeting = new Meeting({
        project: meetingData.projectId,
        milestone: meetingData.milestoneId,
        title: meetingData.title,
        description: meetingData.description,
        scheduledDate: meetingData.scheduledDate,
        duration: meetingData.duration,
        meetingType: meetingData.meetingType,
        participants: meetingData.participants.map(p => ({
          ...p,
          id: new Types.ObjectId(p.id),
          status: 'invited',
        })),
        agenda: meetingData.agenda.map(a => ({
          ...a,
          presenter: a.presenter ? new Types.ObjectId(a.presenter) : undefined,
        })),
        meetingRoom: meetingData.meetingRoom,
        settings: {
          allowRecording: true,
          requireConfirmation: true,
          autoRecord: false,
          maxParticipants: 20,
          allowLateJoin: true,
          requireAttendance: true,
          ...meetingData.settings,
        },
      });

      await meeting.save();

      // Send system message to project chat
      await chatService.sendSystemMessage(
        meetingData.projectId,
        `New meeting scheduled: "${meetingData.title}" on ${meetingData.scheduledDate.toLocaleDateString()} at ${meetingData.scheduledDate.toLocaleTimeString()}`,
        {
          meetingId: (meeting._id as any).toString(),
          milestoneId: meetingData.milestoneId,
          meetingType: meetingData.meetingType,
        }
      );

      // Schedule reminders
      await this.scheduleReminders(meeting);

      logger.info(
        `Meeting created: ${meeting._id} for project ${meetingData.projectId}`
      );
      return meeting;
    } catch (error) {
      logger.error('Error creating meeting:', error);
      throw error;
    }
  }

  /**
   * Get meeting by ID
   */
  public async getMeeting(meetingId: string): Promise<IMeeting | null> {
    try {
      const meeting = await Meeting.findById(meetingId)
        .populate('project', 'name description')
        .populate('milestone', 'name description dueDate')
        .populate('participants.id', 'email name role')
        .populate('agenda.presenter', 'email name')
        .populate('notes.actionItems.assignedTo', 'email name')
        .populate('feedback.from', 'email name')
        .populate('feedback.to', 'email name')
        .populate('materials.uploadedBy', 'email name')
        .exec();

      return meeting;
    } catch (error) {
      logger.error('Error getting meeting:', error);
      throw error;
    }
  }

  /**
   * Get meetings for a project
   */
  public async getProjectMeetings(
    projectId: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ meetings: IMeeting[]; total: number }> {
    try {
      const filter: any = { project: projectId };
      if (status) {
        filter.status = status;
      }

      const [meetings, total] = await Promise.all([
        Meeting.find(filter)
          .populate('milestone', 'name description dueDate')
          .populate('participants.id', 'email name role')
          .sort({ scheduledDate: 1 })
          .limit(limit)
          .skip(offset)
          .exec(),
        Meeting.countDocuments(filter),
      ]);

      return { meetings, total };
    } catch (error) {
      logger.error('Error getting project meetings:', error);
      throw error;
    }
  }

  /**
   * Get meetings for a user
   */
  public async getUserMeetings(
    userId: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ meetings: IMeeting[]; total: number }> {
    try {
      const filter: any = { 'participants.id': userId };
      if (status) {
        filter.status = status;
      }

      const [meetings, total] = await Promise.all([
        Meeting.find(filter)
          .populate('project', 'name description')
          .populate('milestone', 'name description dueDate')
          .populate('participants.id', 'email name role')
          .sort({ scheduledDate: 1 })
          .limit(limit)
          .skip(offset)
          .exec(),
        Meeting.countDocuments(filter),
      ]);

      return { meetings, total };
    } catch (error) {
      logger.error('Error getting user meetings:', error);
      throw error;
    }
  }

  /**
   * Update meeting
   */
  public async updateMeeting(
    meetingId: string,
    updateData: UpdateMeetingData
  ): Promise<IMeeting | null> {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Update fields
      if (updateData.title) meeting.title = updateData.title;
      if (updateData.description) meeting.description = updateData.description;
      if (updateData.scheduledDate)
        meeting.scheduledDate = updateData.scheduledDate;
      if (updateData.duration) meeting.duration = updateData.duration;
      if (updateData.meetingType) meeting.meetingType = updateData.meetingType;
      if (updateData.agenda) {
        meeting.agenda = updateData.agenda.map(a => ({
          ...a,
          presenter: a.presenter ? new Types.ObjectId(a.presenter) : undefined,
        }));
      }
      if (updateData.meetingRoom) meeting.meetingRoom = updateData.meetingRoom;
      if (updateData.settings) {
        meeting.settings = { ...meeting.settings, ...updateData.settings };
      }

      await meeting.save();

      // Send system message about meeting update
      await chatService.sendSystemMessage(
        meeting.project.toString(),
        `Meeting updated: "${meeting.title}"`,
        {
          meetingId: (meeting._id as any).toString(),
          milestoneId: meeting.milestone.toString(),
          meetingType: meeting.meetingType,
        }
      );

      logger.info(`Meeting updated: ${meetingId}`);
      return meeting;
    } catch (error) {
      logger.error('Error updating meeting:', error);
      throw error;
    }
  }

  /**
   * Add participant to meeting
   */
  public async addParticipant(
    meetingId: string,
    type: 'student' | 'persona' | 'instructor',
    id: string,
    name: string,
    email: string,
    role: string
  ): Promise<IMeeting | null> {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      await (meeting as any).addParticipant(
        type,
        new Types.ObjectId(id),
        name,
        email,
        role
      );

      // Send system message about new participant
      await chatService.sendSystemMessage(
        meeting.project.toString(),
        `${name} has been added to the meeting "${meeting.title}"`,
        {
          meetingId: (meeting._id as any).toString(),
          participantId: id,
        }
      );

      logger.info(`Participant added to meeting: ${meetingId} - ${name}`);
      return meeting;
    } catch (error) {
      logger.error('Error adding participant:', error);
      throw error;
    }
  }

  /**
   * Update participant status
   */
  public async updateParticipantStatus(
    meetingId: string,
    participantId: string,
    status: 'invited' | 'confirmed' | 'declined' | 'attended' | 'no-show'
  ): Promise<IMeeting | null> {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      await (meeting as any).updateParticipantStatus(
        new Types.ObjectId(participantId),
        status
      );

      // Send system message about status update
      const participant = meeting.participants.find(
        p => p.id.toString() === participantId
      );
      if (participant) {
        await chatService.sendSystemMessage(
          meeting.project.toString(),
          `${participant.name} has ${status} the meeting "${meeting.title}"`,
          {
            meetingId: (meeting._id as any).toString(),
            participantId,
            status,
          }
        );
      }

      logger.info(
        `Participant status updated: ${meetingId} - ${participantId} - ${status}`
      );
      return meeting;
    } catch (error) {
      logger.error('Error updating participant status:', error);
      throw error;
    }
  }

  /**
   * Start meeting
   */
  public async startMeeting(meetingId: string): Promise<IMeeting | null> {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (meeting.status !== 'scheduled') {
        throw new Error('Meeting is not in scheduled status');
      }

      await meeting.startMeeting();

      // Send system message about meeting start
      await chatService.sendSystemMessage(
        meeting.project.toString(),
        `Meeting "${meeting.title}" has started`,
        {
          meetingId: meeting._id.toString(),
          milestoneId: meeting.milestone.toString(),
          meetingType: meeting.meetingType,
        }
      );

      logger.info(`Meeting started: ${meetingId}`);
      return meeting;
    } catch (error) {
      logger.error('Error starting meeting:', error);
      throw error;
    }
  }

  /**
   * End meeting
   */
  public async endMeeting(meetingId: string): Promise<IMeeting | null> {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (meeting.status !== 'in-progress') {
        throw new Error('Meeting is not in progress');
      }

      await meeting.endMeeting();

      // Send system message about meeting end
      await chatService.sendSystemMessage(
        meeting.project.toString(),
        `Meeting "${meeting.title}" has ended`,
        {
          meetingId: meeting._id.toString(),
          milestoneId: meeting.milestone.toString(),
          meetingType: meeting.meetingType,
        }
      );

      logger.info(`Meeting ended: ${meetingId}`);
      return meeting;
    } catch (error) {
      logger.error('Error ending meeting:', error);
      throw error;
    }
  }

  /**
   * Cancel meeting
   */
  public async cancelMeeting(
    meetingId: string,
    reason?: string
  ): Promise<IMeeting | null> {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (meeting.status === 'completed' || meeting.status === 'cancelled') {
        throw new Error('Meeting cannot be cancelled');
      }

      meeting.status = 'cancelled';
      await meeting.save();

      // Send system message about meeting cancellation
      const message = reason
        ? `Meeting "${meeting.title}" has been cancelled. Reason: ${reason}`
        : `Meeting "${meeting.title}" has been cancelled`;

      await chatService.sendSystemMessage(meeting.project.toString(), message, {
        meetingId: meeting._id.toString(),
        milestoneId: meeting.milestone.toString(),
        meetingType: meeting.meetingType,
        cancelled: true,
      });

      logger.info(`Meeting cancelled: ${meetingId}`);
      return meeting;
    } catch (error) {
      logger.error('Error cancelling meeting:', error);
      throw error;
    }
  }

  /**
   * Add action item to meeting
   */
  public async addActionItem(
    meetingId: string,
    description: string,
    assignedTo: string,
    dueDate?: Date
  ): Promise<IMeeting | null> {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      await meeting.addActionItem(
        description,
        new Types.ObjectId(assignedTo),
        dueDate
      );

      // Send system message about new action item
      await chatService.sendSystemMessage(
        meeting.project.toString(),
        `New action item added to meeting "${meeting.title}": ${description}`,
        {
          meetingId: meeting._id.toString(),
          actionItem: description,
          assignedTo,
        }
      );

      logger.info(`Action item added to meeting: ${meetingId}`);
      return meeting;
    } catch (error) {
      logger.error('Error adding action item:', error);
      throw error;
    }
  }

  /**
   * Add feedback to meeting
   */
  public async addFeedback(
    meetingId: string,
    from: string,
    to: string,
    rating: number,
    comments: string
  ): Promise<IMeeting | null> {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      await meeting.addFeedback(
        new Types.ObjectId(from),
        new Types.ObjectId(to),
        rating,
        comments
      );

      logger.info(`Feedback added to meeting: ${meetingId}`);
      return meeting;
    } catch (error) {
      logger.error('Error adding feedback:', error);
      throw error;
    }
  }

  /**
   * Get upcoming meetings for a project
   */
  public async getUpcomingMeetings(
    projectId: string,
    limit: number = 10
  ): Promise<IMeeting[]> {
    try {
      const now = new Date();
      const meetings = await Meeting.find({
        project: projectId,
        scheduledDate: { $gt: now },
        status: 'scheduled',
      })
        .populate('milestone', 'name description dueDate')
        .populate('participants.id', 'email name role')
        .sort({ scheduledDate: 1 })
        .limit(limit)
        .exec();

      return meetings;
    } catch (error) {
      logger.error('Error getting upcoming meetings:', error);
      throw error;
    }
  }

  /**
   * Get meeting statistics for a project
   */
  public async getMeetingStatistics(projectId: string): Promise<any> {
    try {
      const meetings = await Meeting.find({ project: projectId }).exec();

      const totalMeetings = meetings.length;
      const completedMeetings = meetings.filter(
        m => m.status === 'completed'
      ).length;
      const cancelledMeetings = meetings.filter(
        m => m.status === 'cancelled'
      ).length;
      const upcomingMeetings = meetings.filter(m => m.isUpcoming()).length;

      const averageAttendance =
        meetings.length > 0
          ? meetings.reduce(
              (acc, m) => acc + (m.attendancePercentage || 0),
              0
            ) / meetings.length
          : 0;

      const averageFeedbackRating =
        meetings.length > 0
          ? meetings.reduce(
              (acc, m) => acc + (m.averageFeedbackRating || 0),
              0
            ) / meetings.length
          : 0;

      const meetingTypes = meetings.reduce((acc: Record<string, number>, m) => {
        acc[m.meetingType] = (acc[m.meetingType] || 0) + 1;
        return acc;
      }, {});

      return {
        totalMeetings,
        completedMeetings,
        cancelledMeetings,
        upcomingMeetings,
        averageAttendance: Math.round(averageAttendance * 10) / 10,
        averageFeedbackRating: Math.round(averageFeedbackRating * 10) / 10,
        meetingTypes,
      };
    } catch (error) {
      logger.error('Error getting meeting statistics:', error);
      throw error;
    }
  }

  /**
   * Schedule reminders for a meeting
   */
  private async scheduleReminders(meeting: IMeeting): Promise<void> {
    try {
      const reminderTimes = [
        { type: 'email', hours: 24 }, // 24 hours before
        { type: 'email', hours: 1 }, // 1 hour before
        { type: 'push', minutes: 15 }, // 15 minutes before
      ];

      for (const reminder of reminderTimes) {
        const scheduledFor = new Date(meeting.scheduledDate);
        if (reminder.hours) {
          scheduledFor.setHours(scheduledFor.getHours() - reminder.hours);
        } else if (reminder.minutes) {
          scheduledFor.setMinutes(scheduledFor.getMinutes() - reminder.minutes);
        }

        // Only schedule if reminder time is in the future
        if (scheduledFor > new Date()) {
          for (const participant of meeting.participants) {
            meeting.reminders.push({
              type: reminder.type as 'email' | 'push' | 'sms',
              scheduledFor,
              sent: false,
              recipient: participant.id,
            });
          }
        }
      }

      await meeting.save();
    } catch (error) {
      logger.error('Error scheduling reminders:', error);
    }
  }
}

// Export singleton instance
export const meetingService = new MeetingService();
