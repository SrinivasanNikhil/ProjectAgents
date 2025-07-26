import React from 'react';
import './MessageStatus.css';

export type MessageStatus =
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface MessageStatusProps {
  status: MessageStatus;
  timestamp?: string;
  readBy?: string[];
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const MessageStatus: React.FC<MessageStatusProps> = ({
  status,
  timestamp,
  readBy = [],
  className = '',
  size = 'medium',
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return (
          <div className="message-status__icon message-status__icon--sending">
            <div className="message-status__spinner"></div>
          </div>
        );
      case 'sent':
        return (
          <div className="message-status__icon message-status__icon--sent">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
        );
      case 'delivered':
        return (
          <div className="message-status__icon message-status__icon--delivered">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
        );
      case 'read':
        return (
          <div className="message-status__icon message-status__icon--read">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="message-status__icon message-status__icon--failed">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return readBy.length > 0 ? `Read by ${readBy.length}` : 'Read';
      case 'failed':
        return 'Failed to send';
      default:
        return '';
    }
  };

  const getReadByTooltip = () => {
    if (readBy.length === 0) return '';
    return `Read by: ${readBy.join(', ')}`;
  };

  return (
    <div
      className={`message-status message-status--${size} ${className}`}
      title={getReadByTooltip()}
    >
      {getStatusIcon()}
      {timestamp && (
        <span className="message-status__timestamp">
          {new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      )}
      {status === 'failed' && (
        <span className="message-status__text">{getStatusText()}</span>
      )}
    </div>
  );
};

export default MessageStatus;
