export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  browser: boolean;
  desktop: boolean;
  mentions: boolean;
  directMessages: boolean;
  groupMessages: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
}

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
  actions?: NotificationAction[];
  image?: string;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'message' | 'mention' | 'system';
  read: boolean;
  data?: any;
}

export interface SoundNotification {
  id: string;
  name: string;
  url: string;
  volume?: number;
}

export class NotificationManager {
  private static instance: NotificationManager;
  private audioContext: AudioContext | null = null;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private notificationPermission: NotificationPermission = 'default';
  private notificationHistory: NotificationHistoryItem[] = [];
  private preferences: NotificationPreferences = {
    enabled: true,
    sound: true,
    browser: true,
    desktop: true,
    mentions: true,
    directMessages: true,
    groupMessages: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  };

  private constructor() {
    this.initialize();
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private async initialize(): Promise<void> {
    // Check notification permission
    if ('Notification' in window && window.Notification) {
      this.notificationPermission = window.Notification.permission;

      if (this.notificationPermission === 'default') {
        // Request permission when user first interacts
        document.addEventListener('click', this.requestPermission.bind(this), {
          once: true,
        });
      }
    }

    // Initialize audio context
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    // Load preferences from localStorage
    this.loadPreferences();

    // Load notification history
    this.loadNotificationHistory();
  }

  private async requestPermission(): Promise<void> {
    if ('Notification' in window && this.notificationPermission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission;
        this.savePreferences();
      } catch (error) {
        console.warn('Failed to request notification permission:', error);
      }
    }
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (this.notificationPermission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      this.savePreferences();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  public setPreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    this.savePreferences();
  }

  public getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  public isQuietHours(): boolean {
    if (!this.preferences.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMinute] = this.preferences.quietHours.start
      .split(':')
      .map(Number);
    const [endHour, endMinute] = this.preferences.quietHours.end
      .split(':')
      .map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      // Same day (e.g., 09:00 to 17:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  public async notify(
    data: NotificationData,
    type: 'message' | 'mention' | 'system' = 'message'
  ): Promise<void> {
    if (!this.preferences.enabled || this.isQuietHours()) {
      return;
    }

    // Check if notification type is enabled
    if (type === 'mention' && !this.preferences.mentions) return;
    if (type === 'message' && !this.preferences.groupMessages) return;

    // Add to notification history
    const historyItem: NotificationHistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: data.title,
      body: data.body,
      timestamp: new Date().toISOString(),
      type,
      read: false,
      data: data.data,
    };
    this.addToHistory(historyItem);

    const promises: Promise<void>[] = [];

    // Browser notification
    if (this.preferences.browser && this.notificationPermission === 'granted') {
      promises.push(this.showBrowserNotification(data));
    }

    // Sound notification
    if (this.preferences.sound) {
      promises.push(this.playNotificationSound(type));
    }

    // Desktop notification (if different from browser)
    if (this.preferences.desktop && this.notificationPermission === 'granted') {
      promises.push(this.showDesktopNotification(data));
    }

    await Promise.all(promises);
  }

  private async showBrowserNotification(data: NotificationData): Promise<void> {
    if (
      !('Notification' in window) ||
      this.notificationPermission !== 'granted'
    ) {
      return;
    }

    try {
      const notification = new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/favicon.ico',
        badge: data.badge || '/favicon.ico',
        tag: data.tag,
        data: data.data,
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
      });

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!data.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();

        // Trigger custom event for handling notification clicks
        window.dispatchEvent(
          new CustomEvent('notification-click', {
            detail: {
              data: data.data,
              notification: data,
              type: 'click',
            },
          })
        );
      };

      // Note: onactionclick is not supported in all browsers
      // For notification actions, we'd need to use the Service Worker API
      // For now, we'll handle basic click events only

      // Handle notification close
      notification.onclose = () => {
        window.dispatchEvent(
          new CustomEvent('notification-close', {
            detail: {
              data: data.data,
              notification: data,
            },
          })
        );
      };
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  private async showDesktopNotification(data: NotificationData): Promise<void> {
    // For now, same as browser notification
    // In the future, this could integrate with native desktop notifications
    return this.showBrowserNotification(data);
  }

  private async playNotificationSound(
    type: 'message' | 'mention' | 'system'
  ): Promise<void> {
    if (!this.audioContext) {
      return;
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const soundId = this.getSoundForType(type);
      const audio = await this.getAudioElement(soundId);

      if (audio) {
        audio.volume = this.preferences.sound ? 0.5 : 0;
        await audio.play();
      } else {
        // Fallback: Generate a simple beep sound
        await this.generateFallbackSound(type);
      }
    } catch (error) {
      console.warn('Error playing notification sound:', error);
      // Try fallback sound
      try {
        await this.generateFallbackSound(type);
      } catch (fallbackError) {
        console.warn('Fallback sound also failed:', fallbackError);
      }
    }
  }

  private async generateFallbackSound(
    type: 'message' | 'mention' | 'system'
  ): Promise<void> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Set frequency based on notification type
      const frequency =
        type === 'mention' ? 800 : type === 'system' ? 600 : 400;

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(
        frequency,
        this.audioContext.currentTime
      );
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        0.1,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + 0.3
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Failed to generate fallback sound:', error);
    }
  }

  private getSoundForType(type: 'message' | 'mention' | 'system'): string {
    switch (type) {
      case 'mention':
        return 'mention';
      case 'system':
        return 'system';
      default:
        return 'message';
    }
  }

  private async getAudioElement(
    soundId: string
  ): Promise<HTMLAudioElement | null> {
    if (this.audioCache.has(soundId)) {
      return this.audioCache.get(soundId)!;
    }

    const soundUrls: Record<string, string> = {
      message: '/sounds/message.mp3',
      mention: '/sounds/mention.mp3',
      system: '/sounds/system.mp3',
    };

    const url = soundUrls[soundId];
    if (!url) {
      return null;
    }

    try {
      const audio = new Audio(url);
      audio.preload = 'auto';

      // Wait for audio to be loaded
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener(
          'error',
          () => {
            // Gracefully handle missing sound files
            console.warn(`Sound file not found: ${url}. Using fallback.`);
            resolve(null);
          },
          { once: true }
        );
        audio.load();
      });

      // If audio failed to load, return null
      if (audio.error) {
        console.warn(`Failed to load sound ${soundId}:`, audio.error);
        return null;
      }

      this.audioCache.set(soundId, audio);
      return audio;
    } catch (error) {
      console.warn(`Failed to load sound ${soundId}:`, error);
      return null;
    }
  }

  public async notifyNewMessage(
    senderName: string,
    message: string,
    isMention: boolean = false,
    projectName?: string
  ): Promise<void> {
    const title = isMention
      ? `@${senderName} mentioned you`
      : `New message from ${senderName}`;
    let body =
      message.length > 100 ? `${message.substring(0, 100)}...` : message;

    if (projectName) {
      body += ` (${projectName})`;
    }

    await this.notify(
      {
        title,
        body,
        icon: '/favicon.ico',
        tag: 'new-message',
        data: { type: 'message', senderName, isMention },
      },
      isMention ? 'mention' : 'message'
    );
  }

  public async notifySystemMessage(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    await this.notify(
      {
        title,
        body,
        icon: '/favicon.ico',
        tag: 'system-message',
        data: { type: 'system', ...data },
        requireInteraction: false,
      },
      'system'
    );
  }

  public async notifyUserJoined(
    userName: string,
    projectName?: string
  ): Promise<void> {
    const title = `${userName} joined the conversation`;
    const body = projectName ? `in ${projectName}` : '';

    await this.notify(
      {
        title,
        body,
        icon: '/favicon.ico',
        tag: 'user-joined',
        data: { type: 'user-joined', userName },
      },
      'system'
    );
  }

  public async notifyUserLeft(
    userName: string,
    projectName?: string
  ): Promise<void> {
    const title = `${userName} left the conversation`;
    const body = projectName ? `from ${projectName}` : '';

    await this.notify(
      {
        title,
        body,
        icon: '/favicon.ico',
        tag: 'user-left',
        data: { type: 'user-left', userName },
      },
      'system'
    );
  }

  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem('notification-preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.preferences = { ...this.preferences, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load notification preferences:', error);
    }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(
        'notification-preferences',
        JSON.stringify(this.preferences)
      );
    } catch (error) {
      console.warn('Failed to save notification preferences:', error);
    }
  }

  public isSupported(): boolean {
    return (
      ('Notification' in window &&
        typeof window.Notification !== 'undefined') ||
      'AudioContext' in window
    );
  }

  public getPermissionStatus(): NotificationPermission {
    return this.notificationPermission;
  }

  public getNotificationHistory(): NotificationHistoryItem[] {
    return [...this.notificationHistory];
  }

  public markNotificationAsRead(notificationId: string): void {
    const notification = this.notificationHistory.find(
      n => n.id === notificationId
    );
    if (notification) {
      notification.read = true;
      this.saveNotificationHistory();
    }
  }

  public clearNotificationHistory(): void {
    this.notificationHistory = [];
    this.saveNotificationHistory();
  }

  public getUnreadNotificationCount(): number {
    return this.notificationHistory.filter(n => !n.read).length;
  }

  private addToHistory(notification: NotificationHistoryItem): void {
    this.notificationHistory.unshift(notification);

    // Keep only last 100 notifications
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(0, 100);
    }

    this.saveNotificationHistory();
  }

  private saveNotificationHistory(): void {
    try {
      localStorage.setItem(
        'notification-history',
        JSON.stringify(this.notificationHistory)
      );
    } catch (error) {
      console.warn('Failed to save notification history:', error);
    }
  }

  private loadNotificationHistory(): void {
    try {
      const stored = localStorage.getItem('notification-history');
      if (stored) {
        this.notificationHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load notification history:', error);
      this.notificationHistory = [];
    }
  }

  public destroy(): void {
    // Clean up audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear audio cache
    this.audioCache.clear();
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();

// Export convenience functions
export const notifyNewMessage = (
  senderName: string,
  message: string,
  isMention: boolean = false,
  projectName?: string
) =>
  notificationManager.notifyNewMessage(
    senderName,
    message,
    isMention,
    projectName
  );

export const notifySystemMessage = (title: string, body: string, data?: any) =>
  notificationManager.notifySystemMessage(title, body, data);

export const notifyUserJoined = (userName: string, projectName?: string) =>
  notificationManager.notifyUserJoined(userName, projectName);

export const notifyUserLeft = (userName: string, projectName?: string) =>
  notificationManager.notifyUserLeft(userName, projectName);

export const setNotificationPreferences = (
  preferences: Partial<NotificationPreferences>
) => notificationManager.setPreferences(preferences);

export const getNotificationPreferences = () =>
  notificationManager.getPreferences();

export const requestNotificationPermission = () =>
  notificationManager.requestNotificationPermission();

export const getNotificationHistory = () =>
  notificationManager.getNotificationHistory();

export const markNotificationAsRead = (notificationId: string) =>
  notificationManager.markNotificationAsRead(notificationId);

export const clearNotificationHistory = () =>
  notificationManager.clearNotificationHistory();

export const getUnreadNotificationCount = () =>
  notificationManager.getUnreadNotificationCount();
