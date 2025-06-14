// import * as SQLite from 'expo-sqlite';
// import * as FileSystem from 'expo-file-system';
// import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Temporary mock objects for compilation
const SQLite = {
  openDatabaseAsync: (...args: any[]) => Promise.resolve({
    execAsync: (...args: any[]) => Promise.resolve(),
    runAsync: (...args: any[]) => Promise.resolve(),
    getAllAsync: (...args: any[]) => Promise.resolve([]),
    getFirstAsync: (...args: any[]) => Promise.resolve(null),
    closeAsync: (...args: any[]) => Promise.resolve()
  })
};

const FileSystem = {
  documentDirectory: '/mock/directory/',
  makeDirectoryAsync: (...args: any[]) => Promise.resolve(),
  getInfoAsync: (...args: any[]) => Promise.resolve({ exists: false, size: 0 }),
  downloadAsync: (...args: any[]) => Promise.resolve({ uri: '/mock/file' }),
  deleteAsync: (...args: any[]) => Promise.resolve(),
  readAsStringAsync: (...args: any[]) => Promise.resolve(''),
  writeAsStringAsync: (...args: any[]) => Promise.resolve(),
  copyAsync: (...args: any[]) => Promise.resolve()
};

const NetInfo = {
  addEventListener: (callback: any) => {
    // Mock network state
    callback({ isConnected: true });
    return () => {}; // Return unsubscribe function
  }
};

interface NetInfoState {
  isConnected: boolean | null;
}
import { supabaseService } from './supabase';

export interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retry_count: number;
  max_retries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  error_message?: string;
}

export interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  expires_at?: number;
  version: number;
}

export interface SyncStatus {
  is_online: boolean;
  last_sync: number;
  pending_actions: number;
  sync_in_progress: boolean;
  last_error?: string;
}

class OfflineSupportService {
  private db: any | null = null;
  private isOnline = true;
  private syncInProgress = false;
  private syncQueue: OfflineAction[] = [];
  private netInfoUnsubscribe: (() => void) | null = null;
  private syncListeners: ((status: SyncStatus) => void)[] = [];

  // ========================================
  // INITIALIZATION
  // ========================================

  /**
   * Initialize offline support
   */
  async initialize(): Promise<void> {
    try {
      // Open SQLite database
      this.db = await SQLite.openDatabaseAsync('expo_atlas_offline.db');

      // Create tables
      await this.createTables();

      // Load pending actions
      await this.loadPendingActions();

      // Set up network monitoring
      this.setupNetworkMonitoring();

      console.log('Offline support initialized successfully');
    } catch (error) {
      console.error('Failed to initialize offline support:', error);
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) return;

    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS offline_actions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        status TEXT DEFAULT 'pending',
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS cached_data (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        expires_at INTEGER,
        version INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS sync_status (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_sync INTEGER,
        last_error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_offline_actions_status ON offline_actions(status);
      CREATE INDEX IF NOT EXISTS idx_offline_actions_timestamp ON offline_actions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_cached_data_expires ON cached_data(expires_at);
    `);

    // Insert initial sync status if not exists
    await this.db.runAsync(
      'INSERT OR IGNORE INTO sync_status (id, last_sync) VALUES (1, 0)'
    );
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    this.netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected === true;

      if (!wasOnline && this.isOnline) {
        // Just came back online
        console.log('Network connection restored, starting sync...');
        this.syncPendingActions();
      } else if (wasOnline && !this.isOnline) {
        // Just went offline
        console.log('Network connection lost, switching to offline mode');
      }

      this.notifySyncListeners();
    });
  }

  // ========================================
  // OFFLINE ACTIONS QUEUE
  // ========================================

  /**
   * Queue action for offline execution
   */
  async queueAction(
    type: string,
    data: any,
    maxRetries: number = 3
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const action: OfflineAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retry_count: 0,
      max_retries: maxRetries,
      status: 'pending'
    };

    try {
      // Save to database
      await this.db.runAsync(
        `INSERT INTO offline_actions 
         (id, type, data, timestamp, retry_count, max_retries, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          action.id,
          action.type,
          JSON.stringify(action.data),
          action.timestamp,
          action.retry_count,
          action.max_retries,
          action.status
        ]
      );

      // Add to memory queue
      this.syncQueue.push(action);

      // Try to sync immediately if online
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingActions();
      }

      this.notifySyncListeners();
      return action.id;
    } catch (error) {
      console.error('Error queuing offline action:', error);
      throw error;
    }
  }

  /**
   * Load pending actions from database
   */
  private async loadPendingActions(): Promise<void> {
    if (!this.db) return;

    try {
      const result = await this.db.getAllAsync(`
        SELECT * FROM offline_actions 
        WHERE status IN ('pending', 'failed') 
        ORDER BY timestamp ASC
      `);

      this.syncQueue = result.map((row: any) => ({
        id: row.id as string,
        type: row.type as string,
        data: JSON.parse(row.data as string),
        timestamp: row.timestamp as number,
        retry_count: row.retry_count as number,
        max_retries: row.max_retries as number,
        status: row.status as 'pending' | 'syncing' | 'completed' | 'failed',
        error_message: row.error_message as string | undefined
      }));

      console.log(`Loaded ${this.syncQueue.length} pending actions`);
    } catch (error) {
      console.error('Error loading pending actions:', error);
    }
  }

  /**
   * Sync pending actions to server
   */
  async syncPendingActions(): Promise<void> {
    if (!this.isOnline || this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    this.notifySyncListeners();

    try {
      const actionsToSync = this.syncQueue.filter(
        action => action.status === 'pending' || action.status === 'failed'
      );

      for (const action of actionsToSync) {
        try {
          await this.executeAction(action);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
        }
      }

      // Update last sync time
      await this.updateLastSyncTime();
    } catch (error) {
      console.error('Error during sync:', error);
      await this.updateSyncError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.syncInProgress = false;
      this.notifySyncListeners();
    }
  }

  /**
   * Execute a single offline action
   */
  private async executeAction(action: OfflineAction): Promise<void> {
    if (!this.db) return;

    try {
      // Mark as syncing
      action.status = 'syncing';
      await this.updateActionStatus(action);

      // Execute based on action type
      let success = false;
      
      switch (action.type) {
        case 'create_agent':
          await supabaseService.createOpenAIAgent(action.data);
          success = true;
          break;
        case 'update_agent':
          await supabaseService.updateOpenAIAgent(action.data.id, action.data);
          success = true;
          break;
        case 'delete_agent':
          await supabaseService.deleteOpenAIAgent(action.data.id);
          success = true;
          break;
        case 'create_workflow':
          await supabaseService.createWorkflow(action.data);
          success = true;
          break;
        case 'update_workflow':
          await supabaseService.updateWorkflow(action.data.id, action.data);
          success = true;
          break;
        case 'delete_workflow':
          await supabaseService.deleteWorkflow(action.data.id);
          success = true;
          break;
        case 'send_chat_message':
          await supabaseService.createChatMessage(action.data);
          success = true;
          break;
        case 'create_team':
          await supabaseService.createTeam(action.data);
          success = true;
          break;
        case 'update_team':
          await supabaseService.updateTeam(action.data.id, action.data);
          success = true;
          break;
        default:
          console.warn(`Unknown action type: ${action.type}`);
          success = false;
      }

      if (success) {
        // Mark as completed
        action.status = 'completed';
        await this.updateActionStatus(action);
        
        // Remove from queue
        this.syncQueue = this.syncQueue.filter(a => a.id !== action.id);
        
        // Delete from database
        await this.db.runAsync('DELETE FROM offline_actions WHERE id = ?', [action.id]);
      } else {
        throw new Error('Action execution failed');
      }
    } catch (error) {
      // Handle retry logic
      action.retry_count++;
      action.error_message = error instanceof Error ? error.message : 'Unknown error';
      
      if (action.retry_count >= action.max_retries) {
        action.status = 'failed';
      } else {
        action.status = 'pending';
      }
      
      await this.updateActionStatus(action);
      throw error;
    }
  }

  /**
   * Update action status in database
   */
  private async updateActionStatus(action: OfflineAction): Promise<void> {
    if (!this.db) return;

    await this.db.runAsync(
      `UPDATE offline_actions 
       SET status = ?, retry_count = ?, error_message = ? 
       WHERE id = ?`,
      [action.status, action.retry_count, action.error_message || null, action.id]
    );
  }

  // ========================================
  // DATA CACHING
  // ========================================

  /**
   * Cache data for offline access
   */
  async cacheData(
    key: string,
    data: any,
    expiresInMinutes?: number
  ): Promise<void> {
    if (!this.db) return;

    const now = Date.now();
    const expiresAt = expiresInMinutes ? now + (expiresInMinutes * 60 * 1000) : null;

    try {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO cached_data 
         (key, data, timestamp, expires_at, version) 
         VALUES (?, ?, ?, ?, ?)`,
        [key, JSON.stringify(data), now, expiresAt, 1]
      );
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  /**
   * Get cached data
   */
  async getCachedData<T = any>(key: string): Promise<T | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.getFirstAsync(
        'SELECT * FROM cached_data WHERE key = ?',
        [key]
      ) as any;

      if (!result) return null;

      // Check if expired
      if (result.expires_at && Date.now() > result.expires_at) {
        await this.removeCachedData(key);
        return null;
      }

      return JSON.parse(result.data);
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Remove cached data
   */
  async removeCachedData(key: string): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync('DELETE FROM cached_data WHERE key = ?', [key]);
    } catch (error) {
      console.error('Error removing cached data:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    if (!this.db) return;

    try {
      const now = Date.now();
      await this.db.runAsync(
        'DELETE FROM cached_data WHERE expires_at IS NOT NULL AND expires_at < ?',
        [now]
      );
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    total_entries: number;
    total_size_mb: number;
    expired_entries: number;
  }> {
    if (!this.db) {
      return { total_entries: 0, total_size_mb: 0, expired_entries: 0 };
    }

    try {
      const totalResult = await this.db.getFirstAsync(
        'SELECT COUNT(*) as count, SUM(LENGTH(data)) as size FROM cached_data'
      ) as any;

      const expiredResult = await this.db.getFirstAsync(
        'SELECT COUNT(*) as count FROM cached_data WHERE expires_at IS NOT NULL AND expires_at < ?',
        [Date.now()]
      ) as any;

      return {
        total_entries: totalResult?.count || 0,
        total_size_mb: ((totalResult?.size || 0) / 1024 / 1024),
        expired_entries: expiredResult?.count || 0
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { total_entries: 0, total_size_mb: 0, expired_entries: 0 };
    }
  }

  // ========================================
  // SMART DATA FETCHING
  // ========================================

  /**
   * Fetch data with offline support
   */
  async fetchWithOfflineSupport<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    cacheMinutes: number = 60
  ): Promise<T> {
    try {
      if (this.isOnline) {
        // Try to fetch fresh data
        const data = await fetchFunction();
        
        // Cache the fresh data
        await this.cacheData(key, data, cacheMinutes);
        
        return data;
      } else {
        // Offline: return cached data
        const cachedData = await this.getCachedData<T>(key);
        if (cachedData) {
          return cachedData;
        } else {
          throw new Error('No cached data available offline');
        }
      }
    } catch (error) {
      // If online fetch fails, try cache
      if (this.isOnline) {
        const cachedData = await this.getCachedData<T>(key);
        if (cachedData) {
          console.warn(`Online fetch failed, using cached data for key: ${key}`);
          return cachedData;
        }
      }
      
      throw error;
    }
  }

  /**
   * Pre-cache important data
   */
  async preCacheImportantData(): Promise<void> {
    if (!this.isOnline) return;

    try {
      console.log('Pre-caching important data...');

      // Cache user agents
      const agents = await supabaseService.getOpenAIAgents();
      await this.cacheData('user_agents', agents, 120);

      // Cache user workflows
      const workflows = await supabaseService.getWorkflows();
      await this.cacheData('user_workflows', workflows, 120);

      // Cache user teams (mock userId for now)
      const teams = await supabaseService.getUserTeams('current-user-id');
      await this.cacheData('user_teams', teams, 60);

      // Cache recent executions
      const executions = await supabaseService.getRecentExecutions(20);
      await this.cacheData('recent_executions', executions, 30);

      console.log('Pre-caching completed');
    } catch (error) {
      console.error('Error pre-caching data:', error);
    }
  }

  // ========================================
  // SYNC STATUS & MONITORING
  // ========================================

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const pendingActions = this.syncQueue.filter(
      action => action.status === 'pending' || action.status === 'failed'
    ).length;

    let lastSync = 0;
    let lastError: string | undefined;

    if (this.db) {
      try {
        const result = await this.db.getFirstAsync(
          'SELECT last_sync, last_error FROM sync_status WHERE id = 1'
        ) as any;
        
        if (result) {
          lastSync = result.last_sync || 0;
          lastError = result.last_error || undefined;
        }
      } catch (error) {
        console.error('Error getting sync status:', error);
      }
    }

    return {
      is_online: this.isOnline,
      last_sync: lastSync,
      pending_actions: pendingActions,
      sync_in_progress: this.syncInProgress,
      last_error: lastError
    };
  }

  /**
   * Add sync status listener
   */
  addSyncListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all sync listeners
   */
  private async notifySyncListeners(): Promise<void> {
    const status = await this.getSyncStatus();
    this.syncListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Update last sync time
   */
  private async updateLastSyncTime(): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync(
        'UPDATE sync_status SET last_sync = ?, last_error = NULL WHERE id = 1',
        [Date.now()]
      );
    } catch (error) {
      console.error('Error updating last sync time:', error);
    }
  }

  /**
   * Update sync error
   */
  private async updateSyncError(error: string): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync(
        'UPDATE sync_status SET last_error = ? WHERE id = 1',
        [error]
      );
    } catch (error) {
      console.error('Error updating sync error:', error);
    }
  }

  // ========================================
  // FILE CACHING
  // ========================================

  /**
   * Cache file locally
   */
  async cacheFile(url: string, filename: string): Promise<string | null> {
    try {
      const cacheDir = `${FileSystem.documentDirectory}cache/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      
      const localPath = `${cacheDir}${filename}`;
      
      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        return localPath;
      }

      // Download file if online
      if (this.isOnline) {
        const downloadResult = await FileSystem.downloadAsync(url, localPath);
        return downloadResult.uri;
      }

      return null;
    } catch (error) {
      console.error('Error caching file:', error);
      return null;
    }
  }

  /**
   * Get cached file path
   */
  async getCachedFile(filename: string): Promise<string | null> {
    try {
      const localPath = `${FileSystem.documentDirectory}cache/${filename}`;
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      
      return fileInfo.exists ? localPath : null;
    } catch (error) {
      console.error('Error getting cached file:', error);
      return null;
    }
  }

  /**
   * Clear file cache
   */
  async clearFileCache(): Promise<void> {
    try {
      const cacheDir = `${FileSystem.documentDirectory}cache/`;
      const fileInfo = await FileSystem.getInfoAsync(cacheDir);
      
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(cacheDir, { idempotent: true });
      }
    } catch (error) {
      console.error('Error clearing file cache:', error);
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Check if device is online
   */
  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Force sync now
   */
  async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncPendingActions();
    }
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.execAsync(`
        DELETE FROM offline_actions;
        DELETE FROM cached_data;
        UPDATE sync_status SET last_sync = 0, last_error = NULL WHERE id = 1;
      `);

      this.syncQueue = [];
      await this.clearFileCache();
      
      console.log('All offline data cleared');
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    database_size_mb: number;
    cache_size_mb: number;
    total_size_mb: number;
  }> {
    try {
      const dbPath = `${FileSystem.documentDirectory}SQLite/expo_atlas_offline.db`;
      const cacheDir = `${FileSystem.documentDirectory}cache/`;

      const [dbInfo, cacheInfo] = await Promise.all([
        FileSystem.getInfoAsync(dbPath),
        FileSystem.getInfoAsync(cacheDir)
      ]);

      const dbSize = (dbInfo.exists && dbInfo.size) ? dbInfo.size / 1024 / 1024 : 0;
      const cacheSize = (cacheInfo.exists && cacheInfo.size) ? cacheInfo.size / 1024 / 1024 : 0;

      return {
        database_size_mb: dbSize,
        cache_size_mb: cacheSize,
        total_size_mb: dbSize + cacheSize
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        database_size_mb: 0,
        cache_size_mb: 0,
        total_size_mb: 0
      };
    }
  }

  /**
   * Clean up offline support
   */
  async cleanup(): Promise<void> {
    try {
      if (this.netInfoUnsubscribe) {
        this.netInfoUnsubscribe();
      }

      if (this.db) {
        await this.db.closeAsync();
        this.db = null;
      }

      this.syncListeners = [];
      this.syncQueue = [];
    } catch (error) {
      console.error('Error cleaning up offline support:', error);
    }
  }
}

export const offlineSupportService = new OfflineSupportService();