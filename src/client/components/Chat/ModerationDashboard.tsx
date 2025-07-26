import React, { useState, useEffect } from 'react';
import './ModerationDashboard.css';

interface FlaggedMessage {
  messageId: string;
  flaggedBy: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'resolved';
  moderatorNotes?: string;
  action?: 'warn' | 'delete' | 'timeout' | 'none';
  createdAt: string;
  updatedAt: string;
}

interface ContentFilter {
  id: string;
  type: 'keyword' | 'regex' | 'ai';
  pattern: string;
  action: 'flag' | 'block' | 'replace';
  replacement?: string;
  severity: 'low' | 'medium' | 'high';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ModerationDashboardProps {
  authToken: string;
  onClose: () => void;
}

const ModerationDashboard: React.FC<ModerationDashboardProps> = ({
  authToken,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'flagged' | 'filters'>('flagged');
  const [flaggedMessages, setFlaggedMessages] = useState<FlaggedMessage[]>([]);
  const [contentFilters, setContentFilters] = useState<ContentFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<FlaggedMessage | null>(
    null
  );
  const [showActionModal, setShowActionModal] = useState(false);
  const [action, setAction] = useState<'warn' | 'delete' | 'timeout' | 'none'>(
    'none'
  );
  const [notes, setNotes] = useState('');

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3000';

  useEffect(() => {
    if (activeTab === 'flagged') {
      loadFlaggedMessages();
    } else {
      loadContentFilters();
    }
  }, [activeTab]);

  const loadFlaggedMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/moderation/flagged`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFlaggedMessages(data.flaggedMessages || []);
      }
    } catch (error) {
      console.error('Error loading flagged messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContentFilters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/moderation/filters`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContentFilters(data.filters || []);
      }
    } catch (error) {
      console.error('Error loading content filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAction = async () => {
    if (!selectedMessage) return;

    try {
      const response = await fetch(`${API_BASE}/api/moderation/action`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: selectedMessage.messageId,
          action,
          notes: notes.trim() || undefined,
        }),
      });

      if (response.ok) {
        setShowActionModal(false);
        setSelectedMessage(null);
        setAction('none');
        setNotes('');
        loadFlaggedMessages(); // Refresh the list
      }
    } catch (error) {
      console.error('Error taking moderation action:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return '#dc2626';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'reviewed':
        return '#3b82f6';
      case 'resolved':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="moderation-dashboard-overlay">
      <div className="moderation-dashboard">
        <div className="moderation-dashboard-header">
          <h2>Moderation Dashboard</h2>
          <button className="moderation-close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="moderation-tabs">
          <button
            className={`moderation-tab ${activeTab === 'flagged' ? 'active' : ''}`}
            onClick={() => setActiveTab('flagged')}
          >
            Flagged Messages (
            {flaggedMessages.filter(m => m.status === 'pending').length})
          </button>
          <button
            className={`moderation-tab ${activeTab === 'filters' ? 'active' : ''}`}
            onClick={() => setActiveTab('filters')}
          >
            Content Filters ({contentFilters.length})
          </button>
        </div>

        <div className="moderation-content">
          {loading ? (
            <div className="moderation-loading">
              <div className="loading-spinner"></div>
              <p>Loading...</p>
            </div>
          ) : activeTab === 'flagged' ? (
            <div className="flagged-messages-section">
              {flaggedMessages.length === 0 ? (
                <div className="empty-state">
                  <p>No flagged messages found.</p>
                </div>
              ) : (
                <div className="flagged-messages-list">
                  {flaggedMessages.map(message => (
                    <div
                      key={message.messageId}
                      className="flagged-message-item"
                    >
                      <div className="flagged-message-header">
                        <div className="flagged-message-info">
                          <span
                            className="severity-badge"
                            style={{
                              backgroundColor: getSeverityColor(
                                message.severity
                              ),
                            }}
                          >
                            {message.severity.toUpperCase()}
                          </span>
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: getStatusColor(message.status),
                            }}
                          >
                            {message.status.toUpperCase()}
                          </span>
                          <span className="flagged-date">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                        {message.status === 'pending' && (
                          <button
                            className="take-action-button"
                            onClick={() => {
                              setSelectedMessage(message);
                              setShowActionModal(true);
                            }}
                          >
                            Take Action
                          </button>
                        )}
                      </div>
                      <div className="flagged-message-content">
                        <p>
                          <strong>Reason:</strong> {message.reason}
                        </p>
                        <p>
                          <strong>Flagged by:</strong> {message.flaggedBy}
                        </p>
                        {message.moderatorNotes && (
                          <p>
                            <strong>Notes:</strong> {message.moderatorNotes}
                          </p>
                        )}
                        {message.action && (
                          <p>
                            <strong>Action taken:</strong> {message.action}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="content-filters-section">
              <div className="filters-header">
                <h3>Content Filters</h3>
                <button className="add-filter-button">Add Filter</button>
              </div>
              {contentFilters.length === 0 ? (
                <div className="empty-state">
                  <p>No content filters configured.</p>
                </div>
              ) : (
                <div className="filters-list">
                  {contentFilters.map(filter => (
                    <div key={filter.id} className="filter-item">
                      <div className="filter-header">
                        <div className="filter-info">
                          <span className="filter-type">{filter.type}</span>
                          <span
                            className="filter-severity"
                            style={{
                              backgroundColor: getSeverityColor(
                                filter.severity
                              ),
                            }}
                          >
                            {filter.severity}
                          </span>
                          <span
                            className={`filter-status ${filter.enabled ? 'enabled' : 'disabled'}`}
                          >
                            {filter.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="filter-actions">
                          <button className="edit-filter-button">Edit</button>
                          <button className="delete-filter-button">
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="filter-content">
                        <p>
                          <strong>Pattern:</strong> {filter.pattern}
                        </p>
                        <p>
                          <strong>Action:</strong> {filter.action}
                        </p>
                        {filter.replacement && (
                          <p>
                            <strong>Replacement:</strong> {filter.replacement}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Modal */}
        {showActionModal && selectedMessage && (
          <div className="action-modal-overlay">
            <div className="action-modal">
              <div className="action-modal-header">
                <h3>Take Moderation Action</h3>
                <button
                  className="action-modal-close"
                  onClick={() => setShowActionModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="action-modal-content">
                <div className="action-form-group">
                  <label htmlFor="action-select">Action:</label>
                  <select
                    id="action-select"
                    value={action}
                    onChange={e => setAction(e.target.value as any)}
                  >
                    <option value="none">No action</option>
                    <option value="warn">Warn user</option>
                    <option value="delete">Delete message</option>
                    <option value="timeout">Timeout user</option>
                  </select>
                </div>
                <div className="action-form-group">
                  <label htmlFor="action-notes">Notes (optional):</label>
                  <textarea
                    id="action-notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add notes about this action..."
                    rows={3}
                  />
                </div>
                <div className="action-modal-actions">
                  <button
                    className="action-cancel-button"
                    onClick={() => setShowActionModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="action-submit-button"
                    onClick={handleTakeAction}
                  >
                    Take Action
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModerationDashboard;
