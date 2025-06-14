import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabaseService } from './supabase';

export interface NotificationPreferences {
  enabled: boolean;
  categories: {
    agent_executions: boolean;
    workflow_completions: boolean;
    team_activity: boolean;
    chat_messages: boolean;
    system_alerts: boolean;
    cost_alerts: boolean;
  };
  delivery: {
    push: boolean;
    email: boolean;
    in_app: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string; // HH:MM format
    end_time: string; // HH:MM format
    timezone: string;
  };
  frequency: {
    immediate: boolean;
    hourly_digest: boolean;
    daily_digest: boolean;
    weekly_digest: boolean;
  };
}

export interface PushNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, any>;
  category: NotificationCategory;
  priority: 'low' | 'normal' | 'high' | 'critical';
  
  // Scheduling
  scheduled_for?: string;
  expires_at?: string;
  
  // Delivery tracking
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'failed';
  
  // Platform specific
  platform_data: {
    ios?: {
      badge?: number;
      sound?: string;
      category?: string;
    };
    android?: {
      channel_id?: string;
      icon?: string;
      color?: string;
    };
  };
}

export type NotificationCategory = 
  | 'agent_execution_complete'
  | 'agent_execution_failed' 
  | 'workflow_completed'
  | 'workflow_failed'
  | 'team_invitation'
  | 'team_member_added'
  | 'chat_message'
  | 'system_alert'
  | 'cost_alert'
  | 'quota_warning'
  | 'maintenance_notice';

export interface NotificationTemplate {
  category: NotificationCategory;
  title_template: string;
  body_template: string;
  action_url?: string;
  icon?: string;
  color?: string;
  sound?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
  private isInitialized = false;

  // ========================================
  // INITIALIZATION
  // ========================================

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification: any) => {
          const preferences = await this.getUserPreferences();
          
          // Check quiet hours
          if (this.isQuietHours(preferences)) {
            return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
              shouldShowBanner: false,
              shouldShowList: false,
            };
          }

          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        },
      });

      // Request permissions
      await this.requestPermissions();

      // Get push token
      this.expoPushToken = await this.registerForPushNotifications();

      // Set up listeners
      this.setupNotificationListeners();

      // Configure notification channels (Android)
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      this.isInitialized = true;
      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications
   */
  private async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      // Save token to database
      await this.saveUserPushToken(token.data);

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners(): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    const channels = [
      {
        id: 'agent_executions',
        name: 'Agent Executions',
        description: 'Notifications about agent execution status',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      },
      {
        id: 'workflow_executions',
        name: 'Workflow Executions',
        description: 'Notifications about workflow execution status',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      },
      {
        id: 'team_activity',
        name: 'Team Activity',
        description: 'Notifications about team collaboration',
        importance: Notifications.AndroidImportance.DEFAULT,
      },
      {
        id: 'chat_messages',
        name: 'Chat Messages',
        description: 'New chat messages',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      },
      {
        id: 'system_alerts',
        name: 'System Alerts',
        description: 'Important system notifications',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      },
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, channel);
    }
  }

  // ========================================
  // NOTIFICATION HANDLING
  // ========================================

  /**
   * Handle notification received while app is foregrounded
   */
  private async handleNotificationReceived(notification: Notifications.Notification): Promise<void> {
    console.log('Notification received:', notification);
    
    // Track delivery
    const notificationId = notification.request.content.data?.notificationId;
    if (notificationId && typeof notificationId === 'string') {
      await this.trackNotificationDelivery(notificationId);
    }

    // Update badge count
    await this.updateBadgeCount();
  }

  /**
   * Handle notification response (user tapped notification)
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    console.log('Notification response:', response);
    
    const notificationId = response.notification.request.content.data?.notificationId;
    const actionUrl = response.notification.request.content.data?.actionUrl;
    
    // Track open
    if (notificationId && typeof notificationId === 'string') {
      await this.trackNotificationOpen(notificationId);
    }

    // Handle deep linking
    if (actionUrl && typeof actionUrl === 'string') {
      await this.handleDeepLink(actionUrl);
    }

    // Clear badge if appropriate
    await Notifications.setBadgeCountAsync(0);
  }

  // ========================================
  // SENDING NOTIFICATIONS
  // ========================================

  /**
   * Send notification to user
   */
  async sendNotification(
    userId: string,
    category: NotificationCategory,
    data: Record<string, any>,
    options: {
      immediate?: boolean;
      scheduled_for?: string;
      priority?: 'low' | 'normal' | 'high' | 'critical';
    } = {}
  ): Promise<PushNotification | null> {
    try {
      // Check user preferences
      const preferences = await this.getUserPreferences(userId);
      if (!this.shouldSendNotification(category, preferences)) {
        console.log(`Notification blocked by user preferences: ${category}`);
        return null;
      }

      // Get notification template
      const template = this.getNotificationTemplate(category);
      const { title, body } = this.renderTemplate(template, data);

      // Get user's push token
      const pushToken = await this.getUserPushToken(userId);
      if (!pushToken) {
        console.log(`No push token found for user: ${userId}`);
        return null;
      }

      // Create notification record
      const notification: PushNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        title,
        body,
        data,
        category,
        priority: options.priority || template.priority,
        scheduled_for: options.scheduled_for,
        expires_at: options.scheduled_for ? 
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined,
        status: 'pending',
        platform_data: {
          ios: {
            badge: await this.getBadgeCount(userId) + 1,
            sound: template.sound || 'default',
            category: category,
          },
          android: {
            channel_id: this.getAndroidChannelId(category),
            icon: template.icon || 'ic_notification',
            color: template.color || '#6366F1',
          },
        },
      };

      // Save notification
      await supabaseService.createNotification(notification);

      // Send immediately or schedule
      if (options.immediate !== false && !options.scheduled_for) {
        await this.sendPushNotification(notification, pushToken);
      } else if (options.scheduled_for) {
        await this.schedulePushNotification(notification, pushToken);
      }

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }

  /**
   * Send push notification via Expo
   */
  private async sendPushNotification(notification: PushNotification, pushToken: string): Promise<void> {
    try {
      const message = {
        to: pushToken,
        title: notification.title,
        body: notification.body,
        data: {
          ...notification.data,
          notificationId: notification.id,
          category: notification.category,
        },
        priority: this.mapPriorityToExpo(notification.priority),
        badge: notification.platform_data.ios?.badge,
        sound: notification.platform_data.ios?.sound,
        channelId: notification.platform_data.android?.channel_id,
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      if (result.data?.status === 'ok') {
        notification.status = 'sent';
        notification.sent_at = new Date().toISOString();
      } else {
        notification.status = 'failed';
        console.error('Push notification failed:', result);
      }

      await supabaseService.updateNotification(notification.id, notification);
    } catch (error) {
      console.error('Error sending push notification:', error);
      notification.status = 'failed';
      await supabaseService.updateNotification(notification.id, notification);
    }
  }

  /**
   * Schedule push notification
   */
  private async schedulePushNotification(notification: PushNotification, pushToken: string): Promise<void> {
    try {
      if (!notification.scheduled_for) return;

      const scheduledTime = new Date(notification.scheduled_for);
      const now = new Date();

      if (scheduledTime <= now) {
        // Send immediately if scheduled time has passed
        await this.sendPushNotification(notification, pushToken);
        return;
      }

      // Use Expo's scheduling
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: {
            ...notification.data,
            notificationId: notification.id,
            category: notification.category,
          },
          badge: notification.platform_data.ios?.badge,
          sound: notification.platform_data.ios?.sound,
        },
        trigger: {
          type: 'date',
          date: scheduledTime,
        } as any,
      });

      notification.status = 'sent';
      notification.sent_at = new Date().toISOString();
      await supabaseService.updateNotification(notification.id, notification);
    } catch (error) {
      console.error('Error scheduling push notification:', error);
      notification.status = 'failed';
      await supabaseService.updateNotification(notification.id, notification);
    }
  }

  // ========================================
  // NOTIFICATION TEMPLATES
  // ========================================

  private getNotificationTemplate(category: NotificationCategory): NotificationTemplate {
    const templates: Record<NotificationCategory, NotificationTemplate> = {
      agent_execution_complete: {
        category,
        title_template: 'Agent Execution Complete',
        body_template: 'Agent "{{agent_name}}" has completed successfully',
        action_url: '/agents/{{agent_id}}/executions/{{execution_id}}',
        icon: 'ic_agent_success',
        color: '#10B981',
        sound: 'default',
        priority: 'normal',
      },
      agent_execution_failed: {
        category,
        title_template: 'Agent Execution Failed',
        body_template: 'Agent "{{agent_name}}" execution failed: {{error_message}}',
        action_url: '/agents/{{agent_id}}/executions/{{execution_id}}',
        icon: 'ic_agent_error',
        color: '#EF4444',
        sound: 'default',
        priority: 'high',
      },
      workflow_completed: {
        category,
        title_template: 'Workflow Complete',
        body_template: 'Workflow "{{workflow_name}}" completed in {{duration}}',
        action_url: '/workflows/{{workflow_id}}/executions/{{execution_id}}',
        icon: 'ic_workflow_success',
        color: '#8B5CF6',
        sound: 'default',
        priority: 'normal',
      },
      workflow_failed: {
        category,
        title_template: 'Workflow Failed',
        body_template: 'Workflow "{{workflow_name}}" failed at step "{{failed_step}}"',
        action_url: '/workflows/{{workflow_id}}/executions/{{execution_id}}',
        icon: 'ic_workflow_error',
        color: '#EF4444',
        sound: 'default',
        priority: 'high',
      },
      team_invitation: {
        category,
        title_template: 'Team Invitation',
        body_template: '{{inviter_name}} invited you to join team "{{team_name}}"',
        action_url: '/teams/{{team_id}}/invitations/{{invitation_id}}',
        icon: 'ic_team_invite',
        color: '#3B82F6',
        sound: 'default',
        priority: 'normal',
      },
      team_member_added: {
        category,
        title_template: 'New Team Member',
        body_template: '{{member_name}} joined team "{{team_name}}"',
        action_url: '/teams/{{team_id}}',
        icon: 'ic_team_member',
        color: '#10B981',
        priority: 'low',
      },
      chat_message: {
        category,
        title_template: 'New Message',
        body_template: '{{sender_name}}: {{message_preview}}',
        action_url: '/chat/{{session_id}}',
        icon: 'ic_chat',
        color: '#06B6D4',
        sound: 'default',
        priority: 'normal',
      },
      system_alert: {
        category,
        title_template: 'System Alert',
        body_template: '{{alert_message}}',
        action_url: '/system/alerts/{{alert_id}}',
        icon: 'ic_system_alert',
        color: '#F59E0B',
        sound: 'default',
        priority: 'high',
      },
      cost_alert: {
        category,
        title_template: 'Cost Alert',
        body_template: 'Monthly spending has reached ${{amount}} ({{percentage}}% of budget)',
        action_url: '/billing/usage',
        icon: 'ic_cost_alert',
        color: '#EF4444',
        sound: 'default',
        priority: 'high',
      },
      quota_warning: {
        category,
        title_template: 'Quota Warning',
        body_template: 'You have used {{percentage}}% of your {{quota_type}} quota',
        action_url: '/billing/usage',
        icon: 'ic_quota_warning',
        color: '#F59E0B',
        priority: 'normal',
      },
      maintenance_notice: {
        category,
        title_template: 'Maintenance Notice',
        body_template: '{{maintenance_message}}',
        action_url: '/system/status',
        icon: 'ic_maintenance',
        color: '#6B7280',
        priority: 'low',
      },
    };

    return templates[category];
  }

  private renderTemplate(template: NotificationTemplate, data: Record<string, any>): { title: string; body: string } {
    const title = this.interpolateTemplate(template.title_template, data);
    const body = this.interpolateTemplate(template.body_template, data);
    return { title, body };
  }

  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  // ========================================
  // USER PREFERENCES
  // ========================================

  async getUserPreferences(userId?: string): Promise<NotificationPreferences> {
    try {
      if (!userId) {
        // Return default preferences
        return this.getDefaultPreferences();
      }

      const preferences = await supabaseService.getUserNotificationPreferences(userId);
      return preferences || this.getDefaultPreferences();
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      await supabaseService.updateUserNotificationPreferences(userId, preferences);
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      enabled: true,
      categories: {
        agent_executions: true,
        workflow_completions: true,
        team_activity: true,
        chat_messages: true,
        system_alerts: true,
        cost_alerts: true,
      },
      delivery: {
        push: true,
        email: false,
        in_app: true,
      },
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '08:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      frequency: {
        immediate: true,
        hourly_digest: false,
        daily_digest: false,
        weekly_digest: false,
      },
    };
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private shouldSendNotification(category: NotificationCategory, preferences: NotificationPreferences): boolean {
    if (!preferences.enabled || !preferences.delivery.push) {
      return false;
    }

    const categoryMap: Record<NotificationCategory, keyof NotificationPreferences['categories']> = {
      agent_execution_complete: 'agent_executions',
      agent_execution_failed: 'agent_executions',
      workflow_completed: 'workflow_completions',
      workflow_failed: 'workflow_completions',
      team_invitation: 'team_activity',
      team_member_added: 'team_activity',
      chat_message: 'chat_messages',
      system_alert: 'system_alerts',
      cost_alert: 'cost_alerts',
      quota_warning: 'cost_alerts',
      maintenance_notice: 'system_alerts',
    };

    const categoryKey = categoryMap[category];
    return categoryKey ? preferences.categories[categoryKey] : true;
  }

  private isQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quiet_hours.enabled) {
      return false;
    }

    const now = new Date();
    const startTime = this.parseTime(preferences.quiet_hours.start_time);
    const endTime = this.parseTime(preferences.quiet_hours.end_time);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (startTime <= endTime) {
      return currentMinutes >= startTime && currentMinutes <= endTime;
    } else {
      // Quiet hours span midnight
      return currentMinutes >= startTime || currentMinutes <= endTime;
    }
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getAndroidChannelId(category: NotificationCategory): string {
    const channelMap: Record<string, string> = {
      agent_execution_complete: 'agent_executions',
      agent_execution_failed: 'agent_executions',
      workflow_completed: 'workflow_executions',
      workflow_failed: 'workflow_executions',
      team_invitation: 'team_activity',
      team_member_added: 'team_activity',
      chat_message: 'chat_messages',
      system_alert: 'system_alerts',
      cost_alert: 'system_alerts',
      quota_warning: 'system_alerts',
      maintenance_notice: 'system_alerts',
    };

    return channelMap[category] || 'default';
  }

  private mapPriorityToExpo(priority: 'low' | 'normal' | 'high' | 'critical'): 'default' | 'normal' | 'high' {
    const priorityMap = {
      low: 'default' as const,
      normal: 'normal' as const,
      high: 'high' as const,
      critical: 'high' as const,
    };
    return priorityMap[priority];
  }

  private async saveUserPushToken(token: string): Promise<void> {
    try {
      // Save token to Supabase for the current user
      await supabaseService.saveUserPushToken(token);
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  private async getUserPushToken(userId: string): Promise<string | null> {
    try {
      return await supabaseService.getUserPushToken(userId);
    } catch (error) {
      console.error('Error getting user push token:', error);
      return null;
    }
  }

  private async getBadgeCount(userId: string): Promise<number> {
    try {
      return await supabaseService.getUserBadgeCount(userId);
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  private async updateBadgeCount(): Promise<void> {
    try {
      const count = await Notifications.getBadgeCountAsync();
      await Notifications.setBadgeCountAsync(count + 1);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  private async trackNotificationDelivery(notificationId: string): Promise<void> {
    try {
      await supabaseService.updateNotification(notificationId, {
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking notification delivery:', error);
    }
  }

  private async trackNotificationOpen(notificationId: string): Promise<void> {
    try {
      await supabaseService.updateNotification(notificationId, {
        status: 'opened',
        opened_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking notification open:', error);
    }
  }

  private async handleDeepLink(actionUrl: string): Promise<void> {
    try {
      // Handle navigation to specific screens based on action URL
      console.log('Handling deep link:', actionUrl);
      // Implementation would depend on navigation system
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  }

  // ========================================
  // PUBLIC API METHODS
  // ========================================

  /**
   * Get push token for current device
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Clear specific notification
   */
  async clearNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.dismissNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(userId: string, limit: number = 50): Promise<PushNotification[]> {
    try {
      return await supabaseService.getUserNotifications(userId, limit);
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  /**
   * Clean up notification service
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export const notificationService = new NotificationService();