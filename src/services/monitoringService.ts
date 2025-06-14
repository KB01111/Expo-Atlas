// import * as Sentry from '@sentry/react-native';
// Mock Sentry for development
const Sentry = {
  captureException: (error: any) => console.error('Sentry Mock:', error),
  captureMessage: (message: string, ...args: any[]) => console.log('Sentry Mock:', message, ...args),
  setUser: (user: any) => console.log('Sentry Mock User:', user),
  setTag: (key: string, value: string) => console.log('Sentry Mock Tag:', key, value),
  setContext: (key: string, context: any) => console.log('Sentry Mock Context:', key, context),
  addBreadcrumb: (breadcrumb: any) => console.log('Sentry Mock Breadcrumb:', breadcrumb),
  startTransaction: (data: any) => ({
    setTag: () => {},
    setData: () => {},
    finish: () => {},
    startChild: () => ({ finish: () => {} })
  }),
  init: (config: any) => console.log('Sentry Mock Init:', config),
  flush: () => Promise.resolve(),
  close: () => Promise.resolve()
};
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabaseService } from './supabase';

export interface PerformanceMetric {
  id: string;
  metric_name: string;
  value: number;
  unit: string;
  timestamp: number;
  user_id?: string;
  session_id?: string;
  metadata: Record<string, any>;
}

export interface ErrorEvent {
  id: string;
  error_type: string;
  message: string;
  stack_trace?: string;
  timestamp: number;
  user_id?: string;
  session_id?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: {
    screen?: string;
    action?: string;
    user_agent?: string;
    device_info?: DeviceInfo;
    app_version?: string;
  };
  metadata: Record<string, any>;
}

export interface DeviceInfo {
  platform: string;
  os_version: string;
  device_model: string;
  device_brand: string;
  app_version: string;
  build_number: string;
  is_physical_device: boolean;
  memory_usage?: number;
  storage_usage?: number;
  network_type?: string;
}

export interface UserEvent {
  id: string;
  event_name: string;
  user_id?: string;
  session_id?: string;
  timestamp: number;
  properties: Record<string, any>;
  screen?: string;
  previous_screen?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  memory_usage_percent: number;
  error_rate_percent: number;
  active_users: number;
  last_updated: number;
  checks: {
    database: 'healthy' | 'unhealthy';
    api: 'healthy' | 'unhealthy';
    storage: 'healthy' | 'unhealthy';
    notifications: 'healthy' | 'unhealthy';
  };
}

export interface UsageAnalytics {
  daily_active_users: number;
  monthly_active_users: number;
  session_duration_avg: number;
  agent_executions_count: number;
  workflow_executions_count: number;
  total_cost: number;
  error_rate: number;
  retention_rate: number;
}

class MonitoringService {
  private sessionId: string;
  private sessionStartTime: number;
  private currentScreen: string = '';
  private previousScreen: string = '';
  private performanceObserver: PerformanceObserver | null = null;
  private memoryWarningThreshold = 0.8; // 80%
  private isInitialized = false;

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionStartTime = Date.now();
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  /**
   * Initialize monitoring service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Sentry
      await this.initializeSentry();

      // Set up performance monitoring
      this.setupPerformanceMonitoring();

      // Set up error handlers
      this.setupErrorHandlers();

      // Start health monitoring
      this.startHealthMonitoring();

      // Track app launch
      await this.trackEvent('app_launched', {
        session_id: this.sessionId,
        device_info: await this.getDeviceInfo()
      });

      this.isInitialized = true;
      console.log('Monitoring service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize monitoring service:', error);
    }
  }

  /**
   * Initialize Sentry error tracking
   */
  private async initializeSentry(): Promise<void> {
    try {
      Sentry.init({
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
        environment: __DEV__ ? 'development' : 'production',
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000,
        tracesSampleRate: __DEV__ ? 1.0 : 0.1,
        beforeSend: (event: any) => {
          // Filter out sensitive data
          return this.sanitizeEvent(event);
        },
      });

      // Set user context
      const deviceInfo = await this.getDeviceInfo();
      Sentry.setContext('device', deviceInfo);
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    try {
      // Monitor app state changes
      this.trackPerformanceMetric('session_start', Date.now(), 'timestamp');

      // Monitor memory usage
      this.startMemoryMonitoring();

      // Monitor network requests
      this.setupNetworkMonitoring();
    } catch (error) {
      console.error('Error setting up performance monitoring:', error);
    }
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers(): void {
    // Global error handler
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError(...args);
      
      if (args.length > 0 && args[0] instanceof Error) {
        this.reportError(args[0], 'console', 'medium');
      }
    };

    // Unhandled promise rejections
    const unhandledRejectionHandler = (event: any) => {
      this.reportError(
        new Error(event.reason || 'Unhandled promise rejection'),
        'unhandled_promise',
        'high'
      );
    };

    // React Native specific error handlers would go here
    // This is a simplified version
  }

  // ========================================
  // ERROR REPORTING
  // ========================================

  /**
   * Report error with context
   */
  async reportError(
    error: Error,
    context: string = 'unknown',
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const errorEvent: ErrorEvent = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        error_type: error.constructor.name,
        message: error.message,
        stack_trace: error.stack,
        timestamp: Date.now(),
        severity,
        context: {
          screen: this.currentScreen,
          action: context,
          user_agent: await this.getUserAgent(),
          device_info: await this.getDeviceInfo(),
          app_version: Constants.expoConfig?.version,
        },
        metadata
      };

      // Send to Sentry
      Sentry.captureException(error);

      // Save to database
      await supabaseService.saveErrorEvent(errorEvent);

      // Send critical errors immediately via monitoring
      if (severity === 'critical') {
        await this.sendCriticalAlert(errorEvent);
      }

      console.error('Error reported:', errorEvent);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  /**
   * Report custom error
   */
  async reportCustomError(
    message: string,
    type: string = 'custom',
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const error = new Error(message);
    error.name = type;
    await this.reportError(error, 'custom', severity, metadata);
  }

  // ========================================
  // PERFORMANCE TRACKING
  // ========================================

  /**
   * Track performance metric
   */
  async trackPerformanceMetric(
    metricName: string,
    value: number,
    unit: string = 'ms',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const metric: PerformanceMetric = {
        id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metric_name: metricName,
        value,
        unit,
        timestamp: Date.now(),
        session_id: this.sessionId,
        metadata
      };

      // Send to analytics
      await supabaseService.savePerformanceMetric(metric);

      // Track in Sentry
      Sentry.addBreadcrumb({
        message: `Performance: ${metricName}`,
        category: 'performance',
        level: 'info',
        data: {
          value,
          unit,
          ...metadata
        }
      });
    } catch (error) {
      console.error('Error tracking performance metric:', error);
    }
  }

  /**
   * Measure execution time
   */
  async measureExecutionTime<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const executionTime = Date.now() - startTime;
      
      await this.trackPerformanceMetric(
        `execution_time_${operation}`,
        executionTime,
        'ms',
        { ...metadata, success: true }
      );
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      await this.trackPerformanceMetric(
        `execution_time_${operation}`,
        executionTime,
        'ms',
        { ...metadata, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      throw error;
    }
  }

  /**
   * Track screen performance
   */
  async trackScreenPerformance(
    screenName: string,
    loadTime: number,
    renderTime: number
  ): Promise<void> {
    await Promise.all([
      this.trackPerformanceMetric('screen_load_time', loadTime, 'ms', { screen: screenName }),
      this.trackPerformanceMetric('screen_render_time', renderTime, 'ms', { screen: screenName })
    ]);
  }

  // ========================================
  // USER ANALYTICS
  // ========================================

  /**
   * Track user event
   */
  async trackEvent(
    eventName: string,
    properties: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    try {
      const userEvent: UserEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_name: eventName,
        user_id: userId,
        session_id: this.sessionId,
        timestamp: Date.now(),
        properties,
        screen: this.currentScreen,
        previous_screen: this.previousScreen
      };

      // Save to database
      await supabaseService.saveUserEvent(userEvent);

      // Track in Sentry as breadcrumb
      Sentry.addBreadcrumb({
        message: `Event: ${eventName}`,
        category: 'user_action',
        level: 'info',
        data: properties
      });

      console.log('Event tracked:', userEvent);
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  /**
   * Track screen view
   */
  async trackScreenView(screenName: string, userId?: string): Promise<void> {
    this.previousScreen = this.currentScreen;
    this.currentScreen = screenName;

    await this.trackEvent('screen_view', {
      screen_name: screenName,
      previous_screen: this.previousScreen,
      session_duration: Date.now() - this.sessionStartTime
    }, userId);
  }

  /**
   * Track user action
   */
  async trackUserAction(
    action: string,
    target: string,
    properties: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    await this.trackEvent('user_action', {
      action,
      target,
      ...properties
    }, userId);
  }

  // ========================================
  // SYSTEM HEALTH MONITORING
  // ========================================

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Check health every 5 minutes
    setInterval(async () => {
      await this.checkSystemHealth();
    }, 5 * 60 * 1000);

    // Initial health check
    this.checkSystemHealth();
  }

  /**
   * Check system health
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    try {
      // Test database connection
      const dbHealthy = await this.testDatabaseHealth();
      
      // Test API response time
      const apiHealthy = await this.testAPIHealth();
      
      // Check memory usage
      const memoryUsage = await this.getMemoryUsage();
      
      // Calculate error rate
      const errorRate = await this.calculateErrorRate();
      
      // Get active users
      const activeUsers = await this.getActiveUsersCount();

      const responseTime = Date.now() - startTime;
      
      const health: SystemHealth = {
        status: this.determineOverallStatus(dbHealthy, apiHealthy, memoryUsage, errorRate),
        response_time_ms: responseTime,
        memory_usage_percent: memoryUsage,
        error_rate_percent: errorRate,
        active_users: activeUsers,
        last_updated: Date.now(),
        checks: {
          database: dbHealthy ? 'healthy' : 'unhealthy',
          api: apiHealthy ? 'healthy' : 'unhealthy',
          storage: 'healthy', // Simplified
          notifications: 'healthy' // Simplified
        }
      };

      // Save health status
      await supabaseService.saveSystemHealth(health);

      // Alert if unhealthy
      if (health.status !== 'healthy') {
        await this.sendHealthAlert(health);
      }

      return health;
    } catch (error) {
      console.error('Error checking system health:', error);
      
      const health: SystemHealth = {
        status: 'down',
        response_time_ms: Date.now() - startTime,
        memory_usage_percent: 0,
        error_rate_percent: 100,
        active_users: 0,
        last_updated: Date.now(),
        checks: {
          database: 'unhealthy',
          api: 'unhealthy',
          storage: 'unhealthy',
          notifications: 'unhealthy'
        }
      };

      await this.sendHealthAlert(health);
      return health;
    }
  }

  /**
   * Get usage analytics
   */
  async getUsageAnalytics(days: number = 30): Promise<UsageAnalytics> {
    try {
      return await supabaseService.getUsageAnalytics(days);
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      return {
        daily_active_users: 0,
        monthly_active_users: 0,
        session_duration_avg: 0,
        agent_executions_count: 0,
        workflow_executions_count: 0,
        total_cost: 0,
        error_rate: 0,
        retention_rate: 0
      };
    }
  }

  // ========================================
  // MEMORY MONITORING
  // ========================================

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    setInterval(async () => {
      const memoryUsage = await this.getMemoryUsage();
      
      if (memoryUsage > this.memoryWarningThreshold) {
        await this.reportCustomError(
          `High memory usage: ${(memoryUsage * 100).toFixed(1)}%`,
          'MemoryWarning',
          'medium',
          { memory_usage_percent: memoryUsage }
        );
      }
      
      await this.trackPerformanceMetric('memory_usage', memoryUsage * 100, 'percent');
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get memory usage
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      // This is simplified - in a real app, you'd use platform-specific memory APIs
      return 0.5; // 50% as example
    } catch (error) {
      console.error('Error getting memory usage:', error);
      return 0;
    }
  }

  // ========================================
  // NETWORK MONITORING
  // ========================================

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    // Monitor fetch requests
    const originalFetch = global.fetch;
    global.fetch = async (...args) => {
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        await this.trackPerformanceMetric('network_request', duration, 'ms', {
          url: this.sanitizeUrl(url),
          status: response.status,
          method: args[1]?.method || 'GET',
          success: response.ok
        });
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        await this.trackPerformanceMetric('network_request', duration, 'ms', {
          url: this.sanitizeUrl(url),
          method: args[1]?.method || 'GET',
          success: false,
          error: error instanceof Error ? error.message : 'Network error'
        });
        
        throw error;
      }
    };
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      platform: Device.osName || 'unknown',
      os_version: Device.osVersion || 'unknown',
      device_model: Device.modelName || 'unknown',
      device_brand: Device.brand || 'unknown',
      app_version: Constants.expoConfig?.version || 'unknown',
      build_number: Constants.expoConfig?.android?.versionCode?.toString() || 
                   Constants.expoConfig?.ios?.buildNumber || 'unknown',
      is_physical_device: Device.isDevice,
      memory_usage: await this.getMemoryUsage(),
    };
  }

  /**
   * Get user agent string
   */
  private async getUserAgent(): Promise<string> {
    const deviceInfo = await this.getDeviceInfo();
    return `ExpoAtlas/${deviceInfo.app_version} (${deviceInfo.platform} ${deviceInfo.os_version}; ${deviceInfo.device_model})`;
  }

  /**
   * Sanitize event for Sentry
   */
  private sanitizeEvent(event: any): any {
    // Remove sensitive data
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    
    if (event.user) {
      delete event.user.email;
    }
    
    return event;
  }

  /**
   * Sanitize URL for logging
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove sensitive query parameters
      urlObj.searchParams.delete('token');
      urlObj.searchParams.delete('key');
      urlObj.searchParams.delete('password');
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Map severity to Sentry level
   */
  private mapSeverityToSentryLevel(severity: string): any {
    const mapping = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'fatal'
    };
    return mapping[severity as keyof typeof mapping] || 'error';
  }

  /**
   * Test database health
   */
  private async testDatabaseHealth(): Promise<boolean> {
    try {
      // Simple health check query
      await supabaseService.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test API health
   */
  private async testAPIHealth(): Promise<boolean> {
    try {
      // Test basic API endpoint
      const response = await fetch(process.env.EXPO_PUBLIC_SUPABASE_URL + '/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate error rate
   */
  private async calculateErrorRate(): Promise<number> {
    try {
      // Get error rate from last hour
      return await supabaseService.getErrorRate(60); // 60 minutes
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get active users count
   */
  private async getActiveUsersCount(): Promise<number> {
    try {
      return await supabaseService.getActiveUsersCount();
    } catch (error) {
      return 0;
    }
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(
    dbHealthy: boolean,
    apiHealthy: boolean,
    memoryUsage: number,
    errorRate: number
  ): 'healthy' | 'degraded' | 'down' {
    if (!dbHealthy || !apiHealthy) {
      return 'down';
    }
    
    if (memoryUsage > 0.9 || errorRate > 10) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Send critical alert
   */
  private async sendCriticalAlert(error: ErrorEvent): Promise<void> {
    try {
      // This would integrate with alerting systems like PagerDuty, Slack, etc.
      console.error('CRITICAL ALERT:', error);
      
      // For now, just log to database with high priority
      await supabaseService.saveAlert({
        type: 'critical_error',
        message: error.message,
        severity: 'critical',
        timestamp: Date.now(),
        metadata: error
      });
    } catch (alertError) {
      console.error('Failed to send critical alert:', alertError);
    }
  }

  /**
   * Send health alert
   */
  private async sendHealthAlert(health: SystemHealth): Promise<void> {
    try {
      console.warn('HEALTH ALERT:', health);
      
      await supabaseService.saveAlert({
        type: 'system_health',
        message: `System status: ${health.status}`,
        severity: health.status === 'down' ? 'critical' : 'high',
        timestamp: Date.now(),
        metadata: health
      });
    } catch (alertError) {
      console.error('Failed to send health alert:', alertError);
    }
  }

  // ========================================
  // PUBLIC API METHODS
  // ========================================

  /**
   * Set user context
   */
  setUser(userId: string, userData: Record<string, any> = {}): void {
    Sentry.setUser({
      id: userId,
      ...userData
    });
  }

  /**
   * Set custom context
   */
  setContext(key: string, context: Record<string, any>): void {
    Sentry.setContext(key, context);
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data
    });
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Flush pending events
   */
  async flush(): Promise<void> {
    try {
      await Sentry.flush();
    } catch (error) {
      console.error('Error flushing monitoring events:', error);
    }
  }

  /**
   * Clean up monitoring service
   */
  cleanup(): void {
    try {
      Sentry.close();
    } catch (error) {
      console.error('Error cleaning up monitoring service:', error);
    }
  }
}

export const monitoringService = new MonitoringService();