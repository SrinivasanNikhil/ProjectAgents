import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import './MeetingForm.css';

interface Milestone {
  _id: string;
  name: string;
  description: string;
  dueDate: string;
}

interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
}

interface Persona {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface MeetingFormData {
  title: string;
  description: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingType:
    | 'milestone-review'
    | 'progress-check'
    | 'presentation'
    | 'feedback-session';
  milestoneId: string;
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
    platform: 'zoom' | 'teams' | 'google-meet' | 'custom' | 'in-person';
    url?: string;
    roomId?: string;
    password?: string;
    instructions?: string;
  };
  settings: {
    allowRecording: boolean;
    requireConfirmation: boolean;
    autoRecord: boolean;
    maxParticipants: number;
    allowLateJoin: boolean;
    requireAttendance: boolean;
  };
}

interface MeetingFormProps {
  projectId: string;
  meetingId?: string;
  onSave: (meetingData: MeetingFormData) => void;
  onCancel: () => void;
  initialData?: Partial<MeetingFormData>;
}

const MeetingForm: React.FC<MeetingFormProps> = ({
  projectId,
  meetingId,
  onSave,
  onCancel,
  initialData,
}) => {
  const [formData, setFormData] = useState<MeetingFormData>({
    title: '',
    description: '',
    scheduledDate: format(new Date(), 'yyyy-MM-dd'),
    scheduledTime: format(new Date(), 'HH:mm'),
    duration: 60,
    meetingType: 'milestone-review',
    milestoneId: '',
    participants: [],
    agenda: [
      {
        title: 'Welcome and Introductions',
        description: 'Brief introductions and meeting overview',
        duration: 5,
        order: 1,
      },
    ],
    meetingRoom: {
      platform: 'zoom',
      url: '',
      roomId: '',
      password: '',
      instructions: '',
    },
    settings: {
      allowRecording: true,
      requireConfirmation: true,
      autoRecord: false,
      maxParticipants: 20,
      allowLateJoin: true,
      requireAttendance: true,
    },
  });

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!meetingId;

  useEffect(() => {
    fetchMilestones();
    fetchUsers();
    fetchPersonas();

    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        scheduledDate: initialData.scheduledDate
          ? format(new Date(initialData.scheduledDate), 'yyyy-MM-dd')
          : prev.scheduledDate,
        scheduledTime: initialData.scheduledDate
          ? format(new Date(initialData.scheduledDate), 'HH:mm')
          : prev.scheduledTime,
      }));
    }
  }, [projectId, initialData]);

  const fetchMilestones = async () => {
    try {
      const response = await fetch(`/api/milestones/project/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setMilestones(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch milestones:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/users/project/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchPersonas = async () => {
    try {
      const response = await fetch(`/api/personas/project/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setPersonas(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch personas:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Date is required';
    }

    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Time is required';
    }

    if (formData.duration < 15) {
      newErrors.duration = 'Duration must be at least 15 minutes';
    }

    if (!formData.milestoneId) {
      newErrors.milestoneId = 'Milestone is required';
    }

    if (formData.participants.length === 0) {
      newErrors.participants = 'At least one participant is required';
    }

    // Validate scheduled date is in the future
    const scheduledDateTime = new Date(
      `${formData.scheduledDate}T${formData.scheduledTime}`
    );
    if (scheduledDateTime <= new Date()) {
      newErrors.scheduledDate =
        'Meeting must be scheduled for a future date and time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const scheduledDateTime = new Date(
        `${formData.scheduledDate}T${formData.scheduledTime}`
      );

      const meetingData = {
        ...formData,
        scheduledDate: scheduledDateTime.toISOString(),
      };

      onSave(meetingData);
    } catch (error) {
      console.error('Failed to save meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const addParticipant = (
    type: 'student' | 'persona' | 'instructor',
    id: string
  ) => {
    let participant: any = null;

    if (type === 'student' || type === 'instructor') {
      participant = users.find(u => u._id === id);
      if (participant) {
        participant = {
          type,
          id: participant._id,
          name: participant.name,
          email: participant.email,
          role: participant.role,
        };
      }
    } else if (type === 'persona') {
      participant = personas.find(p => p._id === id);
      if (participant) {
        participant = {
          type,
          id: participant._id,
          name: participant.name,
          email: participant.email,
          role: participant.role,
        };
      }
    }

    if (
      participant &&
      !formData.participants.find(p => p.id === participant.id)
    ) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, participant],
      }));
    }
  };

  const removeParticipant = (participantId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.id !== participantId),
    }));
  };

  const addAgendaItem = () => {
    setFormData(prev => ({
      ...prev,
      agenda: [
        ...prev.agenda,
        {
          title: '',
          description: '',
          duration: 10,
          order: prev.agenda.length + 1,
        },
      ],
    }));
  };

  const updateAgendaItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      agenda: prev.agenda.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeAgendaItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      agenda: prev.agenda.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="meeting-form-container">
      <div className="meeting-form-header">
        <h2>{isEditing ? 'Edit Meeting' : 'Schedule New Meeting'}</h2>
        <button className="close-btn" onClick={onCancel}>
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="meeting-form">
        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="title">Meeting Title *</label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={e => handleInputChange('title', e.target.value)}
                className={errors.title ? 'error' : ''}
                placeholder="Enter meeting title"
              />
              {errors.title && (
                <span className="error-message">{errors.title}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="meetingType">Meeting Type *</label>
              <select
                id="meetingType"
                value={formData.meetingType}
                onChange={e => handleInputChange('meetingType', e.target.value)}
              >
                <option value="milestone-review">Milestone Review</option>
                <option value="progress-check">Progress Check</option>
                <option value="presentation">Presentation</option>
                <option value="feedback-session">Feedback Session</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              className={errors.description ? 'error' : ''}
              placeholder="Enter meeting description"
              rows={3}
            />
            {errors.description && (
              <span className="error-message">{errors.description}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="milestoneId">Milestone *</label>
              <select
                id="milestoneId"
                value={formData.milestoneId}
                onChange={e => handleInputChange('milestoneId', e.target.value)}
                className={errors.milestoneId ? 'error' : ''}
              >
                <option value="">Select a milestone</option>
                {milestones.map(milestone => (
                  <option key={milestone._id} value={milestone._id}>
                    {milestone.name}
                  </option>
                ))}
              </select>
              {errors.milestoneId && (
                <span className="error-message">{errors.milestoneId}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="duration">Duration (minutes) *</label>
              <input
                type="number"
                id="duration"
                value={formData.duration}
                onChange={e =>
                  handleInputChange('duration', parseInt(e.target.value))
                }
                className={errors.duration ? 'error' : ''}
                min="15"
                max="480"
              />
              {errors.duration && (
                <span className="error-message">{errors.duration}</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="scheduledDate">Date *</label>
              <input
                type="date"
                id="scheduledDate"
                value={formData.scheduledDate}
                onChange={e =>
                  handleInputChange('scheduledDate', e.target.value)
                }
                className={errors.scheduledDate ? 'error' : ''}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
              {errors.scheduledDate && (
                <span className="error-message">{errors.scheduledDate}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="scheduledTime">Time *</label>
              <input
                type="time"
                id="scheduledTime"
                value={formData.scheduledTime}
                onChange={e =>
                  handleInputChange('scheduledTime', e.target.value)
                }
                className={errors.scheduledTime ? 'error' : ''}
              />
              {errors.scheduledTime && (
                <span className="error-message">{errors.scheduledTime}</span>
              )}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Participants</h3>

          <div className="participant-selection">
            <div className="participant-type-selector">
              <select
                id="participantType"
                onChange={e => {
                  const type = e.target.value as
                    | 'student'
                    | 'persona'
                    | 'instructor';
                  const select = document.getElementById(
                    'participantSelect'
                  ) as HTMLSelectElement;
                  if (select.value) {
                    addParticipant(type, select.value);
                    select.value = '';
                  }
                }}
              >
                <option value="">Select type</option>
                <option value="student">Student</option>
                <option value="persona">Persona</option>
                <option value="instructor">Instructor</option>
              </select>

              <select
                id="participantSelect"
                onChange={e => {
                  const typeSelect = document.getElementById(
                    'participantType'
                  ) as HTMLSelectElement;
                  const type = typeSelect.value as
                    | 'student'
                    | 'persona'
                    | 'instructor';
                  if (type && e.target.value) {
                    addParticipant(type, e.target.value);
                    typeSelect.value = '';
                    e.target.value = '';
                  }
                }}
              >
                <option value="">Select participant</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </option>
                ))}
                {personas.map(persona => (
                  <option key={persona._id} value={persona._id}>
                    {persona.name} (Persona)
                  </option>
                ))}
              </select>
            </div>

            {errors.participants && (
              <span className="error-message">{errors.participants}</span>
            )}

            <div className="participants-list">
              {formData.participants.map(participant => (
                <div key={participant.id} className="participant-item">
                  <span className="participant-info">
                    <strong>{participant.name}</strong> ({participant.email})
                    <span className="participant-type">{participant.type}</span>
                  </span>
                  <button
                    type="button"
                    className="remove-participant-btn"
                    onClick={() => removeParticipant(participant.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Meeting Room</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="platform">Platform *</label>
              <select
                id="platform"
                value={formData.meetingRoom.platform}
                onChange={e =>
                  handleInputChange('meetingRoom', {
                    ...formData.meetingRoom,
                    platform: e.target.value as any,
                  })
                }
              >
                <option value="zoom">Zoom</option>
                <option value="teams">Microsoft Teams</option>
                <option value="google-meet">Google Meet</option>
                <option value="custom">Custom URL</option>
                <option value="in-person">In Person</option>
              </select>
            </div>

            {formData.meetingRoom.platform !== 'in-person' && (
              <div className="form-group">
                <label htmlFor="roomUrl">Meeting URL</label>
                <input
                  type="url"
                  id="roomUrl"
                  value={formData.meetingRoom.url || ''}
                  onChange={e =>
                    handleInputChange('meetingRoom', {
                      ...formData.meetingRoom,
                      url: e.target.value,
                    })
                  }
                  placeholder="https://..."
                />
              </div>
            )}
          </div>

          {formData.meetingRoom.platform !== 'in-person' && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="roomId">Room ID</label>
                <input
                  type="text"
                  id="roomId"
                  value={formData.meetingRoom.roomId || ''}
                  onChange={e =>
                    handleInputChange('meetingRoom', {
                      ...formData.meetingRoom,
                      roomId: e.target.value,
                    })
                  }
                  placeholder="Room ID"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="text"
                  id="password"
                  value={formData.meetingRoom.password || ''}
                  onChange={e =>
                    handleInputChange('meetingRoom', {
                      ...formData.meetingRoom,
                      password: e.target.value,
                    })
                  }
                  placeholder="Meeting password"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="instructions">Instructions</label>
            <textarea
              id="instructions"
              value={formData.meetingRoom.instructions || ''}
              onChange={e =>
                handleInputChange('meetingRoom', {
                  ...formData.meetingRoom,
                  instructions: e.target.value,
                })
              }
              placeholder="Additional instructions for participants"
              rows={3}
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Agenda</h3>

          <div className="agenda-items">
            {formData.agenda.map((item, index) => (
              <div key={index} className="agenda-item">
                <div className="agenda-item-header">
                  <span className="agenda-item-number">#{index + 1}</span>
                  <button
                    type="button"
                    className="remove-agenda-btn"
                    onClick={() => removeAgendaItem(index)}
                  >
                    ×
                  </button>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={e =>
                        updateAgendaItem(index, 'title', e.target.value)
                      }
                      placeholder="Agenda item title"
                    />
                  </div>

                  <div className="form-group">
                    <label>Duration (min)</label>
                    <input
                      type="number"
                      value={item.duration}
                      onChange={e =>
                        updateAgendaItem(
                          index,
                          'duration',
                          parseInt(e.target.value)
                        )
                      }
                      min="1"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={item.description}
                    onChange={e =>
                      updateAgendaItem(index, 'description', e.target.value)
                    }
                    placeholder="Agenda item description"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="add-agenda-btn"
            onClick={addAgendaItem}
          >
            + Add Agenda Item
          </button>
        </div>

        <div className="form-section">
          <h3>Settings</h3>

          <div className="settings-grid">
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={formData.settings.allowRecording}
                  onChange={e =>
                    handleInputChange('settings', {
                      ...formData.settings,
                      allowRecording: e.target.checked,
                    })
                  }
                />
                Allow Recording
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={formData.settings.requireConfirmation}
                  onChange={e =>
                    handleInputChange('settings', {
                      ...formData.settings,
                      requireConfirmation: e.target.checked,
                    })
                  }
                />
                Require Confirmation
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={formData.settings.autoRecord}
                  onChange={e =>
                    handleInputChange('settings', {
                      ...formData.settings,
                      autoRecord: e.target.checked,
                    })
                  }
                />
                Auto Record
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={formData.settings.allowLateJoin}
                  onChange={e =>
                    handleInputChange('settings', {
                      ...formData.settings,
                      allowLateJoin: e.target.checked,
                    })
                  }
                />
                Allow Late Join
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={formData.settings.requireAttendance}
                  onChange={e =>
                    handleInputChange('settings', {
                      ...formData.settings,
                      requireAttendance: e.target.checked,
                    })
                  }
                />
                Require Attendance
              </label>
            </div>

            <div className="setting-item">
              <label htmlFor="maxParticipants">Max Participants</label>
              <input
                type="number"
                id="maxParticipants"
                value={formData.settings.maxParticipants}
                onChange={e =>
                  handleInputChange('settings', {
                    ...formData.settings,
                    maxParticipants: parseInt(e.target.value),
                  })
                }
                min="1"
                max="100"
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? 'Saving...'
              : isEditing
                ? 'Update Meeting'
                : 'Schedule Meeting'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MeetingForm;
