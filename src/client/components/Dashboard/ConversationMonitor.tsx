import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ConversationMonitor.css';

interface Conversation {
  _id: string;
  projectId: string;
  projectName: string;
  teamId: string;
  teamName: string;
  teamMembers: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
  personas: Array<{
    _id: string;
    name: string;
    role: string;
  }>;
  totalMessages: number;
  lastActivity: Date;
  status: 'active' | 'idle' | 'stalled' | 'completed';
  engagementScore: number;
  flags: Array<{
    type: 'inactivity' | 'conflict' | 'off-topic' | 'help-needed';
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
    description: string;
  }>;
  currentTopic?: string;
  duration: number; // in minutes
  participationRates: Record<string, number>; // userId -> participation percentage
}

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: 'student' | 'persona';
  content: string;
  timestamp: Date;
  reactions?: Array<{
    userId: string;
    emoji: string;
  }>;
  mentions?: string[];
  attachments?: Array<{
    type: 'file' | 'link' | 'image';
    url: string;
    name: string;
  }>;
}

interface ConversationMetrics {
  averageResponseTime: number;
  messageFrequency: number;
  participationBalance: number;
  sentimentScore: number;
  topicConsistency: number;
}

interface ConversationMonitorProps {
  userId: string;
  userRole: string;
}

export const ConversationMonitor: React.FC<ConversationMonitorProps> = ({
  userId,
  userRole,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [metrics, setMetrics] = useState<ConversationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'overview' | 'details' | 'intervention'>('overview');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFlag, setFilterFlag] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'lastActivity' | 'engagement' | 'flags'>('lastActivity');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [interventionMessage, setInterventionMessage] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  useEffect(() => {
    loadConversations();
    
    // Set up auto-refresh
    if (autoRefresh) {
      const interval = setInterval(loadConversations, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  useEffect(() => {
    if (selectedConversation) {
      loadConversationDetails(selectedConversation._id);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setError(null);
      const response = await axios.get('/api/dashboard/conversations', {
        params: {
          userId,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          flag: filterFlag !== 'all' ? filterFlag : undefined,
          search: searchTerm || undefined,
          sortBy,
        },
      });
      setConversations(response.data.conversations || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadConversationDetails = async (conversationId: string) => {
    try {
      const [messagesResponse, metricsResponse] = await Promise.all([
        axios.get(`/api/dashboard/conversations/${conversationId}/messages`),
        axios.get(`/api/dashboard/conversations/${conversationId}/metrics`),
      ]);
      
      setMessages(messagesResponse.data.messages || []);
      setMetrics(metricsResponse.data.metrics || null);
    } catch (err) {
      console.error('Error loading conversation details:', err);
    }
  };

  const sendIntervention = async () => {
    if (!selectedConversation || !interventionMessage.trim()) return;

    try {
      await axios.post(`/api/dashboard/conversations/${selectedConversation._id}/intervention`, {
        message: interventionMessage,
        targetStudents: selectedStudents.length > 0 ? selectedStudents : undefined,
        instructorId: userId,
      });
      
      setInterventionMessage('');
      setSelectedStudents([]);
      loadConversationDetails(selectedConversation._id);
      alert('Intervention sent successfully!');
    } catch (err) {
      console.error('Error sending intervention:', err);
      alert('Failed to send intervention');
    }
  };

  const flagConversation = async (conversationId: string, flagType: string, description: string) => {
    try {
      await axios.post(`/api/dashboard/conversations/${conversationId}/flag`, {
        type: flagType,
        description,
        instructorId: userId,
      });
      
      loadConversations();
    } catch (err) {
      console.error('Error flagging conversation:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'idle': return '🟡';
      case 'stalled': return '🔴';
      case 'completed': return '✅';
      default: return '⚪';
    }
  };

  const getFlagIcon = (flagType: string) => {
    switch (flagType) {
      case 'inactivity': return '😴';
      case 'conflict': return '⚡';
      case 'off-topic': return '🔄';
      case 'help-needed': return '🆘';
      default: return '⚠️';
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const filteredConversations = conversations.filter(conv => {
    if (filterStatus !== 'all' && conv.status !== filterStatus) return false;
    if (filterFlag !== 'all' && !conv.flags.some(flag => flag.type === filterFlag)) return false;
    if (searchTerm && !conv.teamName.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !conv.projectName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    switch (sortBy) {
      case 'lastActivity':
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      case 'engagement':
        return b.engagementScore - a.engagementScore;
      case 'flags':
        return b.flags.length - a.flags.length;
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="conversation-monitor loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conversation-monitor error">
        <div className="error-message">
          <h2>Error Loading Conversations</h2>
          <p>{error}</p>
          <button onClick={loadConversations} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-monitor">
      <div className="monitor-header">
        <div className="header-main">
          <h2>🔍 Conversation Monitor</h2>
          <p>Real-time monitoring of student conversations and AI personas</p>
        </div>
        <div className="header-controls">
          <div className="auto-refresh-toggle">
            <label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
          </div>
          <button onClick={loadConversations} className="refresh-button">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="monitor-layout">
        <div className="conversations-panel">
          <div className="panel-header">
            <h3>Active Conversations ({filteredConversations.length})</h3>
            <div className="panel-filters">
              <div className="filter-group">
                <label>Status:</label>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="idle">Idle</option>
                  <option value="stalled">Stalled</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Flags:</label>
                <select 
                  value={filterFlag} 
                  onChange={(e) => setFilterFlag(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="inactivity">Inactivity</option>
                  <option value="conflict">Conflict</option>
                  <option value="off-topic">Off Topic</option>
                  <option value="help-needed">Help Needed</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Sort:</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="lastActivity">Last Activity</option>
                  <option value="engagement">Engagement</option>
                  <option value="flags">Flags</option>
                </select>
              </div>
            </div>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search teams or projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="conversations-list">
            {sortedConversations.map(conversation => (
              <div
                key={conversation._id}
                className={`conversation-item ${selectedConversation?._id === conversation._id ? 'selected' : ''}`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="conversation-header">
                  <div className="conversation-title">
                    <span className="status-icon">{getStatusIcon(conversation.status)}</span>
                    <div className="title-text">
                      <h4>{conversation.teamName}</h4>
                      <p>{conversation.projectName}</p>
                    </div>
                  </div>
                  <div className="conversation-metrics">
                    <div 
                      className="engagement-score"
                      style={{ color: getEngagementColor(conversation.engagementScore) }}
                    >
                      {conversation.engagementScore}%
                    </div>
                  </div>
                </div>
                
                <div className="conversation-details">
                  <div className="detail-item">
                    <span className="label">Messages:</span>
                    <span className="value">{conversation.totalMessages}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Last Activity:</span>
                    <span className="value">{formatTimeAgo(conversation.lastActivity)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Duration:</span>
                    <span className="value">{Math.floor(conversation.duration / 60)}h {conversation.duration % 60}m</span>
                  </div>
                </div>

                {conversation.flags.length > 0 && (
                  <div className="conversation-flags">
                    {conversation.flags.map((flag, index) => (
                      <span 
                        key={index} 
                        className={`flag-badge ${flag.severity}`}
                        title={flag.description}
                      >
                        {getFlagIcon(flag.type)} {flag.type}
                      </span>
                    ))}
                  </div>
                )}

                <div className="conversation-participants">
                  <div className="participants-list">
                    <span className="participants-label">Team:</span>
                    {conversation.teamMembers.map(member => (
                      <span key={member._id} className="participant student">
                        {member.name}
                      </span>
                    ))}
                  </div>
                  <div className="participants-list">
                    <span className="participants-label">Personas:</span>
                    {conversation.personas.map(persona => (
                      <span key={persona._id} className="participant persona">
                        {persona.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedConversation && (
          <div className="conversation-details-panel">
            <div className="details-header">
              <h3>{selectedConversation.teamName} - {selectedConversation.projectName}</h3>
              <div className="view-switcher">
                <button
                  className={view === 'overview' ? 'active' : ''}
                  onClick={() => setView('overview')}
                >
                  Overview
                </button>
                <button
                  className={view === 'details' ? 'active' : ''}
                  onClick={() => setView('details')}
                >
                  Messages
                </button>
                <button
                  className={view === 'intervention' ? 'active' : ''}
                  onClick={() => setView('intervention')}
                >
                  Intervention
                </button>
              </div>
            </div>

            <div className="details-content">
              {view === 'overview' && (
                <div className="overview-content">
                  <div className="metrics-grid">
                    {metrics && (
                      <>
                        <div className="metric-card">
                          <h4>Response Time</h4>
                          <p>{metrics.averageResponseTime}min avg</p>
                        </div>
                        <div className="metric-card">
                          <h4>Message Frequency</h4>
                          <p>{metrics.messageFrequency}/hour</p>
                        </div>
                        <div className="metric-card">
                          <h4>Participation Balance</h4>
                          <p>{metrics.participationBalance}%</p>
                        </div>
                        <div className="metric-card">
                          <h4>Sentiment</h4>
                          <p>{metrics.sentimentScore > 0 ? '😊' : metrics.sentimentScore < 0 ? '😞' : '😐'} {Math.abs(metrics.sentimentScore * 100).toFixed(0)}%</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="participation-breakdown">
                    <h4>Participation Rates</h4>
                    <div className="participation-bars">
                      {Object.entries(selectedConversation.participationRates).map(([userId, rate]) => {
                        const member = selectedConversation.teamMembers.find(m => m._id === userId);
                        const persona = selectedConversation.personas.find(p => p._id === userId);
                        const name = member?.name || persona?.name || 'Unknown';
                        const type = member ? 'student' : 'persona';
                        
                        return (
                          <div key={userId} className="participation-bar">
                            <span className={`participant-name ${type}`}>{name}</span>
                            <div className="bar-container">
                              <div 
                                className={`bar ${type}`} 
                                style={{ width: `${rate}%` }}
                              ></div>
                            </div>
                            <span className="percentage">{rate}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {view === 'details' && (
                <div className="messages-content">
                  <div className="messages-list">
                    {messages.map(message => (
                      <div key={message._id} className={`message ${message.senderType}`}>
                        <div className="message-header">
                          <span className={`sender ${message.senderType}`}>
                            {message.senderName}
                          </span>
                          <span className="timestamp">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="message-content">
                          {message.content}
                        </div>
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="message-reactions">
                            {message.reactions.map((reaction, index) => (
                              <span key={index} className="reaction">
                                {reaction.emoji}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === 'intervention' && (
                <div className="intervention-content">
                  <div className="intervention-form">
                    <h4>Send Intervention Message</h4>
                    <div className="target-selection">
                      <label>Target Students (optional):</label>
                      <div className="students-list">
                        {selectedConversation.teamMembers.map(member => (
                          <label key={member._id} className="student-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(member._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudents([...selectedStudents, member._id]);
                                } else {
                                  setSelectedStudents(selectedStudents.filter(id => id !== member._id));
                                }
                              }}
                            />
                            {member.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="message-input">
                      <label>Intervention Message:</label>
                      <textarea
                        value={interventionMessage}
                        onChange={(e) => setInterventionMessage(e.target.value)}
                        placeholder="Enter your guidance or intervention message..."
                        rows={4}
                      />
                    </div>
                    <div className="intervention-actions">
                      <button 
                        onClick={sendIntervention}
                        disabled={!interventionMessage.trim()}
                        className="send-intervention-button"
                      >
                        Send Intervention
                      </button>
                    </div>
                  </div>

                  <div className="quick-actions">
                    <h4>Quick Actions</h4>
                    <div className="action-buttons">
                      <button 
                        onClick={() => flagConversation(selectedConversation._id, 'help-needed', 'Instructor marked as needing help')}
                        className="action-button help"
                      >
                        🆘 Flag for Help
                      </button>
                      <button 
                        onClick={() => flagConversation(selectedConversation._id, 'off-topic', 'Instructor marked as off-topic')}
                        className="action-button warning"
                      >
                        🔄 Flag Off-Topic
                      </button>
                      <button 
                        onClick={() => flagConversation(selectedConversation._id, 'conflict', 'Instructor detected conflict')}
                        className="action-button danger"
                      >
                        ⚡ Flag Conflict
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationMonitor;