import React, { useState, useEffect } from 'react';
import { ChatMessage } from '../../hooks/useChat';
import './ThreadList.css';

export interface ThreadListProps {
  projectId: string;
  authToken: string;
  currentUser: {
    id: string;
    email: string;
    role: string;
  };
  onThreadSelect: (threadId: string) => void;
  selectedThreadId?: string;
  className?: string;
}

const ThreadList: React.FC<ThreadListProps> = ({
  projectId,
  authToken,
  currentUser,
  onThreadSelect,
  selectedThreadId,
  className = '',
}) => {
  const [threads, setThreads] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredThreads, setFilteredThreads] = useState<ChatMessage[]>([]);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  // Load thread list
  const loadThreads = async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/chat/threads/${projectId}?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load threads: ${response.statusText}`);
      }

      const data = await response.json();
      setThreads(data.threads || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load threads';
      setError(errorMessage);
      console.error('Error loading threads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter threads based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredThreads(threads);
    } else {
      const filtered = threads.filter(
        thread =>
          thread.threadTitle
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          thread.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          thread.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredThreads(filtered);
    }
  }, [threads, searchQuery]);

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, [projectId]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleThreadClick = (threadId: string) => {
    onThreadSelect(threadId);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  if (isLoading) {
    return (
      <div className={`thread-list ${className}`}>
        <div className="thread-list-loading">
          <div className="loading-spinner"></div>
          <span>Loading threads...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`thread-list ${className}`}>
        <div className="thread-list-error">
          <span className="error-message">{error}</span>
          <button onClick={loadThreads} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`thread-list ${className}`}>
      <div className="thread-list-header">
        <h3 className="thread-list-title">Threads</h3>
        <div className="thread-list-search">
          <input
            type="text"
            placeholder="Search threads..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="thread-search-input"
          />
        </div>
      </div>

      <div className="thread-list-content">
        {filteredThreads.length === 0 ? (
          <div className="thread-list-empty">
            {searchQuery ? (
              <>
                <span>No threads found matching "{searchQuery}"</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="clear-search-button"
                >
                  Clear search
                </button>
              </>
            ) : (
              <span>No threads yet</span>
            )}
          </div>
        ) : (
          <div className="thread-items">
            {filteredThreads.map(thread => (
              <div
                key={thread.threadId}
                className={`thread-item ${
                  selectedThreadId === thread.threadId ? 'selected' : ''
                }`}
                onClick={() => handleThreadClick(thread.threadId!)}
              >
                <div className="thread-item-header">
                  <div className="thread-title">
                    {thread.threadTitle ||
                      thread.message.substring(0, 50) + '...'}
                  </div>
                  <div className="thread-timestamp">
                    {formatTimestamp(thread.timestamp)}
                  </div>
                </div>
                <div className="thread-item-content">
                  <div className="thread-message">
                    {thread.message.substring(0, 100)}
                    {thread.message.length > 100 && '...'}
                  </div>
                  <div className="thread-meta">
                    <span className="thread-author">
                      {thread.isPersonaMessage
                        ? `Persona: ${thread.userEmail}`
                        : thread.userEmail}
                    </span>
                    <span className="thread-count">
                      {thread.threadMessageCount} messages
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadList;
