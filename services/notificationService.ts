import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

export interface NotificationConfig {
  title: string;
  body: string;
  priority: 'default' | 'high' | 'max';
  categoryIdentifier?: string;
  sound?: 'default' | 'default' | 'default';
  badge?: number;
  data?: Record<string, any>;
}

export interface AlertConfig {
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  actions?: Array<{
    title: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
}

export class NotificationService {
  private static instance: NotificationService;
  private notificationChannelId: string = 'fire-safety-alerts';
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }

      // Set up notification channel
      await Notifications.setNotificationChannelAsync(this.notificationChannelId, {
        name: 'Fire Safety Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableLights: true,
        lightColor: '#FF3B30',
        enableVibrate: true,
      });

      this.isInitialized = true;
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  async sendNotification(config: NotificationConfig): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: config.title,
          body: config.body,
          data: config.data,
          sound: config.sound || 'default',
          priority: config.priority || 'default',
          badge: config.badge,
        },
        trigger: null, // Show immediately
        identifier: `notification-${Date.now()}`,
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Fallback to alert
      this.showAlert({
        title: config.title,
        message: config.body,
        type: 'info'
      });
    }
  }

  async sendCriticalAlert(title: string, message: string, actions?: AlertConfig['actions']): Promise<void> {
    // Send high priority notification
    await this.sendNotification({
      title: `🚨 CRITICAL: ${title}`,
      body: message,
      priority: 'high',
      sound: 'default',
      badge: 1,
      categoryIdentifier: 'critical-alert',
      data: { type: 'critical', timestamp: new Date().toISOString() }
    });

    // Show immediate alert
    this.showAlert({
      title: `Critical Alert: ${title}`,
      message,
      type: 'error',
      actions: actions
    });
  }

  async sendComplianceAlert(issues: string[], location: string): Promise<void> {
    const title = 'NFPA Compliance Issue';
    const body = `${issues.length} issue(s) found at ${location}. Immediate attention required.`;

    await this.sendNotification({
      title,
      body,
      priority: 'high',
      sound: 'default',
      badge: issues.length,
      categoryIdentifier: 'compliance-alert',
      data: { 
        type: 'compliance', 
        issues, 
        location, 
        timestamp: new Date().toISOString() 
      }
    });

    this.showAlert({
      title,
      message: body,
      type: 'warning',
      actions: [
        {
          title: 'View Details',
          onPress: () => {
            // In a real app, this would navigate to compliance details
            console.log('Navigate to compliance details');
          }
        },
        {
          title: 'Dismiss',
          style: 'cancel',
          onPress: () => {}
        }
      ]
    });
  }

  async sendEmergencyAlert(location: string, issue: string, technician?: string): Promise<void> {
    const title = '🚨 EMERGENCY ALERT';
    const body = technician 
      ? `${issue} at ${location}. Assigned to ${technician}.`
      : `${issue} at ${location}. Immediate response required.`;

    await this.sendNotification({
      title,
      body,
      priority: 'max',
      sound: 'default',
      badge: 1,
      categoryIdentifier: 'emergency-alert',
      data: { 
        type: 'emergency', 
        location, 
        issue, 
        technician,
        timestamp: new Date().toISOString() 
      }
    });

    this.showAlert({
      title: 'EMERGENCY',
      message: body,
      type: 'error',
      actions: [
        {
          title: 'Call Emergency',
          onPress: () => {
            // In a real app, this would trigger emergency call
            console.log('Emergency call triggered');
          },
          style: 'destructive'
        },
        {
          title: 'Acknowledge',
          onPress: () => {
            console.log('Emergency acknowledged');
          }
        }
      ]
    });
  }

  async sendJobAlert(jobTitle: string, location: string, scheduledTime: Date): Promise<void> {
    const title = 'New Job Assigned';
    const body = `${jobTitle} at ${location}. Scheduled for ${scheduledTime.toLocaleString()}.`;

    await this.sendNotification({
      title,
      body,
      priority: 'default',
      sound: 'default',
      badge: 1,
      categoryIdentifier: 'job-alert',
      data: { 
        type: 'job', 
        title: jobTitle, 
        location, 
        scheduledTime: scheduledTime.toISOString() 
      }
    });

    this.showAlert({
      title: 'New Job',
      message: body,
      type: 'info',
      actions: [
        {
          title: 'View Details',
          onPress: () => {
            console.log('Navigate to job details');
          }
        },
        {
          title: 'Later',
          style: 'cancel',
          onPress: () => {}
        }
      ]
    });
  }

  async sendSyncAlert(count: number): Promise<void> {
    const title = 'Sync Completed';
    const body = `${count} items successfully synced to cloud.`;

    await this.sendNotification({
      title,
      body,
      priority: 'default',
      sound: 'default',
      categoryIdentifier: 'sync-alert',
      data: { 
        type: 'sync', 
        count, 
        timestamp: new Date().toISOString() 
      }
    });
  }

  async sendInspectionComplete(inspectionId: string, location: string): Promise<void> {
    const title = 'Inspection Complete';
    const body = `NFPA inspection completed at ${location}. Report generated.`;

    await this.sendNotification({
      title,
      body,
      priority: 'default',
      sound: 'default',
      categoryIdentifier: 'inspection-complete',
      data: { 
        type: 'inspection', 
        inspectionId, 
        location, 
        timestamp: new Date().toISOString() 
      }
    });
  }

  private showAlert(config: AlertConfig): void {
    const actions = config.actions || [
      {
        title: 'OK',
        onPress: () => {}
      }
    ];

    Alert.alert(
      config.title,
      config.message,
      actions.map(action => ({
        text: action.title,
        onPress: action.onPress,
        style: action.style
      }))
    );
  }

  async scheduleNotification(
    title: string, 
    body: string, 
    triggerDate: Date, 
    config?: Partial<NotificationConfig>
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const identifier = `scheduled-${Date.now()}`;
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: config?.sound || 'default',
        priority: config?.priority || 'default',
        badge: config?.badge,
        data: config?.data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
      identifier,
    });

    return identifier;
  }

  async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  // Test notification for development
  async sendTestNotification(): Promise<void> {
    await this.sendNotification({
      title: 'Test Notification',
      body: 'This is a test notification from Voice Inspector AI.',
      priority: 'default',
      sound: 'default',
      categoryIdentifier: 'test',
      data: { type: 'test', timestamp: new Date().toISOString() }
    });
  }
}
