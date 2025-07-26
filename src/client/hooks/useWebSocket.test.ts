import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';
import { io } from 'socket.io-client';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock socket.io-client
vi.mock('socket.io-client');

const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
};

(io as any).mockReturnValue(mockSocket);

describe('useWebSocket', () => {
  const defaultConfig = {
    url: 'ws://localhost:3000',
    authToken: 'test-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
  });

  describe('initialization', () => {
    it('should create socket with correct configuration', () => {
      renderHook(() => useWebSocket(defaultConfig));

      expect(io).toHaveBeenCalledWith(defaultConfig.url, {
        auth: {
          token: defaultConfig.authToken,
        },
        transports: ['websocket', 'polling'],
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      });
    });

    it('should auto-connect when autoConnect is true', () => {
      renderHook(() => useWebSocket({ ...defaultConfig, autoConnect: true }));

      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should not auto-connect when autoConnect is false', () => {
      renderHook(() => useWebSocket({ ...defaultConfig, autoConnect: false }));

      expect(mockSocket.connect).not.toHaveBeenCalled();
    });

    it('should set error when auth token is missing', () => {
      const { result } = renderHook(() =>
        useWebSocket({ ...defaultConfig, authToken: '' })
      );

      expect(result.current.error).toBe('Authentication token required');
    });
  });

  describe('connection management', () => {
    it('should connect successfully', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.connect();
      });

      expect(mockSocket.connect).toHaveBeenCalled();
      expect(result.current.isConnecting).toBe(true);
    });

    it('should handle successful connection', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.connect();
      });

      // Simulate connection success
      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (connectCallback) {
        act(() => {
          connectCallback();
        });
      }

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle connection error', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.connect();
      });

      // Simulate connection error
      const errorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];

      if (errorCallback) {
        act(() => {
          errorCallback({ message: 'Connection failed' });
        });
      }

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBe('Connection error: Connection failed');
    });

    it('should handle disconnection', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.connect();
      });

      // Simulate disconnection
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      if (disconnectCallback) {
        act(() => {
          disconnectCallback('io client disconnect');
        });
      }

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
    });

    it('should disconnect properly', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.connect();
      });

      act(() => {
        result.current.disconnect();
      });

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(result.current.socket).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('project room management', () => {
    it('should join project room', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.connect();
      });

      // Set socket as connected
      mockSocket.connected = true;

      act(() => {
        result.current.joinProject('project-123');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'join-project',
        'project-123'
      );
    });

    it('should leave project room', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.connect();
      });

      // Set socket as connected
      mockSocket.connected = true;

      act(() => {
        result.current.leaveProject('project-123');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'leave-project',
        'project-123'
      );
    });

    it('should not emit events when socket is not connected', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.joinProject('project-123');
        result.current.leaveProject('project-123');
      });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('message sending', () => {
    it('should send chat message', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.connect();
      });

      // Set socket as connected
      mockSocket.connected = true;

      act(() => {
        result.current.sendMessage('project-123', 'Hello world');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('chat-message', {
        projectId: 'project-123',
        message: 'Hello world',
        type: 'text',
      });
    });

    it('should send message with custom type', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.connect();
      });

      // Set socket as connected
      mockSocket.connected = true;

      act(() => {
        result.current.sendMessage('project-123', 'File uploaded', 'file');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('chat-message', {
        projectId: 'project-123',
        message: 'File uploaded',
        type: 'file',
      });
    });

    it('should send typing indicators', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.connect();
      });

      // Set socket as connected
      mockSocket.connected = true;

      act(() => {
        result.current.sendTypingStart('project-123');
        result.current.sendTypingStop('project-123');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('typing-start', {
        projectId: 'project-123',
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('typing-stop', {
        projectId: 'project-123',
      });
    });

    it('should send presence updates', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.connect();
      });

      // Set socket as connected
      mockSocket.connected = true;

      act(() => {
        result.current.sendPresenceUpdate('project-123', 'away');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('presence-update', {
        projectId: 'project-123',
        status: 'away',
      });
    });
  });

  describe('event callbacks', () => {
    it('should register message callback', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));
      const messageCallback = jest.fn();

      act(() => {
        result.current.onMessage(messageCallback);
      });

      // Simulate message event
      const messageEventCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'chat-message'
      )[1];

      const testMessage = {
        id: 'msg-123',
        projectId: 'project-123',
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'student',
        message: 'Hello',
        type: 'text' as const,
        timestamp: '2023-01-01T00:00:00Z',
      };

      act(() => {
        messageEventCallback(testMessage);
      });

      expect(messageCallback).toHaveBeenCalledWith(testMessage);
    });

    it('should register typing callback', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));
      const typingCallback = jest.fn();

      act(() => {
        result.current.onTyping(typingCallback);
      });

      // Simulate typing event
      const typingEventCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'user-typing'
      )[1];

      const testTyping = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        projectId: 'project-123',
        isTyping: true,
      };

      act(() => {
        typingEventCallback(testTyping);
      });

      expect(typingCallback).toHaveBeenCalledWith(testTyping);
    });

    it('should register presence callback', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));
      const presenceCallback = jest.fn();

      act(() => {
        result.current.onPresence(presenceCallback);
      });

      // Simulate presence event
      const presenceEventCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'user-presence'
      )[1];

      const testPresence = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        projectId: 'project-123',
        status: 'online' as const,
        timestamp: '2023-01-01T00:00:00Z',
      };

      act(() => {
        presenceEventCallback(testPresence);
      });

      expect(presenceCallback).toHaveBeenCalledWith(testPresence);
    });

    it('should register error callback', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));
      const errorCallback = jest.fn();

      act(() => {
        result.current.onError(errorCallback);
      });

      // Simulate error event
      const errorEventCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      act(() => {
        errorEventCallback({ message: 'Test error' });
      });

      expect(errorCallback).toHaveBeenCalledWith('Test error');
    });

    it('should register connect callback', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));
      const connectCallback = jest.fn();

      act(() => {
        result.current.onConnect(connectCallback);
      });

      // Simulate connect event
      const connectEventCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];

      act(() => {
        connectEventCallback();
      });

      expect(connectCallback).toHaveBeenCalled();
    });

    it('should register disconnect callback', () => {
      const { result } = renderHook(() => useWebSocket(defaultConfig));
      const disconnectCallback = jest.fn();

      act(() => {
        result.current.onDisconnect(disconnectCallback);
      });

      // Simulate disconnect event
      const disconnectEventCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];

      act(() => {
        disconnectEventCallback('io client disconnect');
      });

      expect(disconnectCallback).toHaveBeenCalled();
    });
  });

  describe('reconnection', () => {
    it('should attempt reconnection on disconnect', () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.connect();
      });

      // Simulate disconnect
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];

      act(() => {
        disconnectCallback('io client disconnect');
      });

      // Fast-forward time to trigger reconnection
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockSocket.connect).toHaveBeenCalledTimes(2); // Initial + reconnection

      jest.useRealTimers();
    });

    it('should stop reconnection attempts after max attempts', () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useWebSocket(defaultConfig));

      act(() => {
        result.current.connect();
      });

      // Simulate multiple disconnects
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];

      for (let i = 0; i < 6; i++) {
        act(() => {
          disconnectCallback('io client disconnect');
        });

        act(() => {
          jest.advanceTimersByTime(1000 * (i + 1));
        });
      }

      expect(result.current.error).toBe(
        'Failed to reconnect after maximum attempts'
      );

      jest.useRealTimers();
    });
  });

  describe('cleanup', () => {
    it('should disconnect socket on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket(defaultConfig));

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});
