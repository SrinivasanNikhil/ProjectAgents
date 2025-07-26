import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat, ChatMessage } from '../../hooks/useChat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ThreadList from './ThreadList';
import ThreadView from './ThreadView';
import NotificationSettings from './NotificationSettings';
import NotificationBadge from './NotificationBadge';
import NotificationHistory from './NotificationHistory';
import {
  notificationManager,
  notifyNewMessage,
  notifyUserJoined,
  notifyUserLeft,
} from '../../utils/notificationUtils';
import './ChatInterface.css';

export interface ChatInterfaceProps {
  projectId: string;
  authToken: string;
  currentUser: {
    id: string;
    email: string;
    role: string;
  };
  onMessageSent?: (message: ChatMessage) => void;
  onError?: (error: string) => void;
  className?: string;
  autoLoadHistory?: boolean;
  historyLimit?: number;
  showThreading?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  projectId,
  authToken,
  currentUser,
  onMessageSent,
  onError,
  className = '',
  autoLoadHistory = true,
  historyLimit = 50,
  showThreading = true,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<
    string | undefined
  >();
  const [showThreadList, setShowThreadList] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] =
    useState(false);
  const [showNotificationHistory, setShowNotificationHistory] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(
    null
  );

  // Use the chat hook for message persistence and history
  const {
    messages,
    isLoading,
    error,
    hasMore,
    isTyping,
    typingUsers,
    userPresence,
    sendMessage,
    loadHistory,
    loadMore,
    searchMessages,
    clearMessages,
    markAsRead,
    deleteMessage,
  } = useChat(projectId, authToken, {
    autoLoad: autoLoadHistory,
    limit: historyLimit,
  });

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Handle new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, scrollToBottom]);

  // Handle send message
  const handleSendMessage = useCallback(
    (messageText: string, messageType: string = 'text', metadata?: any) => {
      sendMessage(messageText, messageType, metadata);
    },
    [sendMessage]
  );

  // Handle typing change
  const handleTypingChange = useCallback((isTyping: boolean) => {
    // The useChat hook handles typing indicators internally
  }, []);

  // Handle errors
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Handle thread selection
  const handleThreadSelect = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    setShowThreadList(false);
  }, []);

  // Handle notification settings
  const handleNotificationSettingsToggle = useCallback(() => {
    setShowNotificationSettings(!showNotificationSettings);
  }, [showNotificationSettings]);

  // Handle notification history
  const handleNotificationHistoryToggle = useCallback(() => {
    setShowNotificationHistory(!showNotificationHistory);
  }, [showNotificationHistory]);

  // Handle new messages and notifications
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // Check if this is a new message from another user
      if (
        lastMessage.userId !== currentUser.id &&
        lastMessage.id !== lastReadMessageId
      ) {
        // Check if user is mentioned
        const isMentioned =
          lastMessage.message.includes(`@${currentUser.email.split('@')[0]}`) ||
          lastMessage.message.includes(`@${currentUser.id}`);

        // Show notification
        notifyNewMessage(
          lastMessage.userEmail,
          lastMessage.message,
          isMentioned,
          projectId
        );

        // Update unread count
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages, currentUser, lastReadMessageId, projectId]);

  // Handle user presence changes
  useEffect(() => {
    const handleUserJoined = (presence: any) => {
      if (presence.status === 'online' && presence.userId !== currentUser.id) {
        notifyUserJoined(presence.userEmail, projectId);
      }
    };

    const handleUserLeft = (presence: any) => {
      if (presence.status === 'offline' && presence.userId !== currentUser.id) {
        notifyUserLeft(presence.userEmail, projectId);
      }
    };

    // Listen for presence updates
    const unsubscribeJoined = userPresence.forEach(presence => {
      if (presence.status === 'online' && presence.userId !== currentUser.id) {
        handleUserJoined(presence);
      }
    });

    const unsubscribeLeft = userPresence.forEach(presence => {
      if (presence.status === 'offline' && presence.userId !== currentUser.id) {
        handleUserLeft(presence);
      }
    });

    return () => {
      // Cleanup listeners
    };
  }, [userPresence, currentUser, projectId]);

  // Mark messages as read when user is active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.id !== lastReadMessageId) {
          setLastReadMessageId(lastMessage.id);
          setUnreadCount(0);
          markAsRead(lastMessage.id);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [messages, lastReadMessageId, markAsRead]);

  // Handle back to main conversation
  const handleBackToMain = useCallback(() => {
    setSelectedThreadId(undefined);
  }, []);

  // Handle reply to message (create new thread)
  const handleReplyToMessage = useCallback((messageId: string) => {
    // This will be handled by the MessageList component
    // For now, we'll just focus on the input
    const inputElement = document.querySelector(
      '.message-input'
    ) as HTMLInputElement;
    if (inputElement) {
      inputElement.focus();
      inputElement.placeholder = `Replying to message...`;
    }
  }, []);

  // Get online users
  const onlineUsers = Array.from(userPresence.values()).filter(
    presence =>
      presence.status === 'online' && presence.userId !== currentUser.id
  );

  // If a thread is selected, show the thread view
  if (selectedThreadId) {
    return (
      <div className={`chat-interface ${className}`}>
        <ThreadView
          projectId={projectId}
          threadId={selectedThreadId}
          authToken={authToken}
          currentUser={currentUser}
          onBackToMain={handleBackToMain}
        />
      </div>
    );
  }

  return (
    <div className={`chat-interface ${className}`}>
      {/* Connection Status */}
      <div className="chat-status">
        <div className="status-left">
          <div
            className={`status-indicator ${isLoading ? 'connecting' : 'connected'}`}
          >
            <span className="status-dot"></span>
            {isLoading ? 'Loading...' : 'Connected'}
          </div>
          {onlineUsers.length > 0 && (
            <div className="online-users">
              {onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''}{' '}
              online
            </div>
          )}
        </div>

        <div className="status-right">
          {/* Notification Badge */}
          <div className="notification-controls">
            <NotificationBadge
              count={unreadCount}
              variant="primary"
              size="small"
              onClick={() => {
                // Scroll to bottom to see new messages
                scrollToBottom();
                setUnreadCount(0);
              }}
            />
            <button
              className="notification-history-button"
              onClick={handleNotificationHistoryToggle}
              title="Notification history"
            >
              <span className="notification-icon">📋</span>
            </button>
            <button
              className="notification-settings-button"
              onClick={handleNotificationSettingsToggle}
              title="Notification settings"
            >
              <span className="notification-icon">⚙️</span>
            </button>
          </div>

          {showThreading && (
            <button
              className={`thread-toggle ${showThreadList ? 'active' : ''}`}
              onClick={() => setShowThreadList(!showThreadList)}
              title="Toggle thread list"
            >
              <span className="thread-icon">🧵</span>
              <span className="thread-text">Threads</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="chat-error">
          <span className="error-message">{error}</span>
          <button className="error-dismiss" onClick={() => clearMessages()}>
            ×
          </button>
        </div>
      )}

      {/* Main Chat Layout */}
      <div className="chat-layout">
        {/* Thread List Sidebar */}
        {showThreading && showThreadList && (
          <ThreadList
            projectId={projectId}
            authToken={authToken}
            currentUser={currentUser}
            onThreadSelect={handleThreadSelect}
            selectedThreadId={selectedThreadId}
            className="thread-sidebar"
          />
        )}

        {/* Main Chat Area */}
        <div className="chat-main">
          {/* Messages */}
          <div className="chat-messages-container">
            <MessageList
              messages={messages}
              currentUser={currentUser}
              typingUsers={typingUsers}
              onScrollToBottom={scrollToBottom}
              authToken={authToken}
              onReplyToMessage={handleReplyToMessage}
            />
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className="typing-indicators">
              <span className="typing-text">
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : `${typingUsers.length} people are typing...`}
              </span>
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="chat-input-container">
            <MessageInput
              onSendMessage={handleSendMessage}
              onTypingChange={handleTypingChange}
              disabled={isLoading}
              placeholder={isLoading ? 'Loading...' : 'Type your message...'}
              projectId={projectId}
              authToken={authToken}
            />
          </div>
        </div>
      </div>

      {/* Notification Settings Modal */}
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      {/* Notification History Modal */}
      <NotificationHistory
        isOpen={showNotificationHistory}
        onClose={() => setShowNotificationHistory(false)}
      />
    </div>
  );
};

export default ChatInterface;
