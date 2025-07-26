import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface WebSocketMessage {
  id: string;
  projectId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  message: string;
  type: 'text' | 'file' | 'link' | 'system';
  // Threading support
  parentMessageId?: string;
  threadId?: string;
  threadTitle?: string;
  threadDepth: number;
  threadPosition: number;
  isThreadRoot: boolean;
  threadMessageCount: number;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    url?: string;
    linkTitle?: string;
    linkDescription?: string;
    milestoneId?: string;
    artifactId?: string;
    aiResponseTime?: number;
    sentiment?: number;
  };
  timestamp: string;
  isPersonaMessage?: boolean;
  personaId?: string;
}

export interface TypingIndicator {
  userId: string;
  userEmail: string;
  projectId: string;
  isTyping: boolean;
}

export interface UserPresence {
  userId: string;
  userEmail: string;
  projectId: string;
  status: 'online' | 'away' | 'offline';
  timestamp: string;
}

export interface WebSocketConfig {
  url: string;
  authToken: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  sendMessage: (
    projectId: string,
    message: string,
    type?: string,
    metadata?: any
  ) => void;
  sendTypingStart: (projectId: string) => void;
  sendTypingStop: (projectId: string) => void;
  sendPresenceUpdate: (
    projectId: string,
    status: 'online' | 'away' | 'offline'
  ) => void;
  onMessage: (callback: (message: WebSocketMessage) => void) => void;
  onTyping: (callback: (typing: TypingIndicator) => void) => void;
  onPresence: (callback: (presence: UserPresence) => void) => void;
  onError: (callback: (error: string) => void) => void;
  onConnect: (callback: () => void) => void;
  onDisconnect: (callback: () => void) => void;
}

export const useWebSocket = (config: WebSocketConfig): UseWebSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = config.reconnectAttempts || 5;
  const reconnectDelay = config.reconnectDelay || 1000;

  const messageCallbacksRef = useRef<((message: WebSocketMessage) => void)[]>(
    []
  );
  const typingCallbacksRef = useRef<((typing: TypingIndicator) => void)[]>([]);
  const presenceCallbacksRef = useRef<((presence: UserPresence) => void)[]>([]);
  const errorCallbacksRef = useRef<((error: string) => void)[]>([]);
  const connectCallbacksRef = useRef<(() => void)[]>([]);
  const disconnectCallbacksRef = useRef<(() => void)[]>([]);

  const createSocket = useCallback(() => {
    if (!config.authToken) {
      setError('Authentication token required');
      return null;
    }

    const newSocket = io(config.url, {
      auth: {
        token: config.authToken,
      },
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: reconnectDelay,
      timeout: 20000,
    });

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      reconnectAttemptsRef.current = 0;
      connectCallbacksRef.current.forEach(callback => callback());
    });

    newSocket.on('disconnect', reason => {
      setIsConnected(false);
      setIsConnecting(false);
      disconnectCallbacksRef.current.forEach(callback => callback());

      if (reason === 'io server disconnect') {
        // Server disconnected us, don't reconnect
        setError('Server disconnected');
      } else if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        // Attempt to reconnect
        reconnectAttemptsRef.current++;
        setTimeout(() => {
          setIsConnecting(true);
          newSocket.connect();
        }, reconnectDelay * reconnectAttemptsRef.current);
      } else {
        setError('Failed to reconnect after maximum attempts');
      }
    });

    newSocket.on('connect_error', err => {
      setIsConnecting(false);
      setError(`Connection error: ${err.message}`);
      errorCallbacksRef.current.forEach(callback => callback(err.message));
    });

    // Chat events
    newSocket.on('chat-message', (message: WebSocketMessage) => {
      messageCallbacksRef.current.forEach(callback => callback(message));
    });

    newSocket.on('user-typing', (typing: TypingIndicator) => {
      typingCallbacksRef.current.forEach(callback => callback(typing));
    });

    newSocket.on('user-stopped-typing', (typing: TypingIndicator) => {
      typingCallbacksRef.current.forEach(callback => callback(typing));
    });

    newSocket.on('user-presence', (presence: UserPresence) => {
      presenceCallbacksRef.current.forEach(callback => callback(presence));
    });

    newSocket.on('joined-project', (data: { projectId: string }) => {
      console.log(`Joined project: ${data.projectId}`);
    });

    newSocket.on('left-project', (data: { projectId: string }) => {
      console.log(`Left project: ${data.projectId}`);
    });

    newSocket.on('message-sent', (data: { id: string }) => {
      console.log(`Message sent with ID: ${data.id}`);
    });

    newSocket.on('error', (data: { message: string }) => {
      setError(data.message);
      errorCallbacksRef.current.forEach(callback => callback(data.message));
    });

    return newSocket;
  }, [config.url, config.authToken, maxReconnectAttempts, reconnectDelay]);

  const connect = useCallback(() => {
    if (socket && socket.connected) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    const newSocket = createSocket();
    if (newSocket) {
      setSocket(newSocket);
      newSocket.connect();
    }
  }, [socket, createSocket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
      setError(null);
      reconnectAttemptsRef.current = 0;
    }
  }, [socket]);

  const joinProject = useCallback(
    (projectId: string) => {
      if (socket && socket.connected) {
        socket.emit('join-project', projectId);
      }
    },
    [socket]
  );

  const leaveProject = useCallback(
    (projectId: string) => {
      if (socket && socket.connected) {
        socket.emit('leave-project', projectId);
      }
    },
    [socket]
  );

  const sendMessage = useCallback(
    (
      projectId: string,
      message: string,
      type: string = 'text',
      metadata?: any
    ) => {
      if (socket && socket.connected) {
        socket.emit('chat-message', { projectId, message, type, metadata });
      }
    },
    [socket]
  );

  const sendTypingStart = useCallback(
    (projectId: string) => {
      if (socket && socket.connected) {
        socket.emit('typing-start', { projectId });
      }
    },
    [socket]
  );

  const sendTypingStop = useCallback(
    (projectId: string) => {
      if (socket && socket.connected) {
        socket.emit('typing-stop', { projectId });
      }
    },
    [socket]
  );

  const sendPresenceUpdate = useCallback(
    (projectId: string, status: 'online' | 'away' | 'offline') => {
      if (socket && socket.connected) {
        socket.emit('presence-update', { projectId, status });
      }
    },
    [socket]
  );

  const onMessage = useCallback(
    (callback: (message: WebSocketMessage) => void) => {
      messageCallbacksRef.current.push(callback);
      return () => {
        const index = messageCallbacksRef.current.indexOf(callback);
        if (index > -1) {
          messageCallbacksRef.current.splice(index, 1);
        }
      };
    },
    []
  );

  const onTyping = useCallback(
    (callback: (typing: TypingIndicator) => void) => {
      typingCallbacksRef.current.push(callback);
      return () => {
        const index = typingCallbacksRef.current.indexOf(callback);
        if (index > -1) {
          typingCallbacksRef.current.splice(index, 1);
        }
      };
    },
    []
  );

  const onPresence = useCallback(
    (callback: (presence: UserPresence) => void) => {
      presenceCallbacksRef.current.push(callback);
      return () => {
        const index = presenceCallbacksRef.current.indexOf(callback);
        if (index > -1) {
          presenceCallbacksRef.current.splice(index, 1);
        }
      };
    },
    []
  );

  const onError = useCallback((callback: (error: string) => void) => {
    errorCallbacksRef.current.push(callback);
    return () => {
      const index = errorCallbacksRef.current.indexOf(callback);
      if (index > -1) {
        errorCallbacksRef.current.splice(index, 1);
      }
    };
  }, []);

  const onConnect = useCallback((callback: () => void) => {
    connectCallbacksRef.current.push(callback);
    return () => {
      const index = connectCallbacksRef.current.indexOf(callback);
      if (index > -1) {
        connectCallbacksRef.current.splice(index, 1);
      }
    };
  }, []);

  const onDisconnect = useCallback((callback: () => void) => {
    disconnectCallbacksRef.current.push(callback);
    return () => {
      const index = disconnectCallbacksRef.current.indexOf(callback);
      if (index > -1) {
        disconnectCallbacksRef.current.splice(index, 1);
      }
    };
  }, []);

  // Auto-connect if configured
  useEffect(() => {
    if (config.autoConnect && config.authToken) {
      connect();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [config.autoConnect, config.authToken, connect, socket]);

  return {
    socket,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    joinProject,
    leaveProject,
    sendMessage,
    sendTypingStart,
    sendTypingStop,
    sendPresenceUpdate,
    onMessage,
    onTyping,
    onPresence,
    onError,
    onConnect,
    onDisconnect,
  };
};
