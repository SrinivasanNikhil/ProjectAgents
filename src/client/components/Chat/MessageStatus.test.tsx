import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MessageStatus from './MessageStatus';

describe('MessageStatus', () => {
  it('should render sending status with spinner', () => {
    render(<MessageStatus status="sending" />);
    expect(
      document.querySelector('.message-status__spinner')
    ).toBeInTheDocument();
  });

  it('should render sent status with checkmark', () => {
    render(<MessageStatus status="sent" />);
    // Check for SVG checkmark (rendered as path)
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('should render delivered status with double checkmark', () => {
    render(<MessageStatus status="delivered" />);
    const svgs = document.querySelectorAll('svg');
    expect(svgs).toHaveLength(2);
  });

  it('should render read status with double checkmark', () => {
    render(<MessageStatus status="read" />);
    const svgs = document.querySelectorAll('svg');
    expect(svgs).toHaveLength(2);
  });

  it('should render failed status with error icon', () => {
    render(<MessageStatus status="failed" />);
    expect(screen.getByText('Failed to send')).toBeInTheDocument();
  });

  it('should display timestamp when provided', () => {
    const timestamp = '2023-01-01T12:00:00Z';
    render(<MessageStatus status="sent" timestamp={timestamp} />);

    // Format depends on locale, so we check for time format
    const timeElement = screen.getByText(/\d{1,2}:\d{2}/);
    expect(timeElement).toBeInTheDocument();
  });

  it('should display read count when provided', () => {
    render(<MessageStatus status="read" readBy={['user1', 'user2']} />);
    expect(screen.getByTitle('Read by: user1, user2')).toBeInTheDocument();
  });

  it('should apply size classes', () => {
    const { container } = render(<MessageStatus status="sent" size="large" />);
    expect(container.firstChild).toHaveClass('message-status--large');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <MessageStatus status="sent" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show tooltip for read status with users', () => {
    render(<MessageStatus status="read" readBy={['user1', 'user2']} />);
    const statusElement = screen.getByTitle('Read by: user1, user2');
    expect(statusElement).toBeInTheDocument();
  });

  it('should not show tooltip for read status without users', () => {
    render(<MessageStatus status="read" readBy={[]} />);
    const statusElement = screen.getByTitle('');
    expect(statusElement).toBeInTheDocument();
  });

  it('should render with default size when not specified', () => {
    const { container } = render(<MessageStatus status="sent" />);
    expect(container.firstChild).toHaveClass('message-status--medium');
  });

  it('should handle empty readBy array', () => {
    render(<MessageStatus status="read" readBy={[]} />);
    expect(screen.getByTitle('')).toBeInTheDocument();
  });

  it('should handle undefined readBy', () => {
    render(<MessageStatus status="read" />);
    expect(screen.getByTitle('')).toBeInTheDocument();
  });
});
