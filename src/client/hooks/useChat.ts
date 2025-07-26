import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useWebSocket,
  WebSocketMessage,
  TypingIndicator,
  UserPresence,
} from './useWebSocket';

export interface ChatMessage extends WebSocketMessage {
  // Extended interface for chat-specific functionality
}

export interface ChatHistoryOptions {
  limit?: number;
  offset?: number;
  autoLoad?: boolean;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  isTyping: boolean;
  typingUsers: string[];
  userPresence: Map<string, UserPresence>;
  sendMessage: (message: string, type?: string, metadata?: any) => void;
  loadHistory: (limit?: number, offset?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  searchMessages: (query: string) => Promise<ChatMessage[]>;
  clearMessages: () => void;
  markAsRead: (messageId: string) => void;
  deleteMessage: (messageId: string) => Promise<boolean>;
}

export const useChat = (
  projectId: string,
  authToken: string,
  options: ChatHistoryOptions = {}
): UseChatReturn => {
  const { limit = 50, offset = 0, autoLoad = true } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(
    new Map()
  );
  const [currentOffset, setCurrentOffset] = useState(offset);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Initialize WebSocket connection
  const {
    isConnected,
    isConnecting,
    error: wsError,
    joinProject,
    leaveProject,
    sendMessage: wsSendMessage,
    sendTypingStart,
    sendTypingStop,
    sendPresenceUpdate,
    onMessage,
    onTyping,
    onPresence,
    onError: onWSError,
    onConnect,
    onDisconnect,
  } = useWebSocket({
    url: process.env.REACT_APP_WS_URL || 'ws://localhost:3000',
    authToken,
    autoConnect: true,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
  });

  // API base URL
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  // Load chat history from API
  const loadHistory = useCallback(
    async (historyLimit?: number, historyOffset?: number) => {
      if (!projectId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE}/chat/history/${projectId}?limit=${historyLimit || limit}&offset=${historyOffset || 0}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load chat history: ${response.statusText}`
          );
        }

        const data = await response.json();
        const historyMessages: ChatMessage[] = data.messages || [];

        // Reverse the order to show oldest first (for proper display)
        const reversedMessages = historyMessages.reverse();

        setMessages(reversedMessages);
        setHasMore(historyMessages.length === (historyLimit || limit));
        setCurrentOffset(historyOffset || 0);

        // Store the last message ID for pagination
        if (reversedMessages.length > 0) {
          lastMessageIdRef.current =
            reversedMessages[reversedMessages.length - 1].id;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load chat history';
        setError(errorMessage);
        console.error('Error loading chat history:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, authToken, limit, API_BASE]
  );

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !projectId) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const nextOffset = currentOffset + limit;
      const response = await fetch(
        `${API_BASE}/chat/history/${projectId}?limit=${limit}&offset=${nextOffset}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load more messages: ${response.statusText}`);
      }

      const data = await response.json();
      const moreMessages: ChatMessage[] = data.messages || [];

      if (moreMessages.length > 0) {
        // Add new messages to the beginning (older messages)
        setMessages(prev => [...moreMessages.reverse(), ...prev]);
        setCurrentOffset(nextOffset);
        setHasMore(moreMessages.length === limit);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load more messages';
      setError(errorMessage);
      console.error('Error loading more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    hasMore,
    projectId,
    currentOffset,
    limit,
    authToken,
    API_BASE,
  ]);

  // Search messages
  const searchMessages = useCallback(
    async (query: string): Promise<ChatMessage[]> => {
      if (!projectId || !query.trim()) return [];

      try {
        const response = await fetch(
          `${API_BASE}/chat/search/${projectId}?q=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to search messages: ${response.statusText}`);
        }

        const data = await response.json();
        return data.messages || [];
      } catch (err) {
        console.error('Error searching messages:', err);
        return [];
      }
    },
    [projectId, authToken, API_BASE]
  );

  // Send message
  const sendMessage = useCallback(
    (messageText: string, messageType: string = 'text', metadata?: any) => {
      if (!messageText.trim() || !isConnected) return;

      wsSendMessage(projectId, messageText.trim(), messageType, metadata);

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        sendTypingStop(projectId);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    },
    [isConnected, projectId, wsSendMessage, isTyping, sendTypingStop]
  );

  // Handle new messages from WebSocket
  const handleNewMessage = useCallback((message: WebSocketMessage) => {
    setMessages(prev => {
      // Check if message already exists (avoid duplicates)
      const exists = prev.some(msg => msg.id === message.id);
      if (exists) return prev;

      // Add new message to the end
      return [...prev, message as ChatMessage];
    });
  }, []);

  // Handle typing indicators
  const handleTyping = useCallback((typing: TypingIndicator) => {
    setTypingUsers(prev => {
      if (typing.isTyping) {
        return prev.includes(typing.userId) ? prev : [...prev, typing.userId];
      } else {
        return prev.filter(id => id !== typing.userId);
      }
    });
  }, []);

  // Handle user presence updates
  const handlePresence = useCallback((presence: UserPresence) => {
    setUserPresence(prev => {
      const newPresence = new Map(prev);
      newPresence.set(presence.userId, presence);
      return newPresence;
    });
  }, []);

  // Handle WebSocket errors
  const handleWSError = useCallback((error: string) => {
    setError(error);
  }, []);

  // Handle connection events
  const handleConnect = useCallback(() => {
    setError(null);
    joinProject(projectId);
    sendPresenceUpdate(projectId, 'online');
  }, [joinProject, projectId, sendPresenceUpdate]);

  const handleDisconnect = useCallback(() => {
    setError('Connection lost. Attempting to reconnect...');
  }, []);

  // Mark message as read
  const markAsRead = useCallback((messageId: string) => {
    // In a real implementation, you'd send this to the server
    // For now, just update local state
    setMessages(prev =>
      prev.map(msg => (msg.id === messageId ? { ...msg, isRead: true } : msg))
    );
  }, []);

  // Delete message (admin/instructor only)
  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      try {
        const response = await fetch(`${API_BASE}/chat/messages/${messageId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to delete message: ${response.statusText}`);
        }

        // Remove message from local state
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        return true;
      } catch (err) {
        console.error('Error deleting message:', err);
        return false;
      }
    },
    [authToken, API_BASE]
  );

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentOffset(0);
    setHasMore(true);
    lastMessageIdRef.current = null;
  }, []);

  // Set up WebSocket event listeners
  useEffect(() => {
    onMessage(handleNewMessage);
    onTyping(handleTyping);
    onPresence(handlePresence);
    onWSError(handleWSError);
    onConnect(handleConnect);
    onDisconnect(handleDisconnect);
  }, [
    onMessage,
    onTyping,
    onPresence,
    onWSError,
    onConnect,
    onDisconnect,
    handleNewMessage,
    handleTyping,
    handlePresence,
    handleWSError,
    handleConnect,
    handleDisconnect,
  ]);

  // Auto-load history when component mounts
  useEffect(() => {
    if (autoLoad && projectId && isConnected) {
      loadHistory();
    }
  }, [autoLoad, projectId, isConnected, loadHistory]);

  // Join/leave project room when projectId changes
  useEffect(() => {
    if (isConnected) {
      joinProject(projectId);
      sendPresenceUpdate(projectId, 'online');
    }

    return () => {
      if (isConnected) {
        leaveProject(projectId);
        sendPresenceUpdate(projectId, 'offline');
      }
    };
  }, [projectId, isConnected, joinProject, leaveProject, sendPresenceUpdate]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    isLoading: isLoading || isConnecting,
    error: error || wsError,
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
  };
};
