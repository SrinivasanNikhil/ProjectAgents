import React, { useEffect, useRef, useState } from 'react';
import { WebSocketMessage } from '../../hooks/useWebSocket';
import {
  getPlatformType,
  getPlatformConfig,
  extractUrlInfo,
} from '../../utils/linkUtils';
import MessageFlagButton from './MessageFlagButton';
import './MessageList.css';

export interface MessageListProps {
  messages: WebSocketMessage[];
  currentUser: {
    id: string;
    email: string;
    role: string;
  };
  typingUsers: string[];
  onScrollToBottom?: () => void;
  onReplyToMessage?: (messageId: string) => void;
  onFlagMessage?: (
    messageId: string,
    reason: string,
    severity: 'low' | 'medium' | 'high'
  ) => Promise<void>;
  className?: string;
  authToken?: string;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  typingUsers,
  onScrollToBottom,
  onReplyToMessage,
  onFlagMessage,
  className = '',
  authToken,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(
    new Set()
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('zip') || fileType.includes('compressed'))
      return '📦';
    if (fileType.includes('text')) return '📄';
    return '📎';
  };

  const isOwnMessage = (message: WebSocketMessage) => {
    return message.userId === currentUser.id;
  };

  const getMessageTypeClass = (message: WebSocketMessage) => {
    if (message.isPersonaMessage) return 'persona-message';
    if (message.type === 'system') return 'system-message';
    if (message.type === 'file') return 'file-message';
    if (message.type === 'link') return 'link-message';
    return 'text-message';
  };

  const handleFileDownload = async (artifactId: string, fileName: string) => {
    if (!authToken || downloadingFiles.has(artifactId)) return;

    setDownloadingFiles(prev => new Set(prev).add(artifactId));

    try {
      const response = await fetch(`/api/artifacts/${artifactId}/download`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(artifactId);
        return newSet;
      });
    }
  };

  const handleFilePreview = async (artifactId: string) => {
    if (!authToken) return;

    try {
      const response = await fetch(`/api/artifacts/${artifactId}/preview`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Preview failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to preview file');
    }
  };

  const renderFileMessage = (message: WebSocketMessage) => {
    const { fileName, fileSize, fileType, artifactId } = message.metadata || {};

    if (!fileName || !artifactId) {
      return <div className="file-error">Invalid file message</div>;
    }

    const isDownloading = downloadingFiles.has(artifactId);
    const fileIcon = getFileIcon(fileType || '');
    const formattedSize = fileSize ? formatFileSize(fileSize) : 'Unknown size';

    return (
      <div className="file-message-content">
        <div className="file-info">
          <div className="file-icon">{fileIcon}</div>
          <div className="file-details">
            <div className="file-name">{fileName}</div>
            <div className="file-size">{formattedSize}</div>
          </div>
        </div>
        <div className="file-actions">
          <button
            type="button"
            className="file-action-button preview-button"
            onClick={() => handleFilePreview(artifactId)}
            title="Preview"
          >
            👁️
          </button>
          <button
            type="button"
            className="file-action-button download-button"
            onClick={() => handleFileDownload(artifactId, fileName)}
            disabled={isDownloading}
            title="Download"
          >
            {isDownloading ? '⏳' : '⬇️'}
          </button>
        </div>
      </div>
    );
  };

  const renderLinkMessage = (message: WebSocketMessage) => {
    const { url, linkTitle, linkDescription } = message.metadata || {};

    if (!url) {
      return <div className="link-error">Invalid link message</div>;
    }

    const platform = getPlatformType(url);
    const config = getPlatformConfig(platform);
    const urlInfo = extractUrlInfo(url);

    // Use metadata if available, otherwise extract from URL
    const title = linkTitle || urlInfo.title;
    const description = linkDescription || urlInfo.description;

    return (
      <div
        className="link-message-content"
        style={{ borderLeftColor: config.color }}
      >
        <div className="link-preview">
          <div className="link-icon" style={{ color: config.color }}>
            {config.icon}
          </div>
          <div className="link-details">
            <div className="link-title">{title}</div>
            {description && (
              <div className="link-description">{description}</div>
            )}
            <div className="link-url">{url}</div>
            <div className="link-platform">{config.name}</div>
          </div>
          <div className="link-actions">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-open-button"
              title="Open link"
            >
              🔗
            </a>
          </div>
        </div>
      </div>
    );
  };

  const renderMessageContent = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'file':
        return renderFileMessage(message);

      case 'link':
        return renderLinkMessage(message);

      case 'system':
        return (
          <div className="system-message-content">
            <span className="system-icon">ℹ️</span>
            <span className="system-text">{message.message}</span>
          </div>
        );

      default:
        return <div className="text-message-content">{message.message}</div>;
    }
  };

  const renderMessage = (message: WebSocketMessage, index: number) => {
    const isOwn = isOwnMessage(message);
    const messageTypeClass = getMessageTypeClass(message);
    const showUserInfo =
      index === 0 ||
      messages[index - 1]?.userId !== message.userId ||
      new Date(message.timestamp).getTime() -
        new Date(messages[index - 1]?.timestamp).getTime() >
        300000; // 5 minutes

    const handleReply = () => {
      onReplyToMessage?.(message.id);
    };

    return (
      <div
        key={message.id}
        data-testid="message"
        className={`message-item ${isOwn ? 'own-message' : 'other-message'} ${messageTypeClass}`}
      >
        {!isOwn && showUserInfo && (
          <div className="message-user-info">
            <div className="user-avatar">
              {message.isPersonaMessage ? '🤖' : '👤'}
            </div>
            <div className="user-details">
              <div className="user-name">
                {message.isPersonaMessage
                  ? `Persona: ${message.userEmail}`
                  : message.userEmail}
              </div>
              <div className="user-role">{message.userRole}</div>
            </div>
          </div>
        )}

        <div className="message-content">
          {renderMessageContent(message)}
          <div className="message-footer">
            <div className="message-timestamp">
              {formatTimestamp(message.timestamp)}
            </div>
            <div className="message-actions">
              {onReplyToMessage && (
                <button
                  className="action-button reply-button"
                  onClick={handleReply}
                  title="Reply to this message"
                >
                  <span className="action-icon">↩️</span>
                  <span className="action-text">Reply</span>
                </button>
              )}
              {onFlagMessage && !message.isPersonaMessage && (
                <MessageFlagButton
                  messageId={message.id}
                  onFlag={onFlagMessage}
                  disabled={isOwn}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`message-list ${className}`}>
      {messages.length === 0 ? (
        <div className="empty-messages">
          <div className="empty-icon">💬</div>
          <div className="empty-text">No messages yet</div>
          <div className="empty-subtext">Start the conversation!</div>
        </div>
      ) : (
        <div className="messages-container">
          {messages.map((message, index) => renderMessage(message, index))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
};

export default MessageList;
