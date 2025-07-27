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

interface AnalyticsDashboardProps {
  userId: string;
  userRole: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ userId, userRole }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'conversations' | 'personas' | 'teams' | 'patterns'>('overview');
  
  // Data state
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [conversationAnalytics, setConversationAnalytics] = useState<ConversationAnalytics[]>([]);
  const [personaAnalytics, setPersonaAnalytics] = useState<PersonaAnalytics[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformanceMetrics[]>([]);
  const [interactionPatterns, setInteractionPatterns] = useState<InteractionPattern | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [userId]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, conversationsRes, personasRes, teamsRes, patternsRes] = await Promise.all([
        axios.get(`/api/analytics/summary/${userId}`),
        axios.get(`/api/analytics/conversations/summary/${userId}`),
        axios.get(`/api/analytics/personas/summary/${userId}`),
        axios.get(`/api/analytics/teams/performance/${userId}`),
        axios.get(`/api/analytics/interactions/patterns/${userId}`)
      ]);

      setSummary(summaryRes.data);
      setConversationAnalytics(conversationsRes.data.conversations || []);
      setPersonaAnalytics(personasRes.data.personas || []);
      setTeamPerformance(teamsRes.data.teams || []);
      setInteractionPatterns(patternsRes.data);

    } catch (err: any) {
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

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
      </div>
    </div>
  );
};

export default AnalyticsDashboard;