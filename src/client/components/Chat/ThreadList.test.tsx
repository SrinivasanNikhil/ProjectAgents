import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ThreadList from './ThreadList';

// Mock the fetch API
global.fetch = vi.fn();

const mockCurrentUser = {
  id: 'user1',
  email: 'test@example.com',
  role: 'student',
};

const mockThreads = [
  {
    id: 'thread1',
    projectId: 'project1',
    userId: 'user1',
    userEmail: 'user1@example.com',
    userRole: 'student',
    message: 'First message in thread',
    type: 'text' as const,
    threadId: 'thread1',
    threadTitle: 'Discussion about feature',
    threadDepth: 0,
    threadPosition: 0,
    isThreadRoot: true,
    threadMessageCount: 5,
    timestamp: '2024-01-01T10:00:00Z',
  },
  {
    id: 'thread2',
    projectId: 'project1',
    userId: 'user2',
    userEmail: 'user2@example.com',
    userRole: 'persona',
    message: 'Another thread',
    type: 'text' as const,
    threadId: 'thread2',
    threadTitle: 'Bug report',
    threadDepth: 0,
    threadPosition: 0,
    isThreadRoot: true,
    threadMessageCount: 3,
    timestamp: '2024-01-01T11:00:00Z',
    isPersonaMessage: true,
  },
];

describe('ThreadList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders thread list with threads', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ threads: mockThreads }),
    });

    render(
      <ThreadList
        projectId="project1"
        authToken="test-token"
        currentUser={mockCurrentUser}
        onThreadSelect={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Discussion about feature')).toBeInTheDocument();
      expect(screen.getByText('Bug report')).toBeInTheDocument();
    });
  });

  it('displays thread information correctly', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ threads: mockThreads }),
    });

    render(
      <ThreadList
        projectId="project1"
        authToken="test-token"
        currentUser={mockCurrentUser}
        onThreadSelect={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('5 messages')).toBeInTheDocument();
      expect(screen.getByText('3 messages')).toBeInTheDocument();
    });
  });

  it('calls onThreadSelect when thread is clicked', async () => {
    const mockOnThreadSelect = vi.fn();
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ threads: mockThreads }),
    });

    render(
      <ThreadList
        projectId="project1"
        authToken="test-token"
        currentUser={mockCurrentUser}
        onThreadSelect={mockOnThreadSelect}
      />
    );

    await waitFor(() => {
      const threadItem = screen.getByText('Discussion about feature');
      fireEvent.click(threadItem);
      expect(mockOnThreadSelect).toHaveBeenCalledWith('thread1');
    });
  });

  it('shows loading state initially', () => {
    (fetch as any).mockImplementation(() => new Promise(() => {}));

    render(
      <ThreadList
        projectId="project1"
        authToken="test-token"
        currentUser={mockCurrentUser}
        onThreadSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Loading threads...')).toBeInTheDocument();
  });

  it('shows error state when API call fails', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('API Error'));

    render(
      <ThreadList
        projectId="project1"
        authToken="test-token"
        currentUser={mockCurrentUser}
        onThreadSelect={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load threads')).toBeInTheDocument();
    });
  });

  it('filters threads based on search query', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ threads: mockThreads }),
    });

    render(
      <ThreadList
        projectId="project1"
        authToken="test-token"
        currentUser={mockCurrentUser}
        onThreadSelect={vi.fn()}
      />
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search threads...');
      fireEvent.change(searchInput, { target: { value: 'feature' } });
    });

    expect(screen.getByText('Discussion about feature')).toBeInTheDocument();
    expect(screen.queryByText('Bug report')).not.toBeInTheDocument();
  });
});
