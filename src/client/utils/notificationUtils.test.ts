import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NotificationManager,
  notificationManager,
  notifyNewMessage,
  notifySystemMessage,
  notifyUserJoined,
  notifyUserLeft,
  setNotificationPreferences,
  getNotificationPreferences,
  requestNotificationPermission,
} from './notificationUtils';

// Mock browser APIs
const mockRequestPermission = vi.fn();
const mockAudioContext = vi.fn().mockReturnValue({
  close: vi.fn(),
  resume: vi.fn().mockResolvedValue(undefined),
  state: 'running',
});

const mockNotification = vi.fn() as any;
mockNotification.requestPermission = mockRequestPermission;

Object.defineProperty(window, 'Notification', {
  value: mockNotification,
  writable: true,
});

Object.defineProperty(window, 'AudioContext', {
  value: mockAudioContext,
  writable: true,
});

Object.defineProperty(window, 'webkitAudioContext', {
  value: mockAudioContext,
  writable: true,
});

// Mock Audio
const mockAudio = vi.fn().mockReturnValue({
  play: vi.fn().mockResolvedValue(undefined),
  load: vi.fn(),
  addEventListener: vi.fn(),
  preload: 'auto',
  volume: 0.5,
});

Object.defineProperty(window, 'Audio', {
  value: mockAudio,
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('NotificationManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});

    // Reset Notification.permission
    Object.defineProperty(mockNotification, 'permission', {
      value: 'default',
      writable: true,
    });

    // Reset requestPermission
    mockNotification.requestPermission = mockRequestPermission;

    // Reset Audio mock
    mockAudio.mockReturnValue({
      play: vi.fn().mockResolvedValue(undefined),
      load: vi.fn(),
      addEventListener: vi.fn((event, callback) => {
        if (event === 'canplaythrough') {
          setTimeout(callback, 0);
        }
      }),
      preload: 'auto',
      volume: 0.5,
    });

    // Clear the singleton instance to reset state
    (NotificationManager as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = NotificationManager.getInstance();
      const instance2 = NotificationManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('requestNotificationPermission', () => {
    it('should return false if Notification is not supported', async () => {
      const originalNotification = window.Notification;
      Object.defineProperty(window, 'Notification', {
        value: undefined,
        writable: true,
      });

      const result = await notificationManager.requestNotificationPermission();
      expect(result).toBe(false);

      Object.defineProperty(window, 'Notification', {
        value: originalNotification,
        writable: true,
      });
    });

    it('should return true if permission is already granted', async () => {
      // Reset the notification manager to pick up the new permission
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true,
      });

      // Clear the singleton instance to force re-initialization
      (NotificationManager as any).instance = undefined;

      // Get a fresh instance
      const freshManager = NotificationManager.getInstance();
      const result = await freshManager.requestNotificationPermission();
      expect(result).toBe(true);
    });

    it('should request permission and return result', async () => {
      mockRequestPermission.mockResolvedValue('granted');

      const result = await notificationManager.requestNotificationPermission();

      expect(mockRequestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('preferences', () => {
    it('should have default preferences', () => {
      const preferences = notificationManager.getPreferences();
      expect(preferences.enabled).toBe(true);
      expect(preferences.sound).toBe(true);
      expect(preferences.browser).toBe(true);
      expect(preferences.desktop).toBe(true);
    });

    it('should update preferences', () => {
      const newPreferences = {
        enabled: false,
        sound: false,
      };

      notificationManager.setPreferences(newPreferences);
      const updatedPreferences = notificationManager.getPreferences();

      expect(updatedPreferences.enabled).toBe(false);
      expect(updatedPreferences.sound).toBe(false);
      expect(updatedPreferences.browser).toBe(true); // Should remain unchanged
    });

    it('should save preferences to localStorage', () => {
      const newPreferences = { enabled: false };
      notificationManager.setPreferences(newPreferences);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'notification-preferences',
        expect.stringContaining('"enabled":false')
      );
    });

    it('should load preferences from localStorage', () => {
      const storedPreferences = JSON.stringify({
        enabled: false,
        sound: false,
      });
      localStorageMock.getItem.mockReturnValue(storedPreferences);

      // Create new instance to trigger loading
      const newManager = new (NotificationManager as any)();
      const preferences = newManager.getPreferences();

      expect(preferences.enabled).toBe(false);
      expect(preferences.sound).toBe(false);

      newManager.destroy();
    });
  });

  describe('quietHours', () => {
    it('should return false when quiet hours are disabled', () => {
      notificationManager.setPreferences({
        quietHours: { enabled: false, start: '22:00', end: '08:00' },
      });

      expect(notificationManager.isQuietHours()).toBe(false);
    });

    it('should return true during quiet hours (same day)', () => {
      notificationManager.setPreferences({
        quietHours: { enabled: true, start: '09:00', end: '17:00' },
      });

      // Mock current time to 12:00 (during quiet hours)
      const mockDate = new Date('2023-01-01T12:00:00');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      expect(notificationManager.isQuietHours()).toBe(true);

      vi.restoreAllMocks();
    });

    it('should return true during quiet hours (overnight)', () => {
      notificationManager.setPreferences({
        quietHours: { enabled: true, start: '22:00', end: '08:00' },
      });

      // Mock current time to 23:00 (during quiet hours)
      const mockDate = new Date('2023-01-01T23:00:00');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      expect(notificationManager.isQuietHours()).toBe(true);

      vi.restoreAllMocks();
    });
  });

  describe('notifications', () => {
    beforeEach(() => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true,
      });
    });

    it('should not notify when notifications are disabled', async () => {
      notificationManager.setPreferences({ enabled: false });

      const notifySpy = vi.spyOn(
        notificationManager as any,
        'showBrowserNotification'
      );

      await notificationManager.notify({
        title: 'Test',
        body: 'Test message',
      });

      expect(notifySpy).not.toHaveBeenCalled();
    });

    it('should not notify during quiet hours', async () => {
      notificationManager.setPreferences({
        quietHours: { enabled: true, start: '09:00', end: '17:00' },
      });

      // Mock current time to 12:00 (during quiet hours)
      const mockDate = new Date('2023-01-01T12:00:00');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const notifySpy = vi.spyOn(
        notificationManager as any,
        'showBrowserNotification'
      );

      await notificationManager.notify({
        title: 'Test',
        body: 'Test message',
      });

      expect(notifySpy).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it('should show browser notification when enabled', async () => {
      const mockNotificationInstance = {
        close: vi.fn(),
        onclick: null as any,
      };
      mockNotification.mockReturnValue(mockNotificationInstance);

      // Set permission to granted
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true,
      });

      // Clear the singleton instance to force re-initialization
      (NotificationManager as any).instance = undefined;

      // Get a fresh instance
      const freshManager = NotificationManager.getInstance();

      // Disable sound to avoid audio loading issues
      freshManager.setPreferences({ sound: false });

      await freshManager.notify({
        title: 'Test Title',
        body: 'Test Body',
      });

      expect(mockNotification).toHaveBeenCalledWith('Test Title', {
        body: 'Test Body',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: undefined,
        data: undefined,
        requireInteraction: false,
        silent: false,
      });
    }, 10000);
  });

  describe('convenience functions', () => {
    beforeEach(() => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true,
      });
    });

    it('should call notifyNewMessage', async () => {
      const notifySpy = vi.spyOn(notificationManager, 'notify');

      await notifyNewMessage('John', 'Hello world', false, 'Project A');

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New message from John',
          body: expect.stringContaining('Hello world'),
        }),
        'message'
      );
    });

    it('should call notifySystemMessage', async () => {
      const notifySpy = vi.spyOn(notificationManager, 'notify');

      await notifySystemMessage('System Alert', 'System message');

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'System Alert',
          body: 'System message',
        }),
        'system'
      );
    });

    it('should call notifyUserJoined', async () => {
      const notifySpy = vi.spyOn(notificationManager, 'notify');

      await notifyUserJoined('John', 'Project A');

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'John joined the conversation',
          body: 'in Project A',
        }),
        'system'
      );
    });

    it('should call notifyUserLeft', async () => {
      const notifySpy = vi.spyOn(notificationManager, 'notify');

      await notifyUserLeft('John', 'Project A');

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'John left the conversation',
          body: 'from Project A',
        }),
        'system'
      );
    });

    it('should call setNotificationPreferences', () => {
      const setPreferencesSpy = vi.spyOn(notificationManager, 'setPreferences');

      setNotificationPreferences({ enabled: false });

      expect(setPreferencesSpy).toHaveBeenCalledWith({ enabled: false });
    });

    it('should call getNotificationPreferences', () => {
      const getPreferencesSpy = vi.spyOn(notificationManager, 'getPreferences');

      getNotificationPreferences();

      expect(getPreferencesSpy).toHaveBeenCalled();
    });

    it('should call requestNotificationPermission', async () => {
      const requestPermissionSpy = vi.spyOn(
        notificationManager,
        'requestNotificationPermission'
      );
      mockRequestPermission.mockResolvedValue('granted');

      await requestNotificationPermission();

      expect(requestPermissionSpy).toHaveBeenCalled();
    });
  });

  describe('isSupported', () => {
    it('should return true when Notification is supported', () => {
      expect(notificationManager.isSupported()).toBe(true);
    });

    it('should return false when Notification is not supported', () => {
      const originalNotification = window.Notification;
      const originalAudioContext = window.AudioContext;

      // Remove both Notification and AudioContext
      Object.defineProperty(window, 'Notification', {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(window, 'AudioContext', {
        value: undefined,
        writable: true,
      });

      // Clear the singleton instance
      (NotificationManager as any).instance = undefined;

      // Create a new instance to test the isSupported check
      const testManager = new (NotificationManager as any)();
      expect(testManager.isSupported()).toBe(false);

      // Restore both
      Object.defineProperty(window, 'Notification', {
        value: originalNotification,
        writable: true,
      });
      Object.defineProperty(window, 'AudioContext', {
        value: originalAudioContext,
        writable: true,
      });

      testManager.destroy();
    });
  });

  describe('getPermissionStatus', () => {
    it('should return current permission status', () => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'denied',
        writable: true,
      });

      // Clear the singleton instance
      (NotificationManager as any).instance = undefined;

      // Create a new instance to test the permission status
      const testManager = new (NotificationManager as any)();
      expect(testManager.getPermissionStatus()).toBe('denied');

      testManager.destroy();
    });
  });
});
