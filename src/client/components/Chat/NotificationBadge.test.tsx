import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NotificationBadge from './NotificationBadge';

describe('NotificationBadge', () => {
  it('should render with count', () => {
    render(<NotificationBadge count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should not render when count is 0 and showZero is false', () => {
    const { container } = render(<NotificationBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when count is 0 and showZero is true', () => {
    render(<NotificationBadge count={0} showZero />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should format count when exceeding maxCount', () => {
    render(<NotificationBadge count={150} maxCount={99} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('should apply size classes', () => {
    const { container } = render(<NotificationBadge count={5} size="large" />);
    expect(container.firstChild).toHaveClass('notification-badge--large');
  });

  it('should apply variant classes', () => {
    const { container } = render(
      <NotificationBadge count={5} variant="success" />
    );
    expect(container.firstChild).toHaveClass('notification-badge--success');
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<NotificationBadge count={5} onClick={handleClick} />);

    fireEvent.click(screen.getByText('5'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick when Enter key is pressed', () => {
    const handleClick = vi.fn();
    render(<NotificationBadge count={5} onClick={handleClick} />);

    fireEvent.keyDown(screen.getByText('5'), { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick when Space key is pressed', () => {
    const handleClick = vi.fn();
    render(<NotificationBadge count={5} onClick={handleClick} />);

    fireEvent.keyDown(screen.getByText('5'), { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick for other keys', () => {
    const handleClick = vi.fn();
    render(<NotificationBadge count={5} onClick={handleClick} />);

    fireEvent.keyDown(screen.getByText('5'), { key: 'Tab' });
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should have button role when onClick is provided', () => {
    render(<NotificationBadge count={5} onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should not have button role when onClick is not provided', () => {
    render(<NotificationBadge count={5} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <NotificationBadge count={5} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should have tabIndex when onClick is provided', () => {
    render(<NotificationBadge count={5} onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
  });
});
