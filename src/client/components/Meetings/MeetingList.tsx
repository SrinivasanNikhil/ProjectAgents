import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import './MeetingList.css';

interface Meeting {
  _id: string;
  title: string;
  description: string;
  scheduledDate: string;
  duration: number;
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
  participants: Array<{
    type: 'student' | 'persona' | 'instructor';
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'invited' | 'confirmed' | 'declined' | 'attended' | 'no-show';
  }>;
  meetingRoom: {
    platform: 'zoom' | 'teams' | 'google-meet' | 'custom' | 'in-person';
    url?: string;
    roomId?: string;
    password?: string;
  };
  milestone: {
    _id: string;
    name: string;
    description: string;
  };
}

interface MeetingListProps {
  projectId: string;
  userRole: string;
  onMeetingSelect?: (meeting: Meeting) => void;
  onNewMeeting?: () => void;
}

const MeetingList: React.FC<MeetingListProps> = ({
  projectId,
  userRole,
  onMeetingSelect,
  onNewMeeting,
}) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    'all' | 'upcoming' | 'completed' | 'cancelled'
  >('all');

  useEffect(() => {
    fetchMeetings();
  }, [projectId, filter]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/meetings/project/${projectId}?status=${filter === 'all' ? '' : filter}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }

      const data = await response.json();
      setMeetings(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'status-scheduled';
      case 'in-progress':
        return 'status-in-progress';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'milestone-review':
        return '📋';
      case 'progress-check':
        return '📊';
      case 'presentation':
        return '🎤';
      case 'feedback-session':
        return '💬';
      default:
        return '📅';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getParticipantStatus = (participants: Meeting['participants']) => {
    const confirmed = participants.filter(p => p.status === 'confirmed').length;
    const total = participants.length;
    return `${confirmed}/${total} confirmed`;
  };

  const handleJoinMeeting = (meeting: Meeting) => {
    if (meeting.meetingRoom.url) {
      window.open(meeting.meetingRoom.url, '_blank');
    }
  };

  const handleStartMeeting = async (meetingId: string) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        fetchMeetings(); // Refresh the list
      }
    } catch (err) {
      console.error('Failed to start meeting:', err);
    }
  };

  const handleEndMeeting = async (meetingId: string) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        fetchMeetings(); // Refresh the list
      }
    } catch (err) {
      console.error('Failed to end meeting:', err);
    }
  };

  if (loading) {
    return (
      <div className="meeting-list-container">
        <div className="meeting-list-loading">Loading meetings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="meeting-list-container">
        <div className="meeting-list-error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="meeting-list-container">
      <div className="meeting-list-header">
        <h2>Project Meetings</h2>
        <div className="meeting-list-controls">
          <div className="meeting-filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilter('upcoming')}
            >
              Upcoming
            </button>
            <button
              className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Completed
            </button>
            <button
              className={`filter-btn ${filter === 'cancelled' ? 'active' : ''}`}
              onClick={() => setFilter('cancelled')}
            >
              Cancelled
            </button>
          </div>
          {['instructor', 'administrator'].includes(userRole) && (
            <button className="new-meeting-btn" onClick={onNewMeeting}>
              + New Meeting
            </button>
          )}
        </div>
      </div>

      {meetings.length === 0 ? (
        <div className="meeting-list-empty">
          <p>No meetings found for this project.</p>
          {['instructor', 'administrator'].includes(userRole) && (
            <button className="new-meeting-btn" onClick={onNewMeeting}>
              Schedule First Meeting
            </button>
          )}
        </div>
      ) : (
        <div className="meeting-list">
          {meetings.map(meeting => (
            <div key={meeting._id} className="meeting-card">
              <div className="meeting-header">
                <div className="meeting-type-icon">
                  {getMeetingTypeIcon(meeting.meetingType)}
                </div>
                <div className="meeting-info">
                  <h3 className="meeting-title">{meeting.title}</h3>
                  <p className="meeting-description">{meeting.description}</p>
                  <div className="meeting-meta">
                    <span className="meeting-type">
                      {meeting.meetingType.replace('-', ' ')}
                    </span>
                    <span className="meeting-milestone">
                      Milestone: {meeting.milestone.name}
                    </span>
                  </div>
                </div>
                <div
                  className={`meeting-status ${getStatusColor(meeting.status)}`}
                >
                  {meeting.status}
                </div>
              </div>

              <div className="meeting-details">
                <div className="meeting-time">
                  <strong>Date:</strong>{' '}
                  {format(new Date(meeting.scheduledDate), 'PPP')}
                  <br />
                  <strong>Time:</strong>{' '}
                  {format(new Date(meeting.scheduledDate), 'p')} (
                  {formatDuration(meeting.duration)})
                </div>
                <div className="meeting-participants">
                  <strong>Participants:</strong>{' '}
                  {getParticipantStatus(meeting.participants)}
                </div>
                <div className="meeting-platform">
                  <strong>Platform:</strong> {meeting.meetingRoom.platform}
                  {meeting.meetingRoom.roomId &&
                    ` (${meeting.meetingRoom.roomId})`}
                </div>
              </div>

              <div className="meeting-actions">
                {onMeetingSelect && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => onMeetingSelect(meeting)}
                  >
                    View Details
                  </button>
                )}

                {meeting.status === 'scheduled' && meeting.meetingRoom.url && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleJoinMeeting(meeting)}
                  >
                    Join Meeting
                  </button>
                )}

                {['instructor', 'administrator'].includes(userRole) && (
                  <>
                    {meeting.status === 'scheduled' && (
                      <button
                        className="btn btn-success"
                        onClick={() => handleStartMeeting(meeting._id)}
                      >
                        Start Meeting
                      </button>
                    )}
                    {meeting.status === 'in-progress' && (
                      <button
                        className="btn btn-warning"
                        onClick={() => handleEndMeeting(meeting._id)}
                      >
                        End Meeting
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeetingList;
