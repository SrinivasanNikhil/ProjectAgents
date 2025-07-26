import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, MockedFunction } from 'vitest';
import MessageList from './MessageList';
import { WebSocketMessage } from '../../hooks/useWebSocket';

// Mock fetch globally
global.fetch = vi.fn();

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock window.URL.createObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  value: vi.fn(() => 'blob:mock-url'),
  writable: true,
});

// Mock window.alert
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true,
});

describe('MessageList', () => {
  const defaultProps = {
    messages: [],
    currentUser: {
      id: 'user-123',
      email: 'test@example.com',
      role: 'student',
    },
    typingUsers: [],
    authToken: 'token-123',
  };

  const mockTextMessage: WebSocketMessage = {
    id: 'msg-1',
    projectId: 'project-123',
    userId: 'user-123',
    userEmail: 'test@example.com',
    userRole: 'student',
    message: 'Hello, world!',
    timestamp: '2023-01-01T12:00:00Z',
    type: 'text',
  };

  const mockFileMessage: WebSocketMessage = {
    id: 'msg-2',
    projectId: 'project-123',
    userId: 'user-456',
    userEmail: 'other@example.com',
    userRole: 'instructor',
    message: 'File uploaded',
    timestamp: '2023-01-01T12:01:00Z',
    type: 'file',
    metadata: {
      fileName: 'document.pdf',
      fileSize: 1024000,
      fileType: 'application/pdf',
      artifactId: 'artifact-123',
    },
  };

  const mockImageMessage: WebSocketMessage = {
    id: 'msg-3',
    projectId: 'project-123',
    userId: 'user-123',
    userEmail: 'test@example.com',
    userRole: 'student',
    message: 'Image uploaded',
    timestamp: '2023-01-01T12:02:00Z',
    type: 'file',
    metadata: {
      fileName: 'image.jpg',
      fileSize: 2048000,
      fileType: 'image/jpeg',
      artifactId: 'artifact-456',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no messages', () => {
    render(<MessageList {...defaultProps} />);

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByText('Start the conversation!')).toBeInTheDocument();
  });

  it('renders text messages correctly', () => {
    const messages = [mockTextMessage];
    render(<MessageList {...defaultProps} messages={messages} />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    // Own messages don't show user info
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('renders file messages correctly', () => {
    const messages = [mockFileMessage];
    render(<MessageList {...defaultProps} messages={messages} />);

    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('1000 KB')).toBeInTheDocument();
    expect(screen.getByText('• application/pdf')).toBeInTheDocument();
  });

  it('renders image messages with preview button', () => {
    const messages = [mockImageMessage];
    render(<MessageList {...defaultProps} messages={messages} />);

    expect(screen.getByText('image.jpg')).toBeInTheDocument();
    expect(screen.getByText('2 MB')).toBeInTheDocument();
    expect(screen.getByTitle('Preview')).toBeInTheDocument();
    expect(screen.getByTitle('Download')).toBeInTheDocument();
  });

  it('handles file download correctly', async () => {
    const mockFetch = global.fetch as MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test'])),
    } as Response);

    const messages = [mockFileMessage];
    render(<MessageList {...defaultProps} messages={messages} />);

    const downloadButton = screen.getByTitle('Download');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/artifacts/artifact-123/download',
        {
          headers: {
            Authorization: 'Bearer token-123',
          },
        }
      );
    });
  });

  it('handles file preview correctly', async () => {
    const mockFetch = global.fetch as MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ previewUrl: 'https://example.com/preview' }),
    } as Response);

    const messages = [mockImageMessage];
    render(<MessageList {...defaultProps} messages={messages} />);

    const previewButton = screen.getByTitle('Preview');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/artifacts/artifact-456/preview',
        {
          headers: {
            Authorization: 'Bearer token-123',
          },
        }
      );
    });
  });

  it('shows download error on failed download', async () => {
    const mockFetch = global.fetch as MockedFunction<typeof fetch>;
    mockFetch.mockRejectedValueOnce(new Error('Download failed'));

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const messages = [mockFileMessage];
    render(<MessageList {...defaultProps} messages={messages} />);

    const downloadButton = screen.getByTitle('Download');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to download file');
    });

    alertSpy.mockRestore();
  });

  it('formats file sizes correctly', () => {
    const smallFileMessage: WebSocketMessage = {
      ...mockFileMessage,
      metadata: {
        ...mockFileMessage.metadata!,
        fileSize: 512,
      },
    };

    const messages = [smallFileMessage];
    render(<MessageList {...defaultProps} messages={messages} />);

    expect(screen.getByText('512 Bytes')).toBeInTheDocument();
  });

  it('shows user info for consecutive messages from different users', () => {
    const messages = [mockTextMessage, mockFileMessage];
    render(<MessageList {...defaultProps} messages={messages} />);

    // First message is own message, so no user info shown
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
    // Second message is from other user, so user info is shown
    expect(screen.getByText('other@example.com')).toBeInTheDocument();
  });

  it('does not show download buttons without auth token', () => {
    const messages = [mockFileMessage];
    render(
      <MessageList
        {...defaultProps}
        messages={messages}
        authToken={undefined}
      />
    );

    expect(screen.queryByTitle('Download')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Preview')).not.toBeInTheDocument();
  });

  it('shows correct file icons for different file types', () => {
    const pdfMessage = { ...mockFileMessage };
    const imageMessage = { ...mockImageMessage };
    const zipMessage: WebSocketMessage = {
      ...mockFileMessage,
      id: 'msg-4',
      metadata: {
        ...mockFileMessage.metadata!,
        fileType: 'application/zip',
      },
    };

    const messages = [pdfMessage, imageMessage, zipMessage];
    render(<MessageList {...defaultProps} messages={messages} />);

    // Check that file icons are rendered (they're emoji characters)
    const fileIcons = screen.getAllByText(/[📄🖼️📦📎]/);
    expect(fileIcons.length).toBeGreaterThan(0);
  });
});
