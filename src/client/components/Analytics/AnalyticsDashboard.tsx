import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AnalyticsDashboard.css';

interface AnalyticsSummary {
  totalProjects: number;
  activeProjects: number;
  totalStudents: number;
  totalPersonas: number;
  totalConversations: number;
  averageEngagement: number;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
  }>;
}

interface ConversationAnalytics {
  totalMessages: number;
  messagesPerDay: number;
  averageResponseTime: number;
  activeParticipants: number;
  sentimentTrend: Array<{
    date: Date;
    averageSentiment: number;
  }>;
  messageTypes: {
    text: number;
    file: number;
    link: number;
    milestone: number;
    system: number;
  };
}

interface PersonaAnalytics {
  personaId: string;
  name: string;
  role: string;
  responseMetrics: {
    totalResponses: number;
    averageResponseTime: number;
    responseQuality: number;
  };
  engagementMetrics: {
    conversationsStarted: number;
    conversationsParticipated: number;
    uniqueStudentsInteracted: number;
  };
}

interface TeamPerformanceMetrics {
  projectId: string;
  projectName: string;
  teamSize: number;
  collaborationScore: number;
  communicationFrequency: number;
  milestoneProgress: {
    completed: number;
    total: number;
    onTime: number;
    overdue: number;
  };
  participationBalance: Array<{
    studentId: string;
    studentName: string;
    messageCount: number;
    participationPercentage: number;
    lastActivity: string;
  }>;
  conflictResolution: {
    totalConflicts: number;
    resolvedConflicts: number;
    averageResolutionTime: number;
  };
  insights: {
    overallHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
    recommendations: string[];
    strengths: string[];
    concerns: string[];
  };
}

interface InteractionPattern {
  timeOfDay: Array<{
    hour: number;
    messageCount: number;
  }>;
  dayOfWeek: Array<{
    day: string;
    messageCount: number;
  }>;
  responseChains: {
    averageChainLength: number;
    longestChain: number;
    quickResponses: number;
    delayedResponses: number;
  };
}

interface Project {
  _id: string;
  name: string;
  status: string;
}

interface ExportOptions {
  projectId: string;
  format: 'json' | 'csv' | 'txt';
  startDate: string;
  endDate: string;
}

interface AnalyticsDashboardProps {
  userId: string;
  userRole: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ userId, userRole }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'conversations' | 'personas' | 'teams' | 'patterns' | 'export'>('overview');
  
  // Data state
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [conversationAnalytics, setConversationAnalytics] = useState<ConversationAnalytics[]>([]);
  const [personaAnalytics, setPersonaAnalytics] = useState<PersonaAnalytics[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformanceMetrics[]>([]);
  const [interactionPatterns, setInteractionPatterns] = useState<InteractionPattern | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // Export state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    projectId: '',
    format: 'json',
    startDate: '',
    endDate: '',
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [userId]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, conversationsRes, personasRes, teamsRes, patternsRes, projectsRes] = await Promise.all([
        axios.get(`/api/analytics/summary/${userId}`),
        axios.get(`/api/analytics/conversations/summary/${userId}`),
        axios.get(`/api/analytics/personas/summary/${userId}`),
        axios.get(`/api/analytics/teams/performance/${userId}`),
        axios.get(`/api/analytics/interactions/patterns/${userId}`),
        axios.get(`/api/projects/instructor/${userId}`)
      ]);

      setSummary(summaryRes.data);
      setConversationAnalytics(conversationsRes.data.conversations || []);
      setPersonaAnalytics(personasRes.data.personas || []);
      setTeamPerformance(teamsRes.data.teams || []);
      setInteractionPatterns(patternsRes.data);
      setProjects(projectsRes.data?.projects || []);

      // Set default project if available
      if (projectsRes.data?.projects?.length > 0 && !exportOptions.projectId) {
        setExportOptions(prev => ({
          ...prev,
          projectId: projectsRes.data.projects[0]._id,
        }));
      }

    } catch (err: any) {
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportConversationLogs = async () => {
    if (!exportOptions.projectId) {
      setExportError('Please select a project');
      return;
    }

    try {
      setIsExporting(true);
      setExportError(null);

      // Build query parameters
      const params = new URLSearchParams({
        format: exportOptions.format,
      });

      if (exportOptions.startDate) {
        params.append('startDate', new Date(exportOptions.startDate).toISOString());
      }
      if (exportOptions.endDate) {
        params.append('endDate', new Date(exportOptions.endDate).toISOString());
      }

      // Make request to export endpoint
      const response = await axios.get(
        `/api/analytics/export/${exportOptions.projectId}?${params.toString()}`,
        {
          responseType: 'blob', // Important for file downloads
          headers: {
            'Accept': getContentType(exportOptions.format),
          },
        }
      );

      // Create blob and download file
      const blob = new Blob([response.data], { 
        type: getContentType(exportOptions.format) 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const project = projects.find(p => p._id === exportOptions.projectId);
      const projectName = project?.name || 'project';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `conversation-logs-${projectName}-${timestamp}.${exportOptions.format}`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

    } catch (err: any) {
      console.error('Export error:', err);
      setExportError(
        err.response?.data?.message || 
        'Failed to export conversation logs. Please try again.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const getContentType = (format: string): string => {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'txt':
        return 'text/plain';
      default:
        return 'application/json';
    }
  };

  const renderExportSection = () => (
    <div className="export-section">
      <h3>Export Conversation Logs</h3>
      <div className="export-controls">
        <div className="export-form">
          <div className="form-group">
            <label htmlFor="project-select">Project:</label>
            <select
              id="project-select"
              value={exportOptions.projectId}
              onChange={(e) => setExportOptions(prev => ({ ...prev, projectId: e.target.value }))}
              className="form-control"
            >
              <option value="">Select a project</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>
                  {project.name} ({project.status})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="format-select">Format:</label>
            <select
              id="format-select"
              value={exportOptions.format}
              onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as 'json' | 'csv' | 'txt' }))}
              className="form-control"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="txt">Text</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="start-date">Start Date (optional):</label>
            <input
              type="date"
              id="start-date"
              value={exportOptions.startDate}
              onChange={(e) => setExportOptions(prev => ({ ...prev, startDate: e.target.value }))}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="end-date">End Date (optional):</label>
            <input
              type="date"
              id="end-date"
              value={exportOptions.endDate}
              onChange={(e) => setExportOptions(prev => ({ ...prev, endDate: e.target.value }))}
              className="form-control"
              min={exportOptions.startDate}
            />
          </div>

          <div className="export-actions">
            <button
              onClick={handleExportConversationLogs}
              disabled={isExporting || !exportOptions.projectId}
              className="export-button primary"
            >
              {isExporting ? (
                <>
                  <span className="spinner"></span>
                  Exporting...
                </>
              ) : (
                <>
                  📥 Export Conversation Logs
                </>
              )}
            </button>
          </div>

          {exportError && (
            <div className="export-error">
              <span className="error-icon">⚠️</span>
              {exportError}
            </div>
          )}
        </div>

        <div className="export-info">
          <h4>Export Information</h4>
          <div className="info-section">
            <h5>Available Formats:</h5>
            <ul>
              <li><strong>JSON:</strong> Structured data with all message metadata</li>
              <li><strong>CSV:</strong> Spreadsheet-compatible format with key fields</li>
              <li><strong>TXT:</strong> Human-readable conversation logs</li>
            </ul>
          </div>
          <div className="info-section">
            <h5>Date Range:</h5>
            <p>Leave date fields empty to export all conversation data for the selected project. Use specific dates to filter the export to a particular time period.</p>
          </div>
          <div className="info-section">
            <h5>Privacy Notice:</h5>
            <p>Exported data includes all conversation messages, participant information, and metadata. Please handle exported files according to your institution's data privacy policies.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="analytics-overview">
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <h3>{summary?.totalProjects || 0}</h3>
            <p>Total Projects</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <h3>{summary?.totalStudents || 0}</h3>
            <p>Students</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">🤖</div>
          <div className="metric-content">
            <h3>{summary?.totalPersonas || 0}</h3>
            <p>AI Personas</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">💬</div>
          <div className="metric-content">
            <h3>{summary?.totalConversations || 0}</h3>
            <p>Conversations</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-content">
            <h3>{summary ? (summary.averageEngagement * 100).toFixed(1) : 0}%</h3>
            <p>Avg Engagement</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>{summary?.activeProjects || 0}</h3>
            <p>Active Projects</p>
          </div>
        </div>
      </div>

      <div className="overview-charts">
        <div className="chart-section">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {summary?.recentActivity?.slice(0, 10).map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-type">{activity.type}</div>
                <div className="activity-description">{activity.description}</div>
                <div className="activity-time">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </div>
              </div>
            )) || <div className="no-data">No recent activity</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderConversationAnalytics = () => (
    <div className="conversation-analytics">
      <h3>Conversation Analytics</h3>
      <div className="analytics-grid">
        {conversationAnalytics.map((conv, index) => (
          <div key={index} className="analytics-card">
            <h4>Conversation {index + 1}</h4>
            <div className="metrics">
              <div className="metric">
                <span className="label">Total Messages:</span>
                <span className="value">{conv.totalMessages}</span>
              </div>
              <div className="metric">
                <span className="label">Messages/Day:</span>
                <span className="value">{conv.messagesPerDay.toFixed(1)}</span>
              </div>
              <div className="metric">
                <span className="label">Avg Response Time:</span>
                <span className="value">{conv.averageResponseTime.toFixed(1)}min</span>
              </div>
              <div className="metric">
                <span className="label">Active Participants:</span>
                <span className="value">{conv.activeParticipants}</span>
              </div>
            </div>
            
            <div className="message-types">
              <h5>Message Types</h5>
              <div className="type-bars">
                <div className="type-bar">
                  <span>Text: {conv.messageTypes.text}</span>
                  <div className="bar">
                    <div 
                      className="fill text" 
                      style={{ width: `${(conv.messageTypes.text / conv.totalMessages) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="type-bar">
                  <span>Files: {conv.messageTypes.file}</span>
                  <div className="bar">
                    <div 
                      className="fill file" 
                      style={{ width: `${(conv.messageTypes.file / conv.totalMessages) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="type-bar">
                  <span>Links: {conv.messageTypes.link}</span>
                  <div className="bar">
                    <div 
                      className="fill link" 
                      style={{ width: `${(conv.messageTypes.link / conv.totalMessages) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPersonaAnalytics = () => (
    <div className="persona-analytics">
      <h3>Persona Performance</h3>
      <div className="personas-grid">
        {personaAnalytics.map((persona) => (
          <div key={persona.personaId} className="persona-card">
            <div className="persona-header">
              <h4>{persona.name}</h4>
              <span className="persona-role">{persona.role}</span>
            </div>
            
            <div className="persona-metrics">
              <div className="metric-section">
                <h5>Response Metrics</h5>
                <div className="metric">
                  <span>Total Responses:</span>
                  <span>{persona.responseMetrics.totalResponses}</span>
                </div>
                <div className="metric">
                  <span>Avg Response Time:</span>
                  <span>{persona.responseMetrics.averageResponseTime.toFixed(1)}min</span>
                </div>
                <div className="metric">
                  <span>Quality Score:</span>
                  <span className={`quality-score ${getQualityClass(persona.responseMetrics.responseQuality)}`}>
                    {persona.responseMetrics.responseQuality.toFixed(1)}/10
                  </span>
                </div>
              </div>

              <div className="metric-section">
                <h5>Engagement Metrics</h5>
                <div className="metric">
                  <span>Conversations Started:</span>
                  <span>{persona.engagementMetrics.conversationsStarted}</span>
                </div>
                <div className="metric">
                  <span>Conversations Participated:</span>
                  <span>{persona.engagementMetrics.conversationsParticipated}</span>
                </div>
                <div className="metric">
                  <span>Unique Students:</span>
                  <span>{persona.engagementMetrics.uniqueStudentsInteracted}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTeamPerformance = () => (
    <div className="team-performance">
      <h3>Team Performance Metrics</h3>
      <div className="teams-grid">
        {teamPerformance.map((team) => (
          <div key={team.projectId} className="team-card">
            <div className="team-header">
              <h4>{team.projectName}</h4>
              <span className="team-size">{team.teamSize} members</span>
            </div>
            
            <div className="performance-metrics">
              <div className="metric">
                <span className="label">Collaboration Score:</span>
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ width: `${team.collaborationScore}%` }}
                  ></div>
                  <span className="score-value">{team.collaborationScore.toFixed(1)}%</span>
                </div>
              </div>

              <div className="metric">
                <span className="label">Communication Frequency:</span>
                <span className="value">{team.communicationFrequency.toFixed(1)} msg/day</span>
              </div>

              <div className="milestone-progress">
                <h5>Milestone Progress</h5>
                <div className="progress-stats">
                  <div className="stat completed">
                    <span>✅ Completed: {team.milestoneProgress.completed}</span>
                  </div>
                  <div className="stat total">
                    <span>📋 Total: {team.milestoneProgress.total}</span>
                  </div>
                  <div className="stat ontime">
                    <span>⏰ On Time: {team.milestoneProgress.onTime}</span>
                  </div>
                  <div className="stat overdue">
                    <span>⚠️ Overdue: {team.milestoneProgress.overdue}</span>
                  </div>
                </div>
              </div>

              <div className="conflict-resolution">
                <h5>Conflict Resolution</h5>
                <div className="conflict-stats">
                  <div className="stat total-conflicts">
                    <span>🔥 Total Conflicts: {team.conflictResolution.totalConflicts}</span>
                  </div>
                  <div className="stat resolved-conflicts">
                    <span>✅ Resolved: {team.conflictResolution.resolvedConflicts}</span>
                  </div>
                  <div className="stat resolution-rate">
                    <span>📊 Resolution Rate: {
                      team.conflictResolution.totalConflicts > 0 
                        ? Math.round((team.conflictResolution.resolvedConflicts / team.conflictResolution.totalConflicts) * 100)
                        : 100
                    }%</span>
                  </div>
                  <div className="stat avg-resolution-time">
                    <span>⏱️ Avg Resolution: {team.conflictResolution.averageResolutionTime}h</span>
                  </div>
                </div>
              </div>

              <div className="team-insights">
                <h5>Team Health Insights</h5>
                <div className={`health-indicator ${team.insights.overallHealth}`}>
                  <span className="health-label">Overall Health:</span>
                  <span className="health-value">
                    {team.insights.overallHealth.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {team.insights.strengths.length > 0 && (
                  <div className="insights-section strengths">
                    <h6>✅ Strengths</h6>
                    <ul>
                      {team.insights.strengths.map((strength, index) => (
                        <li key={index}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {team.insights.concerns.length > 0 && (
                  <div className="insights-section concerns">
                    <h6>⚠️ Concerns</h6>
                    <ul>
                      {team.insights.concerns.map((concern, index) => (
                        <li key={index}>{concern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {team.insights.recommendations.length > 0 && (
                  <div className="insights-section recommendations">
                    <h6>💡 Recommendations</h6>
                    <ul>
                      {team.insights.recommendations.map((recommendation, index) => (
                        <li key={index}>{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderInteractionPatterns = () => (
    <div className="interaction-patterns">
      <h3>Interaction Patterns</h3>
      {interactionPatterns && (
        <div className="patterns-grid">
          <div className="pattern-card">
            <h4>Activity by Time of Day</h4>
            <div className="time-chart">
              {interactionPatterns.timeOfDay.map((timeData) => (
                <div key={timeData.hour} className="time-bar">
                  <div className="hour-label">{timeData.hour}:00</div>
                  <div className="bar">
                    <div 
                      className="fill" 
                      style={{ 
                        height: `${(timeData.messageCount / Math.max(...interactionPatterns.timeOfDay.map(t => t.messageCount))) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="count">{timeData.messageCount}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pattern-card">
            <h4>Activity by Day of Week</h4>
            <div className="day-chart">
              {interactionPatterns.dayOfWeek.map((dayData) => (
                <div key={dayData.day} className="day-bar">
                  <div className="day-label">{dayData.day}</div>
                  <div className="bar">
                    <div 
                      className="fill" 
                      style={{ 
                        height: `${(dayData.messageCount / Math.max(...interactionPatterns.dayOfWeek.map(d => d.messageCount))) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="count">{dayData.messageCount}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pattern-card">
            <h4>Response Patterns</h4>
            <div className="response-metrics">
              <div className="metric">
                <span>Average Chain Length:</span>
                <span>{interactionPatterns.responseChains.averageChainLength.toFixed(1)}</span>
              </div>
              <div className="metric">
                <span>Longest Chain:</span>
                <span>{interactionPatterns.responseChains.longestChain}</span>
              </div>
              <div className="metric">
                <span>Quick Responses (&lt;5min):</span>
                <span>{interactionPatterns.responseChains.quickResponses}</span>
              </div>
              <div className="metric">
                <span>Delayed Responses (&gt;2hr):</span>
                <span>{interactionPatterns.responseChains.delayedResponses}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const getQualityClass = (score: number): string => {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'average';
    return 'poor';
  };

  if (loading) {
    return (
      <div className="analytics-dashboard loading">
        <div className="loading-spinner" role="progressbar" aria-label="Loading analytics data"></div>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-dashboard error">
        <div className="error-message">
          <h3>Error Loading Analytics</h3>
          <p>{error}</p>
          <button onClick={loadAnalyticsData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>Analytics Dashboard</h2>
        <div className="view-tabs">
          <button 
            className={`tab ${activeView === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeView === 'conversations' ? 'active' : ''}`}
            onClick={() => setActiveView('conversations')}
          >
            Conversations
          </button>
          <button 
            className={`tab ${activeView === 'personas' ? 'active' : ''}`}
            onClick={() => setActiveView('personas')}
          >
            Personas
          </button>
          <button 
            className={`tab ${activeView === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveView('teams')}
          >
            Teams
          </button>
          <button 
            className={`tab ${activeView === 'patterns' ? 'active' : ''}`}
            onClick={() => setActiveView('patterns')}
          >
            Patterns
          </button>
          <button 
            className={`tab ${activeView === 'export' ? 'active' : ''}`}
            onClick={() => setActiveView('export')}
          >
            Export
          </button>
        </div>
        <button onClick={loadAnalyticsData} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      <div className="analytics-content">
        {activeView === 'overview' && renderOverview()}
        {activeView === 'conversations' && renderConversationAnalytics()}
        {activeView === 'personas' && renderPersonaAnalytics()}
        {activeView === 'teams' && renderTeamPerformance()}
        {activeView === 'patterns' && renderInteractionPatterns()}
        {activeView === 'export' && renderExportSection()}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;