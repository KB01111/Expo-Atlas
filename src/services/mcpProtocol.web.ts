// Web-only MCP Protocol Service - No SDK dependencies at all
import { supabaseService } from './supabase';

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  transport_type?: 'sse' | 'stdio' | 'websocket';
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  capabilities: string[];
  tools: MCPTool[];
  authentication?: MCPAuthentication;
  metadata: {
    version: string;
    provider: string;
    category: string;
    last_connected: string;
    error_message?: string;
  };
}

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  server_id: string;
  schema?: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      required?: boolean;
    }>;
    required: string[];
  };
  parameters?: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      required?: boolean;
    }>;
    required: string[];
  };
  capabilities: ('read' | 'write' | 'execute' | 'realtime')[];
  usage_cost: number;
  rate_limits: {
    requests_per_minute: number;
    requests_per_day: number;
  };
}

export interface MCPAuthentication {
  type: 'none' | 'api_key' | 'oauth' | 'bearer';
  credentials?: Record<string, string>;
}

export interface MCPConnection {
  id?: string;
  server_id: string;
  agent_id: string;
  enabled: boolean;
  configuration: Record<string, any>;
  authentication: {
    type: 'none' | 'api_key' | 'oauth' | 'bearer';
    credentials?: Record<string, string>;
  };
  status?: 'active' | 'inactive' | 'error';
  created_at: string;
  last_used: string;
  last_activity?: string;
  connected_at?: string;
  usage_stats?: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    total_cost: number;
  };
}

export interface MCPExecutionResult {
  id: string;
  tool_id: string;
  server_id: string;
  agent_id?: string;
  status: 'success' | 'error' | 'timeout';
  started_at: string;
  completed_at: string;
  input_parameters: Record<string, any>;
  output_data?: any;
  error_message?: string;
  execution_time_ms: number;
  tokens_used: number;
  cost: number;
}

class WebMCPProtocolService {
  /**
   * Check if MCP is available (always false on web)
   */
  isAvailable(): boolean {
    return false;
  }

  /**
   * Get available MCP servers (returns empty array)
   */
  async getAvailableServers(): Promise<MCPServer[]> {
    return [];
  }

  /**
   * Get connected servers (always empty on web)
   */
  getConnectedServers(): MCPServer[] {
    return [];
  }

  /**
   * Connect to server (always fails on web)
   */
  async connectToServer(
    serverId: string,
    endpoint: string,
    transportType?: 'sse' | 'stdio' | 'websocket',
    authentication?: MCPAuthentication
  ): Promise<MCPServer> {
    throw new Error('MCP Protocol not supported on web platform');
  }

  /**
   * Disconnect from server (no-op on web)
   */
  async disconnectFromServer(serverId: string): Promise<void> {
    console.info('MCP disconnect ignored on web platform');
  }

  /**
   * Get server status (always disconnected on web)
   */
  getServerStatus(serverId: string): 'connected' | 'disconnected' | 'error' | 'connecting' {
    return 'disconnected';
  }

  /**
   * Discover servers (returns empty array on web)
   */
  async discoverServers(): Promise<MCPServer[]> {
    return [];
  }

  /**
   * Get server tools (returns empty array on web)
   */
  async getServerTools(serverId: string): Promise<MCPTool[]> {
    return [];
  }

  /**
   * Execute tool (always fails on web)
   */
  async executeTool(
    toolId: string,
    serverId: string,
    parameters: Record<string, any>,
    options?: { timeout?: number; retries?: number }
  ): Promise<MCPExecutionResult> {
    throw new Error('MCP tool execution not supported on web platform');
  }

  /**
   * Test connection (always fails on web)
   */
  async testConnection(
    endpoint: string,
    transportType: 'sse' | 'stdio' | 'websocket',
    authentication?: MCPAuthentication
  ): Promise<boolean> {
    return false;
  }

  /**
   * Get agent connections (returns empty array on web)
   */
  async getAgentConnections(agentId: string): Promise<MCPConnection[]> {
    return [];
  }

  /**
   * Create agent connection (always fails on web)
   */
  async createAgentConnection(agentId: string, serverId: string): Promise<MCPConnection> {
    throw new Error('MCP agent connections not supported on web platform');
  }

  /**
   * Get execution history (returns empty array on web)
   */
  async getExecutionHistory(
    agentId?: string,
    serverId?: string,
    limit: number = 50
  ): Promise<MCPExecutionResult[]> {
    return [];
  }

  /**
   * Get usage analytics (returns zero stats on web)
   */
  async getUsageAnalytics(timePeriod: string = '7d'): Promise<{
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    total_cost: number;
    most_used_tools: Array<{ tool_id: string; count: number }>;
    most_active_servers: Array<{ server_id: string; count: number }>;
  }> {
    return {
      total_executions: 0,
      successful_executions: 0,
      failed_executions: 0,
      total_cost: 0,
      most_used_tools: [],
      most_active_servers: []
    };
  }

  /**
   * Setup MCP environment (no-op on web)
   */
  async setupMCPEnvironment(): Promise<void> {
    console.info('MCP environment setup not needed on web platform');
  }

  /**
   * Cleanup MCP resources (no-op on web)
   */
  async cleanup(): Promise<void> {
    console.info('MCP cleanup not needed on web platform');
  }
}

export const mcpProtocolService = new WebMCPProtocolService();