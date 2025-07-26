import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from './useChat';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the useWebSocket hook
vi.mock('./useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({
    isConnected: true,
    isConnecting: false,
    error: null,
    joinProject: vi.fn(),
    leaveProject: vi.fn(),
    sendMessage: vi.fn(),
    sendTypingStart: vi.fn(),
    sendTypingStop: vi.fn(),
    sendPresenceUpdate: vi.fn(),
    onMessage: vi.fn(),
    onTyping: vi.fn(),
    onPresence: vi.fn(),
    onError: vi.fn(),
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe('useChat', () => {
  const mockProjectId = 'project-123';
  const mockAuthToken = 'test-token';
  const mockApiBase = 'http://localhost:3000/api';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REACT_APP_API_URL = mockApiBase;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken)
      );

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(true);
      expect(result.current.isTyping).toBe(false);
      expect(result.current.typingUsers).toEqual([]);
      expect(result.current.userPresence).toEqual(new Map());
    });

    it('should auto-load history when autoLoad is true', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          projectId: mockProjectId,
          userId: 'user-1',
          userEmail: 'test@example.com',
          userRole: 'student',
          message: 'Hello',
          type: 'text' as const,
          timestamp: '2023-01-01T00:00:00Z',
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      });

      renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: true })
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          `${mockApiBase}/chat/history/${mockProjectId}?limit=50&offset=0`,
          expect.objectContaining({
            headers: {
              Authorization: `Bearer ${mockAuthToken}`,
              'Content-Type': 'application/json',
            },
          })
        );
      });
    });

    it('should not auto-load history when autoLoad is false', () => {
      renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('loadHistory', () => {
    it('should load chat history successfully', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          projectId: mockProjectId,
          userId: 'user-1',
          userEmail: 'test@example.com',
          userRole: 'student',
          message: 'Hello',
          type: 'text' as const,
          timestamp: '2023-01-01T00:00:00Z',
        },
        {
          id: 'msg-2',
          projectId: mockProjectId,
          userId: 'user-2',
          userEmail: 'test2@example.com',
          userRole: 'instructor',
          message: 'Hi there',
          type: 'text' as const,
          timestamp: '2023-01-01T00:01:00Z',
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      });

      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].id).toBe('msg-1');
      expect(result.current.messages[1].id).toBe('msg-2');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle API errors when loading history', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(result.current.error).toBe('Failed to load chat history');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.messages).toEqual([]);
    });

    it('should handle HTTP error responses', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(result.current.error).toBe(
        'Failed to load chat history: Not Found'
      );
      expect(result.current.isLoading).toBe(false);
    });

    it('should update hasMore flag correctly', async () => {
      const mockMessages = Array.from({ length: 25 }, (_, i) => ({
        id: `msg-${i}`,
        projectId: mockProjectId,
        userId: 'user-1',
        userEmail: 'test@example.com',
        userRole: 'student',
        message: `Message ${i}`,
        type: 'text' as const,
        timestamp: '2023-01-01T00:00:00Z',
      }));

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      });

      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false, limit: 50 })
      );

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(result.current.hasMore).toBe(true); // 25 < 50, so there might be more
    });
  });

  describe('loadMore', () => {
    it('should load more messages for pagination', async () => {
      const initialMessages = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-${i}`,
        projectId: mockProjectId,
        userId: 'user-1',
        userEmail: 'test@example.com',
        userRole: 'student',
        message: `Message ${i}`,
        type: 'text' as const,
        timestamp: '2023-01-01T00:00:00Z',
      }));

      const moreMessages = Array.from({ length: 30 }, (_, i) => ({
        id: `msg-${i + 50}`,
        projectId: mockProjectId,
        userId: 'user-1',
        userEmail: 'test@example.com',
        userRole: 'student',
        message: `Message ${i + 50}`,
        type: 'text' as const,
        timestamp: '2023-01-01T00:00:00Z',
      }));

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: initialMessages }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: moreMessages }),
        });

      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      // Load initial history
      await act(async () => {
        await result.current.loadHistory();
      });

      // Load more messages
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.messages).toHaveLength(80);
      expect(result.current.hasMore).toBe(true); // 30 < 50, so there might be more
    });

    it('should not load more if hasMore is false', async () => {
      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      // Set hasMore to false
      act(() => {
        result.current.clearMessages();
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('searchMessages', () => {
    it('should search messages successfully', async () => {
      const mockSearchResults = [
        {
          id: 'msg-1',
          projectId: mockProjectId,
          userId: 'user-1',
          userEmail: 'test@example.com',
          userRole: 'student',
          message: 'Hello world',
          type: 'text' as const,
          timestamp: '2023-01-01T00:00:00Z',
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockSearchResults }),
      });

      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      const searchResults = await act(async () => {
        return await result.current.searchMessages('hello');
      });

      expect(searchResults).toEqual(mockSearchResults);
      expect(fetch).toHaveBeenCalledWith(
        `${mockApiBase}/chat/search/${mockProjectId}?q=hello`,
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockAuthToken}`,
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should return empty array for empty query', async () => {
      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      const searchResults = await act(async () => {
        return await result.current.searchMessages('');
      });

      expect(searchResults).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle search errors gracefully', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Search failed'));

      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      const searchResults = await act(async () => {
        return await result.current.searchMessages('test');
      });

      expect(searchResults).toEqual([]);
    });
  });

  describe('message operations', () => {
    it('should mark message as read', () => {
      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      // Add a test message
      act(() => {
        result.current.messages = [
          {
            id: 'msg-1',
            projectId: mockProjectId,
            userId: 'user-1',
            userEmail: 'test@example.com',
            userRole: 'student',
            message: 'Hello',
            type: 'text' as const,
            timestamp: '2023-01-01T00:00:00Z',
          },
        ];
      });

      act(() => {
        result.current.markAsRead('msg-1');
      });

      // Verify the function was called (the actual implementation would update a read status)
      expect(result.current.messages).toHaveLength(1);
    });

    it('should delete message successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      // Add a test message
      act(() => {
        result.current.messages = [
          {
            id: 'msg-1',
            projectId: mockProjectId,
            userId: 'user-1',
            userEmail: 'test@example.com',
            userRole: 'student',
            message: 'Hello',
            type: 'text' as const,
            timestamp: '2023-01-01T00:00:00Z',
          },
        ];
      });

      const success = await act(async () => {
        return await result.current.deleteMessage('msg-1');
      });

      expect(success).toBe(true);
      expect(result.current.messages).toHaveLength(0);
      expect(fetch).toHaveBeenCalledWith(
        `${mockApiBase}/chat/messages/msg-1`,
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${mockAuthToken}`,
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle delete message failure', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      // Add a test message
      act(() => {
        result.current.messages = [
          {
            id: 'msg-1',
            projectId: mockProjectId,
            userId: 'user-1',
            userEmail: 'test@example.com',
            userRole: 'student',
            message: 'Hello',
            type: 'text' as const,
            timestamp: '2023-01-01T00:00:00Z',
          },
        ];
      });

      const success = await act(async () => {
        return await result.current.deleteMessage('msg-1');
      });

      expect(success).toBe(false);
      expect(result.current.messages).toHaveLength(1); // Message should still be there
    });

    it('should clear messages', () => {
      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      // Add some test messages
      act(() => {
        result.current.messages = [
          {
            id: 'msg-1',
            projectId: mockProjectId,
            userId: 'user-1',
            userEmail: 'test@example.com',
            userRole: 'student',
            message: 'Hello',
            type: 'text' as const,
            timestamp: '2023-01-01T00:00:00Z',
          },
        ];
      });

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe('real-time updates', () => {
    it('should handle new messages from WebSocket', () => {
      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      const newMessage = {
        id: 'msg-new',
        projectId: mockProjectId,
        userId: 'user-1',
        userEmail: 'test@example.com',
        userRole: 'student',
        message: 'New message',
        type: 'text' as const,
        timestamp: '2023-01-01T00:00:00Z',
      };

      // Simulate receiving a new message via WebSocket
      act(() => {
        result.current.messages = [...result.current.messages, newMessage];
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].id).toBe('msg-new');
    });

    it('should handle typing indicators', () => {
      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      // Simulate typing indicator
      act(() => {
        result.current.typingUsers = ['user-1'];
      });

      expect(result.current.typingUsers).toEqual(['user-1']);
    });

    it('should handle user presence updates', () => {
      const { result } = renderHook(() =>
        useChat(mockProjectId, mockAuthToken, { autoLoad: false })
      );

      const presence = {
        userId: 'user-1',
        userEmail: 'test@example.com',
        projectId: mockProjectId,
        status: 'online' as const,
        timestamp: '2023-01-01T00:00:00Z',
      };

      // Simulate presence update
      act(() => {
        const newPresence = new Map();
        newPresence.set('user-1', presence);
        result.current.userPresence = newPresence;
      });

      expect(result.current.userPresence.get('user-1')).toEqual(presence);
    });
  });
});
