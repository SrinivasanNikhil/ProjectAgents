import React, { useState, useEffect } from 'react';
import {
  NotificationPreferences,
  notificationManager,
  requestNotificationPermission,
} from '../../utils/notificationUtils';
import './NotificationSettings.css';

export interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  isOpen,
  onClose,
  className = '',
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    notificationManager.getPreferences()
  );
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermission>(notificationManager.getPermissionStatus());
  const [isSupported, setIsSupported] = useState(
    notificationManager.isSupported()
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPreferences(notificationManager.getPreferences());
      setPermissionStatus(notificationManager.getPermissionStatus());
      setIsSupported(notificationManager.isSupported());
    }
  }, [isOpen]);

  const handlePermissionRequest = async () => {
    setIsLoading(true);
    try {
      const granted = await requestNotificationPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
    } catch (error) {
      console.error('Failed to request permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = (
    key: keyof NotificationPreferences,
    value: any
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    notificationManager.setPreferences(newPreferences);
  };

  const handleQuietHoursChange = (
    key: keyof NotificationPreferences['quietHours'],
    value: any
  ) => {
    const newPreferences = {
      ...preferences,
      quietHours: { ...preferences.quietHours, [key]: value },
    };
    setPreferences(newPreferences);
    notificationManager.setPreferences(newPreferences);
  };

  const handleTestNotification = async () => {
    await notificationManager.notifySystemMessage(
      'Test Notification',
      'This is a test notification to verify your settings are working correctly.',
      { type: 'test' }
    );
  };

  const handleTestSound = async () => {
    await notificationManager.notify(
      {
        title: 'Test Sound',
        body: 'Testing notification sound...',
        silent: true,
      },
      'message'
    );
  };

  if (!isOpen) return null;

  return (
    <div className={`notification-settings-overlay ${className}`}>
      <div className="notification-settings-modal">
        <div className="notification-settings-header">
          <h2>Notification Settings</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="notification-settings-content">
          {!isSupported && (
            <div className="notification-warning">
              <span className="warning-icon">⚠️</span>
              <span>Notifications are not supported in your browser.</span>
            </div>
          )}

          {/* Permission Status */}
          <div className="setting-section">
            <h3>Permission Status</h3>
            <div className="permission-status">
              <span className={`status-indicator ${permissionStatus}`}>
                {permissionStatus === 'granted' && '✅ Granted'}
                {permissionStatus === 'denied' && '❌ Denied'}
                {permissionStatus === 'default' && '⏳ Not Set'}
              </span>
              {permissionStatus === 'default' && (
                <button
                  className="request-permission-button"
                  onClick={handlePermissionRequest}
                  disabled={isLoading}
                >
                  {isLoading ? 'Requesting...' : 'Request Permission'}
                </button>
              )}
              {permissionStatus === 'denied' && (
                <p className="permission-help">
                  Please enable notifications in your browser settings to
                  receive notifications.
                </p>
              )}
            </div>
          </div>

          {/* General Settings */}
          <div className="setting-section">
            <h3>General Settings</h3>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={preferences.enabled}
                  onChange={e =>
                    handlePreferenceChange('enabled', e.target.checked)
                  }
                />
                <span>Enable notifications</span>
              </label>
            </div>
          </div>

          {/* Notification Types */}
          <div className="setting-section">
            <h3>Notification Types</h3>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={preferences.sound}
                  onChange={e =>
                    handlePreferenceChange('sound', e.target.checked)
                  }
                />
                <span>Sound notifications</span>
              </label>
            </div>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={preferences.browser}
                  onChange={e =>
                    handlePreferenceChange('browser', e.target.checked)
                  }
                />
                <span>Browser notifications</span>
              </label>
            </div>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={preferences.desktop}
                  onChange={e =>
                    handlePreferenceChange('desktop', e.target.checked)
                  }
                />
                <span>Desktop notifications</span>
              </label>
            </div>
          </div>

          {/* Message Types */}
          <div className="setting-section">
            <h3>Message Types</h3>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={preferences.mentions}
                  onChange={e =>
                    handlePreferenceChange('mentions', e.target.checked)
                  }
                />
                <span>Mentions (@username)</span>
              </label>
            </div>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={preferences.directMessages}
                  onChange={e =>
                    handlePreferenceChange('directMessages', e.target.checked)
                  }
                />
                <span>Direct messages</span>
              </label>
            </div>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={preferences.groupMessages}
                  onChange={e =>
                    handlePreferenceChange('groupMessages', e.target.checked)
                  }
                />
                <span>Group messages</span>
              </label>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="setting-section">
            <h3>Quiet Hours</h3>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={preferences.quietHours.enabled}
                  onChange={e =>
                    handleQuietHoursChange('enabled', e.target.checked)
                  }
                />
                <span>Enable quiet hours</span>
              </label>
            </div>
            {preferences.quietHours.enabled && (
              <div className="quiet-hours-settings">
                <div className="time-input-group">
                  <label>Start time:</label>
                  <input
                    type="time"
                    value={preferences.quietHours.start}
                    onChange={e =>
                      handleQuietHoursChange('start', e.target.value)
                    }
                  />
                </div>
                <div className="time-input-group">
                  <label>End time:</label>
                  <input
                    type="time"
                    value={preferences.quietHours.end}
                    onChange={e =>
                      handleQuietHoursChange('end', e.target.value)
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test Section */}
          <div className="setting-section">
            <h3>Test Notifications</h3>
            <div className="test-buttons">
              <button
                className="test-button"
                onClick={handleTestNotification}
                disabled={
                  !preferences.enabled || permissionStatus !== 'granted'
                }
              >
                Test Notification
              </button>
              <button
                className="test-button"
                onClick={handleTestSound}
                disabled={!preferences.sound}
              >
                Test Sound
              </button>
            </div>
          </div>
        </div>

        <div className="notification-settings-footer">
          <button className="save-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
