import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './InstructorInterventionTools.css';

interface InterventionAlert {
  _id: string;
  type: 'inactivity' | 'conflict' | 'confusion' | 'off-topic' | 'stuck' | 'disengagement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  conversationId: string;
  projectId: string;
  projectName: string;
  teamName: string;
  description: string;
  timestamp: Date;
  status: 'new' | 'acknowledged' | 'resolved' | 'dismissed';
  context: {
    messageCount: number;
    silenceDuration: number;
    sentimentScore: number;
    participationRates: Record<string, number>;
    lastMessages: string[];
  };
}

interface InterventionTemplate {
  _id: string;
  name: string;
  category: 'guidance' | 'redirection' | 'encouragement' | 'clarification' | 'feedback';
  content: string;
  variables: string[];
  useCase: string;
  isActive: boolean;
}

interface PersonaAdjustment {
  personaId: string;
  adjustmentType: 'personality' | 'engagement' | 'response_style' | 'expertise_level';
  originalValue: string | number;
  newValue: string | number;
  reason: string;
  timestamp: Date;
  duration?: number; // minutes, undefined for permanent
}

interface TeamIntervention {
  teamId: string;
  teamName: string;
  projectName: string;
  interventionType: 'message' | 'persona_adjustment' | 'milestone_reminder' | 'resource_share' | 'meeting_schedule';
  content: string;
  targetStudents?: string[];
  scheduledFor?: Date;
  status: 'pending' | 'sent' | 'acknowledged' | 'completed';
  createdAt: Date;
}

interface InstructorInterventionToolsProps {
  userId: string;
  userRole: string;
}

const InstructorInterventionTools: React.FC<InstructorInterventionToolsProps> = ({
  userId,
  userRole
}) => {
  const [alerts, setAlerts] = useState<InterventionAlert[]>([]);
  const [templates, setTemplates] = useState<InterventionTemplate[]>([]);
  const [recentInterventions, setRecentInterventions] = useState<TeamIntervention[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<InterventionAlert | null>(null);
  const [interventionMode, setInterventionMode] = useState<'direct' | 'persona' | 'scheduled'>('direct');
  const [activeTab, setActiveTab] = useState<'alerts' | 'templates' | 'history' | 'analytics'>('alerts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [interventionMessage, setInterventionMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [targetStudents, setTargetStudents] = useState<string[]>([]);
  const [personaAdjustments, setPersonaAdjustments] = useState<PersonaAdjustment[]>([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadInterventionData();
    
    if (autoRefresh) {
      const interval = setInterval(loadInterventionData, 15000); // Check every 15 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadInterventionData = async () => {
    try {
      setError(null);
      const [alertsResponse, templatesResponse, historyResponse] = await Promise.all([
        axios.get(`/api/interventions/alerts/${userId}`),
        axios.get(`/api/interventions/templates`),
        axios.get(`/api/interventions/history/${userId}`)
      ]);

      setAlerts(alertsResponse.data.alerts || []);
      setTemplates(templatesResponse.data.templates || []);
      setRecentInterventions(historyResponse.data.interventions || []);
    } catch (err) {
      console.error('Error loading intervention data:', err);
      setError('Failed to load intervention data');
    } finally {
      setLoading(false);
    }
  };

  const sendDirectIntervention = async () => {
    if (!selectedAlert || !interventionMessage.trim()) return;

    try {
      await axios.post('/api/interventions/send', {
        alertId: selectedAlert._id,
        conversationId: selectedAlert.conversationId,
        message: interventionMessage,
        targetStudents: targetStudents.length > 0 ? targetStudents : undefined,
        instructorId: userId,
        type: 'direct_message'
      });

      // Update alert status
      await axios.patch(`/api/interventions/alerts/${selectedAlert._id}`, {
        status: 'acknowledged'
      });

      setInterventionMessage('');
      setTargetStudents([]);
      setSelectedAlert(null);
      loadInterventionData();
      
      alert('Intervention sent successfully!');
    } catch (err) {
      console.error('Error sending intervention:', err);
      alert('Failed to send intervention');
    }
  };

  const adjustPersona = async (personaId: string, adjustmentType: string, newValue: any, reason: string, duration?: number) => {
    try {
      await axios.post('/api/interventions/persona-adjust', {
        personaId,
        adjustmentType,
        newValue,
        reason,
        duration,
        instructorId: userId,
        conversationId: selectedAlert?.conversationId
      });

      loadInterventionData();
      alert('Persona adjustment applied successfully!');
    } catch (err) {
      console.error('Error adjusting persona:', err);
      alert('Failed to adjust persona');
    }
  };

  const scheduleIntervention = async () => {
    if (!selectedAlert || !interventionMessage.trim() || !scheduleDate) return;

    try {
      await axios.post('/api/interventions/schedule', {
        alertId: selectedAlert._id,
        conversationId: selectedAlert.conversationId,
        message: interventionMessage,
        scheduledFor: new Date(scheduleDate),
        targetStudents: targetStudents.length > 0 ? targetStudents : undefined,
        instructorId: userId
      });

      setInterventionMessage('');
      setTargetStudents([]);
      setScheduleDate('');
      setSelectedAlert(null);
      loadInterventionData();
      
      alert('Intervention scheduled successfully!');
    } catch (err) {
      console.error('Error scheduling intervention:', err);
      alert('Failed to schedule intervention');
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await axios.patch(`/api/interventions/alerts/${alertId}`, {
        status: 'dismissed'
      });
      loadInterventionData();
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await axios.patch(`/api/interventions/alerts/${alertId}`, {
        status: 'resolved'
      });
      loadInterventionData();
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const useTemplate = (template: InterventionTemplate) => {
    setInterventionMessage(template.content);
    setSelectedTemplate(template._id);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'inactivity': return '😴';
      case 'conflict': return '⚡';
      case 'confusion': return '❓';
      case 'off-topic': return '🔄';
      case 'stuck': return '🚧';
      case 'disengagement': return '📉';
      default: return '⚠️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="intervention-tools loading">
        <div className="loading-spinner">Loading intervention tools...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="intervention-tools error">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={loadInterventionData}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="intervention-tools">
      <div className="intervention-header">
        <div className="header-main">
          <h2>🛠️ Instructor Intervention Tools</h2>
          <p>Monitor and intervene in student conversations to provide guidance and support</p>
        </div>
        <div className="header-controls">
          <div className="auto-refresh-toggle">
            <label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh alerts
            </label>
          </div>
          <button onClick={loadInterventionData} className="refresh-button">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="intervention-tabs">
        <button
          className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          🚨 Alerts ({alerts.filter(a => a.status === 'new').length})
        </button>
        <button
          className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          📝 Templates ({templates.length})
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📚 History ({recentInterventions.length})
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
      </div>

      <div className="intervention-content">
        {activeTab === 'alerts' && (
          <div className="alerts-section">
            <div className="alerts-list">
              <h3>Active Intervention Alerts</h3>
              {alerts.filter(alert => alert.status === 'new').length === 0 ? (
                <div className="empty-state">
                  <p>🎉 No active alerts. All conversations are running smoothly!</p>
                </div>
              ) : (
                alerts.filter(alert => alert.status === 'new').map(alert => (
                  <div key={alert._id} className="alert-item">
                    <div className="alert-header">
                      <div className="alert-info">
                        <span className="alert-icon">{getAlertIcon(alert.type)}</span>
                        <div className="alert-details">
                          <h4>{alert.teamName} - {alert.projectName}</h4>
                          <p className="alert-description">{alert.description}</p>
                        </div>
                      </div>
                      <div className="alert-meta">
                        <span 
                          className="severity-badge"
                          style={{ backgroundColor: getSeverityColor(alert.severity) }}
                        >
                          {alert.severity}
                        </span>
                        <span className="alert-time">{formatTimeAgo(alert.timestamp)}</span>
                      </div>
                    </div>
                    
                    <div className="alert-context">
                      <div className="context-stats">
                        <span>Messages: {alert.context.messageCount}</span>
                        <span>Silence: {Math.floor(alert.context.silenceDuration / 60)}h {alert.context.silenceDuration % 60}m</span>
                        <span>Sentiment: {(alert.context.sentimentScore * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="alert-actions">
                      <button 
                        onClick={() => setSelectedAlert(alert)}
                        className="action-button primary"
                      >
                        📤 Intervene
                      </button>
                      <button 
                        onClick={() => dismissAlert(alert._id)}
                        className="action-button secondary"
                      >
                        ⏭️ Dismiss
                      </button>
                      <button 
                        onClick={() => resolveAlert(alert._id)}
                        className="action-button success"
                      >
                        ✅ Resolve
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedAlert && (
              <div className="intervention-panel">
                <h3>Intervention for {selectedAlert.teamName}</h3>
                
                <div className="intervention-mode-selector">
                  <label>
                    <input
                      type="radio"
                      name="interventionMode"
                      value="direct"
                      checked={interventionMode === 'direct'}
                      onChange={(e) => setInterventionMode(e.target.value as any)}
                    />
                    Direct Message
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="interventionMode"
                      value="persona"
                      checked={interventionMode === 'persona'}
                      onChange={(e) => setInterventionMode(e.target.value as any)}
                    />
                    Persona Adjustment
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="interventionMode"
                      value="scheduled"
                      checked={interventionMode === 'scheduled'}
                      onChange={(e) => setInterventionMode(e.target.value as any)}
                    />
                    Scheduled Message
                  </label>
                </div>

                {interventionMode === 'direct' && (
                  <div className="direct-intervention">
                    <div className="template-selector">
                      <label>Use Template:</label>
                      <select 
                        value={selectedTemplate}
                        onChange={(e) => {
                          const template = templates.find(t => t._id === e.target.value);
                          if (template) useTemplate(template);
                        }}
                      >
                        <option value="">Select a template...</option>
                        {templates.map(template => (
                          <option key={template._id} value={template._id}>
                            {template.name} ({template.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="message-composer">
                      <label>Intervention Message:</label>
                      <textarea
                        value={interventionMessage}
                        onChange={(e) => setInterventionMessage(e.target.value)}
                        placeholder="Type your intervention message here..."
                        rows={4}
                      />
                    </div>

                    <div className="student-selector">
                      <label>Target Specific Students (optional):</label>
                      <div className="students-list">
                        {/* This would be populated with actual team members */}
                        <label>
                          <input type="checkbox" />
                          All team members
                        </label>
                      </div>
                    </div>

                    <button 
                      onClick={sendDirectIntervention}
                      disabled={!interventionMessage.trim()}
                      className="send-intervention-button"
                    >
                      Send Intervention
                    </button>
                  </div>
                )}

                {interventionMode === 'persona' && (
                  <div className="persona-intervention">
                    <h4>Adjust AI Persona Behavior</h4>
                    <div className="persona-adjustments">
                      <div className="adjustment-option">
                        <label>Increase Engagement Level</label>
                        <button onClick={() => adjustPersona('persona-id', 'engagement', 0.8, 'Boost team engagement', 30)}>
                          Apply (+30min)
                        </button>
                      </div>
                      <div className="adjustment-option">
                        <label>More Proactive Guidance</label>
                        <button onClick={() => adjustPersona('persona-id', 'response_style', 'proactive', 'Provide more guidance', 60)}>
                          Apply (+1hr)
                        </button>
                      </div>
                      <div className="adjustment-option">
                        <label>Simplify Explanations</label>
                        <button onClick={() => adjustPersona('persona-id', 'expertise_level', 'beginner', 'Reduce complexity')}>
                          Apply (Permanent)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {interventionMode === 'scheduled' && (
                  <div className="scheduled-intervention">
                    <div className="schedule-datetime">
                      <label>Schedule for:</label>
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                      />
                    </div>

                    <div className="message-composer">
                      <label>Scheduled Message:</label>
                      <textarea
                        value={interventionMessage}
                        onChange={(e) => setInterventionMessage(e.target.value)}
                        placeholder="Message to be sent at scheduled time..."
                        rows={4}
                      />
                    </div>

                    <button 
                      onClick={scheduleIntervention}
                      disabled={!interventionMessage.trim() || !scheduleDate}
                      className="schedule-intervention-button"
                    >
                      Schedule Intervention
                    </button>
                  </div>
                )}

                <button 
                  onClick={() => setSelectedAlert(null)}
                  className="close-panel-button"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="templates-section">
            <div className="templates-header">
              <h3>Intervention Templates</h3>
              <button className="create-template-button">+ Create Template</button>
            </div>
            <div className="templates-grid">
              {templates.map(template => (
                <div key={template._id} className="template-card">
                  <div className="template-header">
                    <h4>{template.name}</h4>
                    <span className="template-category">{template.category}</span>
                  </div>
                  <p className="template-content">{template.content}</p>
                  <p className="template-use-case">Use case: {template.useCase}</p>
                  <div className="template-actions">
                    <button onClick={() => useTemplate(template)}>Use Template</button>
                    <button>Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            <h3>Recent Interventions</h3>
            <div className="interventions-list">
              {recentInterventions.map(intervention => (
                <div key={intervention.teamId + intervention.createdAt} className="intervention-item">
                  <div className="intervention-info">
                    <h4>{intervention.teamName} - {intervention.projectName}</h4>
                    <p>{intervention.content}</p>
                    <span className="intervention-type">{intervention.interventionType}</span>
                  </div>
                  <div className="intervention-meta">
                    <span className={`status ${intervention.status}`}>{intervention.status}</span>
                    <span className="timestamp">{formatTimeAgo(intervention.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-section">
            <h3>Intervention Analytics</h3>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h4>Total Interventions</h4>
                <p className="analytics-value">{recentInterventions.length}</p>
              </div>
              <div className="analytics-card">
                <h4>Success Rate</h4>
                <p className="analytics-value">
                  {recentInterventions.length > 0 
                    ? Math.round((recentInterventions.filter(i => i.status === 'completed').length / recentInterventions.length) * 100)
                    : 0}%
                </p>
              </div>
              <div className="analytics-card">
                <h4>Active Alerts</h4>
                <p className="analytics-value">{alerts.filter(a => a.status === 'new').length}</p>
              </div>
              <div className="analytics-card">
                <h4>Avg Response Time</h4>
                <p className="analytics-value">~15min</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorInterventionTools;