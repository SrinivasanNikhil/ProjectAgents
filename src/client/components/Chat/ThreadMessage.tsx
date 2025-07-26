import React, { useState } from 'react';
import { ChatMessage } from '../../hooks/useChat';
import './ThreadMessage.css';

export interface ThreadMessageProps {
  message: ChatMessage;
  currentUserId: string;
  onReply: (messageId: string) => void;
  className?: string;
}

const ThreadMessage: React.FC<ThreadMessageProps> = ({
  message,
  currentUserId,
  onReply,
  className = '',
}) => {
  const [showActions, setShowActions] = useState(false);

  const isOwnMessage = message.userId === currentUserId;
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleReply = () => {
    onReply(message.id);
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case 'file':
        return (
          <div className="message-file">
            <div className="file-icon">📎</div>
            <div className="file-info">
              <div className="file-name">
                {message.metadata?.fileName || 'File'}
              </div>
              <div className="file-size">
                {message.metadata?.fileSize
                  ? `${(message.metadata.fileSize / 1024).toFixed(1)} KB`
                  : ''}
              </div>
            </div>
          </div>
        );

      case 'link':
        return (
          <div className="message-link">
            <div className="link-icon">🔗</div>
            <div className="link-info">
              <div className="link-title">
                {message.metadata?.linkTitle || 'Link'}
              </div>
              <div className="link-url">{message.metadata?.url || ''}</div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="message-system">
            <div className="system-icon">ℹ️</div>
            <div className="system-text">{message.message}</div>
          </div>
        );

      default:
        return <div className="message-text">{message.message}</div>;
    }
  };

  const renderUserAvatar = () => {
    if (message.isPersonaMessage) {
      return <div className="user-avatar persona">🤖</div>;
    }

    const initials = message.userEmail
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return <div className="user-avatar">{initials}</div>;
  };

  return (
    <div
      className={`thread-message-item ${isOwnMessage ? 'own-message' : 'other-message'} ${className}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isOwnMessage && (
        <div className="message-user-info">
          {renderUserAvatar()}
          <div className="user-details">
            <div className="user-name">
              {message.isPersonaMessage ? 'AI Assistant' : message.userEmail}
            </div>
            <div className="user-role">
              {message.isPersonaMessage ? 'AI' : message.userRole}
            </div>
          </div>
        </div>
      )}

      <div className="message-content">
        {renderMessageContent()}

        <div className="message-footer">
          <div className="message-timestamp">{timestamp}</div>

          {showActions && (
            <div className="message-actions">
              <button
                className="action-button reply-button"
                onClick={handleReply}
                title="Reply to this message"
              >
                <span className="action-icon">↩️</span>
                <span className="action-text">Reply</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreadMessage;
