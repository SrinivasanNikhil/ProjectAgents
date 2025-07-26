import React, { useState, useEffect } from 'react';
import {
  getNotificationHistory,
  markNotificationAsRead,
  clearNotificationHistory,
  NotificationHistoryItem,
} from '../../utils/notificationUtils';
import './NotificationHistory.css';

export interface NotificationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const NotificationHistory: React.FC<NotificationHistoryProps> = ({
  isOpen,
  onClose,
  className = '',
}) => {
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>(
    []
  );
  const [filter, setFilter] = useState<
    'all' | 'unread' | 'mentions' | 'system'
  >('all');

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = () => {
    const history = getNotificationHistory();
    setNotifications(history);
  };

  const handleMarkAsRead = (notificationId: string) => {
    markNotificationAsRead(notificationId);
    loadNotifications();
  };

  const handleMarkAllAsRead = () => {
    notifications.forEach(notification => {
      if (!notification.read) {
        markNotificationAsRead(notification.id);
      }
    });
    loadNotifications();
  };

  const handleClearHistory = () => {
    if (
      window.confirm('Are you sure you want to clear all notification history?')
    ) {
      clearNotificationHistory();
      loadNotifications();
    }
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'mentions':
        return notifications.filter(n => n.type === 'mention');
      case 'system':
        return notifications.filter(n => n.type === 'system');
      default:
        return notifications;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return '🔔';
      case 'system':
        return 'ℹ️';
      default:
        return '💬';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`notification-history-overlay ${className}`}>
      <div className="notification-history-modal">
        <div className="notification-history-header">
          <h2>Notification History</h2>
          <div className="notification-history-actions">
            <button
              className="mark-all-read-button"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>
            <button
              className="clear-history-button"
              onClick={handleClearHistory}
              disabled={notifications.length === 0}
            >
              Clear history
            </button>
            <button className="close-button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="notification-history-filters">
          <button
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={`filter-button ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            className={`filter-button ${filter === 'mentions' ? 'active' : ''}`}
            onClick={() => setFilter('mentions')}
          >
            Mentions ({notifications.filter(n => n.type === 'mention').length})
          </button>
          <button
            className={`filter-button ${filter === 'system' ? 'active' : ''}`}
            onClick={() => setFilter('system')}
          >
            System ({notifications.filter(n => n.type === 'system').length})
          </button>
        </div>

        <div className="notification-history-content">
          {filteredNotifications.length === 0 ? (
            <div className="no-notifications">
              <span className="no-notifications-icon">📭</span>
              <p>No notifications found</p>
            </div>
          ) : (
            <div className="notifications-list">
              {filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <h4 className="notification-title">
                        {notification.title}
                      </h4>
                      <span className="notification-time">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                    <p className="notification-body">{notification.body}</p>
                    {!notification.read && (
                      <button
                        className="mark-read-button"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationHistory;
