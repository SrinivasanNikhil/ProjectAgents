import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../../hooks/useChat';
import MessageInput from './MessageInput';
import './ThreadView.css';

export interface ThreadViewProps {
  projectId: string;
  threadId: string;
  authToken: string;
  currentUser: {
    id: string;
    email: string;
    role: string;
  };
  onBackToMain: () => void;
  className?: string;
}

const ThreadView: React.FC<ThreadViewProps> = ({
  projectId,
  threadId,
  authToken,
  currentUser,
  onBackToMain,
  className = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  // Load thread messages
  const loadThreadMessages = async () => {
    if (!projectId || !threadId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/chat/threads/${projectId}/${threadId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load thread messages: ${response.statusText}`
        );
      }

      const data = await response.json();
      setMessages(data.messages || []);

      // Set thread title from the first message
      if (data.messages && data.messages.length > 0) {
        const firstMessage = data.messages[0];
        setThreadTitle(
          firstMessage.threadTitle ||
            firstMessage.message.substring(0, 50) + '...'
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load thread messages';
      setError(errorMessage);
      console.error('Error loading thread messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Send reply to thread
  const sendReply = async (
    messageText: string,
    messageType: string = 'text',
    metadata?: any
  ) => {
    if (!messageText.trim() || !projectId || !threadId) return;

    try {
      const response = await fetch(
        `${API_BASE}/chat/threads/${projectId}/${threadId}/reply`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageText.trim(),
            type: messageType,
            metadata,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to send reply: ${response.statusText}`);
      }

      const data = await response.json();

      // Add the new message to the list
      setMessages(prev => [...prev, data.message]);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send reply';
      setError(errorMessage);
      console.error('Error sending reply:', err);
    }
  };

  // Load messages on mount
  useEffect(() => {
    loadThreadMessages();
  }, [projectId, threadId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isOwn = message.userId === currentUser.id;
    const showUserInfo =
      index === 0 ||
      messages[index - 1]?.userId !== message.userId ||
      new Date(message.timestamp).getTime() -
        new Date(messages[index - 1]?.timestamp).getTime() >
        300000; // 5 minutes

    return (
      <div
        key={message.id}
        className={`thread-message-item ${isOwn ? 'own-message' : 'other-message'}`}
        style={{ marginLeft: `${message.threadDepth * 20}px` }}
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
          <div className="message-text">{message.message}</div>
          <div className="message-timestamp">
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`thread-view ${className}`}>
        <div className="thread-view-loading">
          <div className="loading-spinner"></div>
          <span>Loading thread...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`thread-view ${className}`}>
        <div className="thread-view-error">
          <span className="error-message">{error}</span>
          <button onClick={loadThreadMessages} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`thread-view ${className}`}>
      <div className="thread-view-header">
        <button onClick={onBackToMain} className="back-button">
          ← Back to Chat
        </button>
        <div className="thread-info">
          <h3 className="thread-title">{threadTitle}</h3>
          <span className="thread-count">{messages.length} messages</span>
        </div>
      </div>

      <div className="thread-messages">
        {messages.length === 0 ? (
          <div className="thread-empty">
            <span>No messages in this thread</span>
          </div>
        ) : (
          <div className="messages-container">
            {messages.map((message, index) => renderMessage(message, index))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="thread-input">
        <MessageInput
          onSendMessage={sendReply}
          onTypingChange={() => {}}
          disabled={isLoading}
          placeholder="Reply to thread..."
          projectId={projectId}
          authToken={authToken}
        />
      </div>
    </div>
  );
};

export default ThreadView;
