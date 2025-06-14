import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { supabaseService } from './supabase';

export interface SecurityEvent {
  id: string;
  event_type: SecurityEventType;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  status: 'detected' | 'investigating' | 'resolved' | 'false_positive';
}

export type SecurityEventType = 
  | 'suspicious_login'
  | 'multiple_failed_logins'
  | 'unusual_activity'
  | 'data_access_violation'
  | 'api_abuse'
  | 'potential_injection'
  | 'unauthorized_access'
  | 'data_breach_attempt'
  | 'malicious_payload'
  | 'rate_limit_exceeded'
  | 'access_granted'
  | 'access_revoked'
  | 'data_integrity_violation'
  | 'suspicious_session';

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  categories: string[];
  retention_period_days: number;
  encryption_required: boolean;
  access_controls: string[];
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  timestamp: number;
  ip_address?: string;
  user_agent?: string;
  result: 'success' | 'failure' | 'partial';
  metadata: Record<string, any>;
  data_classification: DataClassification;
}

export interface ComplianceReport {
  id: string;
  report_type: 'gdpr' | 'ccpa' | 'hipaa' | 'sox' | 'iso27001';
  generated_at: number;
  period_start: number;
  period_end: number;
  user_id?: string;
  status: 'generating' | 'completed' | 'failed';
  findings: ComplianceFinding[];
  summary: {
    total_violations: number;
    critical_violations: number;
    data_processed: number;
    user_requests: number;
  };
}

export interface ComplianceFinding {
  id: string;
  rule_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_resources: string[];
  recommendation: string;
  status: 'open' | 'acknowledged' | 'remediated' | 'accepted_risk';
}

export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  key_rotation_days: number;
  backup_encryption: boolean;
  transit_encryption: boolean;
  at_rest_encryption: boolean;
}

export interface AccessControl {
  user_id: string;
  resource_type: string;
  resource_id: string;
  permissions: string[];
  granted_by: string;
  granted_at: number;
  expires_at?: number;
  conditions?: Record<string, any>;
}

class SecurityService {
  private encryptionKey: string | null = null;
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();
  private suspiciousActivityThreshold = 10;
  private maxFailedLogins = 5;
  private sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

  // ========================================
  // INITIALIZATION
  // ========================================

  /**
   * Initialize security service
   */
  async initialize(): Promise<void> {
    try {
      // Initialize encryption
      await this.initializeEncryption();

      // Setup security monitoring
      this.setupSecurityMonitoring();

      // Start security scans
      this.startSecurityScans();

      console.log('Security service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize security service:', error);
    }
  }

  /**
   * Initialize encryption system
   */
  private async initializeEncryption(): Promise<void> {
    try {
      // Check if encryption key exists
      let key = await SecureStore.getItemAsync('app_encryption_key');
      
      if (!key) {
        // Generate new encryption key
        key = await this.generateEncryptionKey();
        await SecureStore.setItemAsync('app_encryption_key', key);
      }
      
      this.encryptionKey = key;
    } catch (error) {
      console.error('Error initializing encryption:', error);
      throw error;
    }
  }

  /**
   * Generate encryption key
   */
  private async generateEncryptionKey(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(randomBytes, (byte: number) => byte.toString(16).padStart(2, '0')).join('');
  }

  // ========================================
  // DATA ENCRYPTION & PROTECTION
  // ========================================

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string, classification: DataClassification): Promise<string> {
    if (!classification.encryption_required) {
      return data;
    }

    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    try {
      // Simple encryption implementation (in production, use proper crypto library)
      const encrypted = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data + this.encryptionKey
      );
      
      return `encrypted:${encrypted}`;
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedData: string): Promise<string> {
    if (!encryptedData.startsWith('encrypted:')) {
      return encryptedData; // Not encrypted
    }

    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    try {
      // This is a simplified implementation
      // In production, implement proper decryption
      return encryptedData.replace('encrypted:', '');
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw error;
    }
  }

  /**
   * Classify data based on content
   */
  classifyData(data: any): DataClassification {
    const content = JSON.stringify(data).toLowerCase();
    
    // Check for PII and sensitive data patterns
    const patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/,
      creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,
      api_key: /api[_-]?key|token|secret/i,
      password: /password|pwd|pass/i
    };

    const foundPatterns: string[] = [];
    for (const [pattern, regex] of Object.entries(patterns)) {
      if (regex.test(content)) {
        foundPatterns.push(pattern);
      }
    }

    // Determine classification level
    let level: DataClassification['level'] = 'public';
    if (foundPatterns.some(p => ['api_key', 'password', 'ssn', 'creditCard'].includes(p))) {
      level = 'restricted';
    } else if (foundPatterns.some(p => ['email', 'phone'].includes(p))) {
      level = 'confidential';
    } else if (foundPatterns.length > 0) {
      level = 'internal';
    }

    return {
      level,
      categories: foundPatterns,
      retention_period_days: level === 'restricted' ? 90 : level === 'confidential' ? 365 : 1095,
      encryption_required: level === 'restricted' || level === 'confidential',
      access_controls: level === 'restricted' ? ['admin', 'owner'] : 
                      level === 'confidential' ? ['admin', 'owner', 'editor'] : 
                      ['admin', 'owner', 'editor', 'viewer']
    };
  }

  // ========================================
  // ACCESS CONTROL & AUTHORIZATION
  // ========================================

  /**
   * Check access permissions
   */
  async checkAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    permission: string
  ): Promise<boolean> {
    try {
      // Get user's access controls
      const accessControls = await supabaseService.getUserAccessControls(userId, resourceType, resourceId);
      
      for (const control of accessControls) {
        // Check if access has expired
        if (control.expires_at && control.expires_at < Date.now()) {
          continue;
        }
        
        // Check if permission is granted
        if (control.permissions.includes(permission) || control.permissions.includes('*')) {
          // Check conditions if any
          if (control.conditions && !this.evaluateAccessConditions(control.conditions)) {
            continue;
          }
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  }

  /**
   * Grant access to resource
   */
  async grantAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    permissions: string[],
    grantedBy: string,
    expiresAt?: number,
    conditions?: Record<string, any>
  ): Promise<void> {
    try {
      const accessControl: AccessControl = {
        user_id: userId,
        resource_type: resourceType,
        resource_id: resourceId,
        permissions,
        granted_by: grantedBy,
        granted_at: Date.now(),
        expires_at: expiresAt,
        conditions
      };

      await supabaseService.createAccessControl(accessControl);
      
      // Log access grant
      await this.logSecurityEvent('access_granted', userId, 'low', {
        resource_type: resourceType,
        resource_id: resourceId,
        permissions,
        granted_by: grantedBy
      });
    } catch (error) {
      console.error('Error granting access:', error);
      throw error;
    }
  }

  /**
   * Revoke access to resource
   */
  async revokeAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    revokedBy: string
  ): Promise<void> {
    try {
      await supabaseService.deleteAccessControl(userId, resourceType, resourceId);
      
      // Log access revocation
      await this.logSecurityEvent('access_revoked', userId, 'medium', {
        resource_type: resourceType,
        resource_id: resourceId,
        revoked_by: revokedBy
      });
    } catch (error) {
      console.error('Error revoking access:', error);
      throw error;
    }
  }

  /**
   * Evaluate access conditions
   */
  private evaluateAccessConditions(conditions: Record<string, any>): boolean {
    const now = Date.now();
    
    // Time-based conditions
    if (conditions.valid_from && now < conditions.valid_from) {
      return false;
    }
    
    if (conditions.valid_until && now > conditions.valid_until) {
      return false;
    }
    
    // IP address conditions
    if (conditions.allowed_ips && conditions.current_ip) {
      if (!conditions.allowed_ips.includes(conditions.current_ip)) {
        return false;
      }
    }
    
    // Device conditions
    if (conditions.allowed_devices && conditions.current_device) {
      if (!conditions.allowed_devices.includes(conditions.current_device)) {
        return false;
      }
    }
    
    return true;
  }

  // ========================================
  // SECURITY MONITORING & THREAT DETECTION
  // ========================================

  /**
   * Setup security monitoring
   */
  private setupSecurityMonitoring(): void {
    // Monitor failed login attempts
    this.setupLoginMonitoring();
    
    // Monitor API usage patterns
    this.setupAPIMonitoring();
    
    // Monitor data access patterns
    this.setupDataAccessMonitoring();
  }

  /**
   * Setup login monitoring
   */
  private setupLoginMonitoring(): void {
    // This would integrate with authentication events
    console.log('Login monitoring setup');
  }

  /**
   * Setup API monitoring
   */
  private setupAPIMonitoring(): void {
    // Monitor API calls for suspicious patterns
    const originalFetch = global.fetch;
    global.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : 
        args[0] instanceof Request ? args[0].url : 
        args[0] instanceof URL ? args[0].toString() : 
        String(args[0]);
      const method = args[1]?.method || 'GET';
      
      // Check rate limits
      if (this.isRateLimited(url)) {
        await this.logSecurityEvent('rate_limit_exceeded', undefined, 'medium', {
          url,
          method
        });
        throw new Error('Rate limit exceeded');
      }
      
      // Execute request
      const response = await originalFetch(...args);
      
      // Monitor for suspicious patterns
      if (!response.ok && response.status === 401) {
        await this.logSecurityEvent('unauthorized_access', undefined, 'high', {
          url,
          method,
          status: response.status
        });
      }
      
      return response;
    };
  }

  /**
   * Setup data access monitoring
   */
  private setupDataAccessMonitoring(): void {
    // Monitor database queries for suspicious patterns
    console.log('Data access monitoring setup');
  }

  /**
   * Check if request is rate limited
   */
  private isRateLimited(url: string): boolean {
    const key = this.getRateLimitKey(url);
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 100; // 100 requests per minute
    
    const limiter = this.rateLimiters.get(key);
    
    if (!limiter || now > limiter.resetTime) {
      this.rateLimiters.set(key, { count: 1, resetTime: now + windowMs });
      return false;
    }
    
    limiter.count++;
    return limiter.count > maxRequests;
  }

  /**
   * Get rate limit key
   */
  private getRateLimitKey(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  }

  /**
   * Start security scans
   */
  private startSecurityScans(): void {
    // Run security scans every hour
    setInterval(async () => {
      await this.runSecurityScan();
    }, 60 * 60 * 1000);
    
    // Initial scan
    setTimeout(() => {
      this.runSecurityScan();
    }, 5000);
  }

  /**
   * Run security scan
   */
  private async runSecurityScan(): Promise<void> {
    try {
      console.log('Running security scan...');
      
      // Check for suspicious user activity
      await this.scanForSuspiciousActivity();
      
      // Check for data integrity issues
      await this.scanDataIntegrity();
      
      // Check for access violations
      await this.scanAccessViolations();
      
      console.log('Security scan completed');
    } catch (error) {
      console.error('Error running security scan:', error);
    }
  }

  /**
   * Scan for suspicious activity
   */
  private async scanForSuspiciousActivity(): Promise<void> {
    try {
      // Get recent user activities
      const activities = await supabaseService.getRecentUserActivities(24); // Last 24 hours
      
      // Analyze patterns
      const userActivityCounts = new Map<string, number>();
      
      for (const activity of activities) {
        const count = userActivityCounts.get(activity.user_id) || 0;
        userActivityCounts.set(activity.user_id, count + 1);
      }
      
      // Check for users with excessive activity
      for (const [userId, count] of userActivityCounts) {
        if (count > this.suspiciousActivityThreshold) {
          await this.logSecurityEvent('unusual_activity', userId, 'medium', {
            activity_count: count,
            threshold: this.suspiciousActivityThreshold
          });
        }
      }
    } catch (error) {
      console.error('Error scanning for suspicious activity:', error);
    }
  }

  /**
   * Scan data integrity
   */
  private async scanDataIntegrity(): Promise<void> {
    try {
      // Check for data corruption or unauthorized modifications
      const integrityChecks = await supabaseService.runDataIntegrityChecks();
      
      for (const check of integrityChecks) {
        if (!check.passed) {
          await this.logSecurityEvent('data_integrity_violation', undefined, 'high', {
            check_name: check.name,
            details: check.details
          });
        }
      }
    } catch (error) {
      console.error('Error scanning data integrity:', error);
    }
  }

  /**
   * Scan for access violations
   */
  private async scanAccessViolations(): Promise<void> {
    try {
      // Check for unauthorized access attempts
      const accessLogs = await supabaseService.getRecentAccessLogs(24); // Last 24 hours
      
      for (const log of accessLogs) {
        if (log.result === 'failure') {
          // Check if user has multiple failed attempts
          const failedAttempts = accessLogs.filter(
            l => l.user_id === log.user_id && 
                 l.result === 'failure' && 
                 l.timestamp > Date.now() - (60 * 60 * 1000) // Last hour
          );
          
          if (failedAttempts.length >= this.maxFailedLogins) {
            await this.logSecurityEvent('multiple_failed_logins', log.user_id, 'high', {
              failed_attempts: failedAttempts.length,
              resource_type: log.resource_type,
              resource_id: log.resource_id
            });
          }
        }
      }
    } catch (error) {
      console.error('Error scanning access violations:', error);
    }
  }

  // ========================================
  // AUDIT LOGGING
  // ========================================

  /**
   * Log audit event
   */
  async logAuditEvent(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    result: 'success' | 'failure' | 'partial',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const classification = this.classifyData(metadata);
      
      const auditLog: AuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        timestamp: Date.now(),
        result,
        metadata,
        data_classification: classification
      };

      await supabaseService.saveAuditLog(auditLog);
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    eventType: SecurityEventType,
    userId: string | undefined,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      const securityEvent: SecurityEvent = {
        id: `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_type: eventType,
        user_id: userId,
        timestamp: Date.now(),
        severity,
        details,
        status: 'detected'
      };

      await supabaseService.saveSecurityEvent(securityEvent);
      
      // Send alert for high/critical events
      if (severity === 'high' || severity === 'critical') {
        await this.sendSecurityAlert(securityEvent);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  // ========================================
  // COMPLIANCE & REPORTING
  // ========================================

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    reportType: 'gdpr' | 'ccpa' | 'hipaa' | 'sox' | 'iso27001',
    periodStart: number,
    periodEnd: number,
    userId?: string
  ): Promise<ComplianceReport> {
    try {
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const report: ComplianceReport = {
        id: reportId,
        report_type: reportType,
        generated_at: Date.now(),
        period_start: periodStart,
        period_end: periodEnd,
        user_id: userId,
        status: 'generating',
        findings: [],
        summary: {
          total_violations: 0,
          critical_violations: 0,
          data_processed: 0,
          user_requests: 0
        }
      };

      // Save initial report
      await supabaseService.saveComplianceReport(report);

      // Generate findings based on report type
      report.findings = await this.generateComplianceFindings(reportType, periodStart, periodEnd, userId);
      
      // Calculate summary
      report.summary.total_violations = report.findings.length;
      report.summary.critical_violations = report.findings.filter(f => f.severity === 'critical').length;
      
      // Get additional metrics
      const metrics = await supabaseService.getComplianceMetrics(periodStart, periodEnd, userId);
      report.summary.data_processed = metrics.data_processed;
      report.summary.user_requests = metrics.user_requests;
      
      report.status = 'completed';
      
      // Update report
      await supabaseService.updateComplianceReport(reportId, report);
      
      return report;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Generate compliance findings
   */
  private async generateComplianceFindings(
    reportType: string,
    periodStart: number,
    periodEnd: number,
    userId?: string
  ): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];
    
    try {
      switch (reportType) {
        case 'gdpr':
          findings.push(...await this.generateGDPRFindings(periodStart, periodEnd, userId));
          break;
        case 'ccpa':
          findings.push(...await this.generateCCPAFindings(periodStart, periodEnd, userId));
          break;
        case 'hipaa':
          findings.push(...await this.generateHIPAAFindings(periodStart, periodEnd, userId));
          break;
        case 'sox':
          findings.push(...await this.generateSOXFindings(periodStart, periodEnd, userId));
          break;
        case 'iso27001':
          findings.push(...await this.generateISO27001Findings(periodStart, periodEnd, userId));
          break;
      }
    } catch (error) {
      console.error('Error generating compliance findings:', error);
    }
    
    return findings;
  }

  /**
   * Generate GDPR findings
   */
  private async generateGDPRFindings(
    periodStart: number,
    periodEnd: number,
    userId?: string
  ): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];
    
    // Check for data retention violations
    const expiredData = await supabaseService.getExpiredPersonalData(periodStart, periodEnd);
    if (expiredData.length > 0) {
      findings.push({
        id: `gdpr_retention_${Date.now()}`,
        rule_id: 'GDPR_ART_5_1_E',
        severity: 'high',
        description: 'Personal data retained beyond legal retention period',
        affected_resources: expiredData.map((d: any) => d.id || 'unknown'),
        recommendation: 'Delete or anonymize expired personal data',
        status: 'open'
      });
    }
    
    // Check for consent violations
    const consentViolations = await supabaseService.getConsentViolations(periodStart, periodEnd);
    if (consentViolations.length > 0) {
      findings.push({
        id: `gdpr_consent_${Date.now()}`,
        rule_id: 'GDPR_ART_6',
        severity: 'critical',
        description: 'Processing personal data without valid consent',
        affected_resources: consentViolations.map((v: any) => v.id || 'unknown'),
        recommendation: 'Obtain explicit consent or establish alternative legal basis',
        status: 'open'
      });
    }
    
    return findings;
  }

  /**
   * Generate CCPA findings
   */
  private async generateCCPAFindings(
    periodStart: number,
    periodEnd: number,
    userId?: string
  ): Promise<ComplianceFinding[]> {
    // Simplified CCPA compliance checks
    return [];
  }

  /**
   * Generate HIPAA findings
   */
  private async generateHIPAAFindings(
    periodStart: number,
    periodEnd: number,
    userId?: string
  ): Promise<ComplianceFinding[]> {
    // Simplified HIPAA compliance checks
    return [];
  }

  /**
   * Generate SOX findings
   */
  private async generateSOXFindings(
    periodStart: number,
    periodEnd: number,
    userId?: string
  ): Promise<ComplianceFinding[]> {
    // Simplified SOX compliance checks
    return [];
  }

  /**
   * Generate ISO 27001 findings
   */
  private async generateISO27001Findings(
    periodStart: number,
    periodEnd: number,
    userId?: string
  ): Promise<ComplianceFinding[]> {
    // Simplified ISO 27001 compliance checks
    return [];
  }

  // ========================================
  // DATA PRIVACY & PROTECTION
  // ========================================

  /**
   * Handle data subject request (GDPR Article 15)
   */
  async handleDataSubjectRequest(
    userId: string,
    requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction',
    details?: Record<string, any>
  ): Promise<string> {
    try {
      const requestId = `dsr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Log the request
      await this.logAuditEvent(
        userId,
        `data_subject_request_${requestType}`,
        'data_request',
        requestId,
        'success',
        { request_type: requestType, details }
      );
      
      // Process request based on type
      switch (requestType) {
        case 'access':
          await this.processDataAccessRequest(userId, requestId);
          break;
        case 'rectification':
          await this.processDataRectificationRequest(userId, requestId, details);
          break;
        case 'erasure':
          await this.processDataErasureRequest(userId, requestId);
          break;
        case 'portability':
          await this.processDataPortabilityRequest(userId, requestId);
          break;
        case 'restriction':
          await this.processDataRestrictionRequest(userId, requestId);
          break;
      }
      
      return requestId;
    } catch (error) {
      console.error('Error handling data subject request:', error);
      throw error;
    }
  }

  /**
   * Process data access request
   */
  private async processDataAccessRequest(userId: string, requestId: string): Promise<void> {
    // Collect all user data from various sources
    const userData = await supabaseService.getAllUserData(userId);
    
    // Generate data export
    await supabaseService.generateDataExport(requestId, userData);
  }

  /**
   * Process data rectification request
   */
  private async processDataRectificationRequest(
    userId: string,
    requestId: string,
    details?: Record<string, any>
  ): Promise<void> {
    if (details) {
      // Update user data based on rectification request
      await supabaseService.updateUserData(userId, details);
    }
  }

  /**
   * Process data erasure request
   */
  private async processDataErasureRequest(userId: string, requestId: string): Promise<void> {
    // Anonymize or delete user data
    await supabaseService.anonymizeUserData(userId);
  }

  /**
   * Process data portability request
   */
  private async processDataPortabilityRequest(userId: string, requestId: string): Promise<void> {
    // Export user data in structured format
    const userData = await supabaseService.getAllUserData(userId);
    await supabaseService.generatePortableDataExport(requestId, userData);
  }

  /**
   * Process data restriction request
   */
  private async processDataRestrictionRequest(userId: string, requestId: string): Promise<void> {
    // Mark user data for processing restriction
    await supabaseService.restrictUserDataProcessing(userId);
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Send security alert
   */
  private async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    try {
      // This would integrate with alerting systems
      console.warn('SECURITY ALERT:', event);
      
      // Save alert for dashboard
      await supabaseService.saveAlert({
        type: 'security',
        message: `Security event: ${event.event_type}`,
        severity: event.severity,
        timestamp: Date.now(),
        metadata: event
      });
    } catch (error) {
      console.error('Error sending security alert:', error);
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const session = await supabaseService.getSession(sessionId);
      
      if (!session || session.user_id !== userId) {
        return false;
      }
      
      // Check if session has expired
      if (session.expires_at && session.expires_at < Date.now()) {
        await supabaseService.invalidateSession(sessionId);
        return false;
      }
      
      // Check for suspicious activity
      if (await this.detectSuspiciousSession(session)) {
        await this.logSecurityEvent('suspicious_session', userId, 'high', {
          session_id: sessionId
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  /**
   * Detect suspicious session
   */
  private async detectSuspiciousSession(session: any): Promise<boolean> {
    // Check for multiple concurrent sessions
    const activeSessions = await supabaseService.getActiveUserSessions(session.user_id);
    if (activeSessions.length > 5) {
      return true;
    }
    
    // Check for unusual location/device changes
    // This would require implementing device fingerprinting and geolocation
    
    return false;
  }

  /**
   * Generate security token
   */
  async generateSecurityToken(payload: Record<string, any>, expiresIn: number = 3600): Promise<string> {
    const tokenData = {
      ...payload,
      iat: Date.now(),
      exp: Date.now() + (expiresIn * 1000),
      nonce: await Crypto.getRandomBytesAsync(16).then((bytes: Uint8Array) => 
        Array.from(bytes, (byte: number) => byte.toString(16).padStart(2, '0')).join('')
      )
    };
    
    const tokenString = JSON.stringify(tokenData);
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, tokenString);
  }

  /**
   * Clean up security service
   */
  cleanup(): void {
    this.rateLimiters.clear();
  }
}

export const securityService = new SecurityService();