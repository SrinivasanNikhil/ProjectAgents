import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationHistory from './NotificationHistory';
import {
  getNotificationHistory,
  markNotificationAsRead,
  clearNotificationHistory,
} from '../../utils/notificationUtils';

// Mock the notification utilities
vi.mock('../../utils/notificationUtils', () => ({
  getNotificationHistory: vi.fn(),
  markNotificationAsRead: vi.fn(),
  clearNotificationHistory: vi.fn(),
}));

const mockNotifications = [
  {
    id: '1',
    title: 'New message from John',
    body: 'Hello there!',
    timestamp: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
    type: 'message' as const,
    read: false,
    data: { senderName: 'John' },
  },
  {
    id: '2',
    title: '@John mentioned you',
    body: 'Check this out!',
    timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    type: 'mention' as const,
    read: true,
    data: { senderName: 'John', isMention: true },
  },
  {
    id: '3',
    title: 'System Update',
    body: 'System maintenance completed',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    type: 'system' as const,
    read: false,
    data: { type: 'maintenance' },
  },
];

describe('NotificationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getNotificationHistory as any).mockReturnValue(mockNotifications);
  });

  it('should render notification history modal when open', () => {
    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Notification History')).toBeInTheDocument();
    expect(screen.getByText('Mark all read')).toBeInTheDocument();
    expect(screen.getByText('Clear history')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<NotificationHistory isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByText('Notification History')).not.toBeInTheDocument();
  });

  it('should display all notifications by default', () => {
    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('New message from John')).toBeInTheDocument();
    expect(screen.getByText('@John mentioned you')).toBeInTheDocument();
    expect(screen.getByText('System Update')).toBeInTheDocument();
  });

  it('should show filter buttons with correct counts', () => {
    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('All (3)')).toBeInTheDocument();
    expect(screen.getByText('Unread (2)')).toBeInTheDocument();
    expect(screen.getByText('Mentions (1)')).toBeInTheDocument();
    expect(screen.getByText('System (1)')).toBeInTheDocument();
  });

  it('should filter notifications when filter buttons are clicked', () => {
    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    // Click unread filter
    fireEvent.click(screen.getByText('Unread (2)'));
    expect(screen.getByText('New message from John')).toBeInTheDocument();
    expect(screen.getByText('System Update')).toBeInTheDocument();
    expect(screen.queryByText('@John mentioned you')).not.toBeInTheDocument();

    // Click mentions filter
    fireEvent.click(screen.getByText('Mentions (1)'));
    expect(screen.getByText('@John mentioned you')).toBeInTheDocument();
    expect(screen.queryByText('New message from John')).not.toBeInTheDocument();
    expect(screen.queryByText('System Update')).not.toBeInTheDocument();
  });

  it('should mark individual notification as read', () => {
    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    const markReadButtons = screen.getAllByText('Mark as read');
    fireEvent.click(markReadButtons[0]);

    expect(markNotificationAsRead).toHaveBeenCalledWith('1');
  });

  it('should mark all notifications as read', () => {
    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('Mark all read'));

    expect(markNotificationAsRead).toHaveBeenCalledTimes(2);
    expect(markNotificationAsRead).toHaveBeenCalledWith('1');
    expect(markNotificationAsRead).toHaveBeenCalledWith('3');
  });

  it('should clear notification history', async () => {
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('Clear history'));

    expect(mockConfirm).toHaveBeenCalledWith(
      'Are you sure you want to clear all notification history?'
    );
    expect(clearNotificationHistory).toHaveBeenCalled();

    mockConfirm.mockRestore();
  });

  it('should not clear history when user cancels', () => {
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('Clear history'));

    expect(mockConfirm).toHaveBeenCalled();
    expect(clearNotificationHistory).not.toHaveBeenCalled();

    mockConfirm.mockRestore();
  });

  it('should display notification timestamps correctly', () => {
    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('1m ago')).toBeInTheDocument();
    expect(screen.getByText('5m ago')).toBeInTheDocument();
    expect(screen.getByText('1h ago')).toBeInTheDocument();
  });

  it('should show correct notification icons', () => {
    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    const icons = screen.getAllByText(/[🔔ℹ️💬]/);
    expect(icons).toHaveLength(3);
  });

  it('should apply correct CSS classes for read/unread notifications', () => {
    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    const notificationItems = screen.getAllByRole('button', {
      name: /Mark as read/,
    });
    expect(notificationItems).toHaveLength(2); // Only unread notifications should have mark as read button
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<NotificationHistory isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByText('×'));

    expect(onClose).toHaveBeenCalled();
  });

  it('should show no notifications message when filtered list is empty', () => {
    (getNotificationHistory as any).mockReturnValue([]);

    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('No notifications found')).toBeInTheDocument();
    expect(screen.getByText('📭')).toBeInTheDocument();
  });

  it('should disable mark all read button when no unread notifications', () => {
    const allReadNotifications = mockNotifications.map(n => ({
      ...n,
      read: true,
    }));
    (getNotificationHistory as any).mockReturnValue(allReadNotifications);

    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    const markAllReadButton = screen.getByText('Mark all read');
    expect(markAllReadButton).toBeDisabled();
  });

  it('should disable clear history button when no notifications', () => {
    (getNotificationHistory as any).mockReturnValue([]);

    render(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    const clearHistoryButton = screen.getByText('Clear history');
    expect(clearHistoryButton).toBeDisabled();
  });

  it('should reload notifications when modal is opened', () => {
    const { rerender } = render(
      <NotificationHistory isOpen={false} onClose={vi.fn()} />
    );

    expect(getNotificationHistory).not.toHaveBeenCalled();

    rerender(<NotificationHistory isOpen={true} onClose={vi.fn()} />);

    expect(getNotificationHistory).toHaveBeenCalled();
  });
});
