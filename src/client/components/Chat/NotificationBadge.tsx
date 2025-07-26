import React from 'react';
import './NotificationBadge.css';

export interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  showZero?: boolean;
  className?: string;
  onClick?: () => void;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  size = 'medium',
  variant = 'default',
  showZero = false,
  className = '',
  onClick,
}) => {
  // Don't render if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }

  // Format the count display
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  // Determine if we should show the badge
  const shouldShow = count > 0 || showZero;

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      className={`notification-badge notification-badge--${size} notification-badge--${variant} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <span className="notification-badge__count">{displayCount}</span>
    </div>
  );
};

export default NotificationBadge;
