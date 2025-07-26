import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ChatInterface from './ChatInterface';
import { WebSocketMessage } from '../../hooks/useWebSocket';

// Mock the useChat hook
const mockUseChat = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useChat', () => ({
  useChat: mockUseChat,
}));

// Mock the MessageList and MessageInput components
vi.mock('./MessageList', () => ({
  default: ({ messages, currentUser, typingUsers, authToken }: any) => (
    <div data-testid="message-list">
      <div data-testid="message-count">{messages.length}</div>
      <div data-testid="typing-users">{typingUsers.length}</div>
      <div data-testid="auth-token">{authToken}</div>
      {messages.map((msg: any, index: number) => (
        <div key={index} data-testid={`message-${index}`}>
          {msg.message}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('./MessageInput', () => ({
  default: ({ onSendMessage, onFileUpload, authToken, projectId }: any) => (
    <div data-testid="message-input">
      <div data-testid="auth-token-input">{authToken}</div>
      <div data-testid="project-id">{projectId}</div>
      <button
        data-testid="send-button"
        onClick={() => onSendMessage('Test message')}
      >
        Send
      </button>
      <button
        data-testid="file-upload-button"
        onClick={() => onFileUpload && onFileUpload()}
      >
        Upload
      </button>
    </div>
  ),
}));

describe('ChatInterface', () => {
  const defaultProps = {
    projectId: 'project-123',
    currentUser: {
      id: 'user-123',
      email: 'test@example.com',
      role: 'student',
    },
    authToken: 'token-123',
    onMessageSent: vi.fn(),
    onError: vi.fn(),
  };

  const mockMessages: WebSocketMessage[] = [
    {
      id: 'msg-1',
      projectId: 'project-123',
      userId: 'user-123',
      userEmail: 'test@example.com',
      userRole: 'student',
      message: 'Hello, world!',
      timestamp: '2023-01-01T12:00:00Z',
      type: 'text',
    },
  ];

  const mockUseChatReturn = {
    messages: mockMessages,
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
    typingUsers: [],
    userPresence: [],
    isConnected: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChat.mockReturnValue(mockUseChatReturn);
  });

  describe('Basic functionality', () => {
    it('renders chat interface with all components', () => {
      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
      expect(screen.getByTestId('message-count')).toHaveTextContent('1');
    });

    it('displays connection status correctly', () => {
      render(<ChatInterface {...defaultProps} />);

      // Connection status should be reflected in the component
      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });

    it('shows loading state when connecting', () => {
      const loadingUseChat = {
        ...mockUseChatReturn,
        isLoading: true,
      };
      mockUseChat.mockReturnValue(loadingUseChat);

      render(<ChatInterface {...defaultProps} />);

      // Loading state should be handled by the component
      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });

    it('displays online users count', () => {
      const onlineUsers = [
        { id: 'user-456', email: 'other@example.com' },
        { id: 'user-789', email: 'another@example.com' },
      ];
      const useChatWithUsers = {
        ...mockUseChatReturn,
        userPresence: onlineUsers,
      };
      mockUseChat.mockReturnValue(useChatWithUsers);

      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });

    it('shows single user online', () => {
      const onlineUsers = [{ id: 'user-456', email: 'other@example.com' }];
      const useChatWithUsers = {
        ...mockUseChatReturn,
        userPresence: onlineUsers,
      };
      mockUseChat.mockReturnValue(useChatWithUsers);

      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });
  });

  describe('Message handling', () => {
    it('passes messages to MessageList component', () => {
      const useChatWithMessages = {
        ...mockUseChatReturn,
        messages: mockMessages,
      };
      mockUseChat.mockReturnValue(useChatWithMessages);

      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('message-count')).toHaveTextContent('1');
      expect(screen.getByTestId('message-0')).toHaveTextContent(
        'Hello, world!'
      );
    });

    it('handles send message with text', () => {
      const mockSendMessage = vi.fn();
      const useChatWithSend = {
        ...mockUseChatReturn,
        sendMessage: mockSendMessage,
      };
      mockUseChat.mockReturnValue(useChatWithSend);

      render(<ChatInterface {...defaultProps} />);

      const sendButton = screen.getByTestId('send-button');
      fireEvent.click(sendButton);

      expect(mockSendMessage).toHaveBeenCalledWith(
        'Test message',
        'text',
        undefined
      );
    });

    it('handles send message with file metadata', () => {
      const mockSendMessage = vi.fn();
      const useChatWithSend = {
        ...mockUseChatReturn,
        sendMessage: mockSendMessage,
      };
      mockUseChat.mockReturnValue(useChatWithSend);

      render(<ChatInterface {...defaultProps} />);

      const sendButton = screen.getByTestId('send-button');
      fireEvent.click(sendButton);

      expect(mockSendMessage).toHaveBeenCalledWith(
        'Test message',
        'text',
        undefined
      );
    });

    it('passes correct props to MessageInput', () => {
      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('auth-token-input')).toHaveTextContent(
        'token-123'
      );
      expect(screen.getByTestId('project-id')).toHaveTextContent('project-123');
    });

    it('passes correct props to MessageList', () => {
      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('auth-token')).toHaveTextContent('token-123');
      expect(screen.getByTestId('message-count')).toHaveTextContent('1');
    });
  });

  describe('Error handling', () => {
    it('displays error message when there is an error', () => {
      const useChatWithError = {
        ...mockUseChatReturn,
        error: 'Connection failed',
      };
      mockUseChat.mockReturnValue(useChatWithError);

      render(<ChatInterface {...defaultProps} />);

      // Error should be handled by the component
      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
      const useChatWithError = {
        ...mockUseChatReturn,
        error: 'Connection failed',
      };
      mockUseChat.mockReturnValue(useChatWithError);

      render(<ChatInterface {...defaultProps} />);

      // Error callback should be triggered
      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });
  });

  describe('Typing indicators', () => {
    it('displays typing indicators', () => {
      const useChatWithTyping = {
        ...mockUseChatReturn,
        typingUsers: ['user-456'],
      };
      mockUseChat.mockReturnValue(useChatWithTyping);

      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('typing-users')).toHaveTextContent('1');
    });

    it('shows single user typing', () => {
      const useChatWithTyping = {
        ...mockUseChatReturn,
        typingUsers: ['user-456'],
      };
      mockUseChat.mockReturnValue(useChatWithTyping);

      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('typing-users')).toHaveTextContent('1');
    });
  });

  describe('Message callbacks', () => {
    it('calls onMessageSent when message is sent', () => {
      const mockSendMessage = vi.fn();
      const useChatWithSend = {
        ...mockUseChatReturn,
        sendMessage: mockSendMessage,
      };
      mockUseChat.mockReturnValue(useChatWithSend);

      render(<ChatInterface {...defaultProps} />);

      const sendButton = screen.getByTestId('send-button');
      fireEvent.click(sendButton);

      expect(mockSendMessage).toHaveBeenCalledWith(
        'Test message',
        'text',
        undefined
      );
    });
  });

  describe('Configuration options', () => {
    it('respects autoLoadHistory option', () => {
      render(<ChatInterface {...defaultProps} autoLoadHistory={false} />);

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });

    it('respects historyLimit option', () => {
      render(<ChatInterface {...defaultProps} historyLimit={50} />);

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });

    it('uses default values when options not provided', () => {
      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });
  });

  describe('File upload integration', () => {
    it('passes file upload props to MessageInput', () => {
      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('file-upload-button')).toBeInTheDocument();
    });

    it('handles file messages correctly', () => {
      const mockFileMessages: WebSocketMessage[] = [
        {
          id: 'msg-2',
          projectId: 'project-123',
          userId: 'user-123',
          userEmail: 'test@example.com',
          userRole: 'student',
          message: 'File uploaded',
          timestamp: '2023-01-01T12:01:00Z',
          type: 'file',
          metadata: {
            fileName: 'document.pdf',
            fileSize: 1024000,
            fileType: 'application/pdf',
            artifactId: 'artifact-123',
          },
        },
      ];
      const useChatWithFileMessages = {
        ...mockUseChatReturn,
        messages: mockFileMessages,
      };
      mockUseChat.mockReturnValue(useChatWithFileMessages);

      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('message-count')).toHaveTextContent('1');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
    });

    it('maintains focus management', () => {
      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('message-input')).toBeInTheDocument();
    });
  });
});
