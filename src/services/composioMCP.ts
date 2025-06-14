// import { Composio } from 'composio-core';
import { supabaseService } from './supabase';

/**
 * Composio MCP Integration Service
 * Provides full integration with Composio for accessing MCP servers and tools
 * TEMPORARILY DISABLED DUE TO BUNDLING ISSUES
 */

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  capabilities: string[];
  tools: MCPTool[];
  transport_type?: 'sse' | 'stdio' | 'websocket';
  authentication?: {
    type: 'none' | 'api_key' | 'oauth' | 'bearer';
    credentials?: Record<string, string>;
  };
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

class ComposioMCPService {
  // private composio: Composio;
  private connectedServers: Map<string, MCPServer> = new Map();
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_COMPOSIO_API_KEY || '';
    // this.composio = new Composio({
    //   apiKey: this.apiKey,
    // });
  }

  // ========================================
  // SERVER DISCOVERY & CONNECTION
  // ========================================

  /**
   * Discover available MCP servers
   */
  async discoverServers(): Promise<MCPServer[]> {
    try {
      // Get available Composio apps/integrations - TEMPORARILY DISABLED
      // const apps = await this.composio.apps.list();
      const apps: any[] = [];
      
      const servers: MCPServer[] = apps.map(app => ({
        id: app.appId,
        name: app.name,
        description: app.description || `${app.name} integration via Composio`,
        endpoint: `composio://${app.appId}`,
        status: 'disconnected' as const,
        capabilities: this.mapAppCapabilities(app),
        tools: [],
        metadata: {
          version: '1.0.0',
          provider: 'composio',
          category: app.categories?.[0] || 'general',
          last_connected: new Date().toISOString()
        }
      }));

      // Add popular MCP servers
      const popularServers = await this.getPopularMCPServers();
      servers.push(...popularServers);

      return servers;
    } catch (error) {
      console.error('Error discovering MCP servers:', error);
      return [];
    }
  }

  /**
   * Connect to an MCP server
   */
  async connectToServer(
    serverId: string, 
    endpoint?: string,
    transportType?: 'sse' | 'stdio' | 'websocket',
    authentication?: MCPConnection['authentication']
  ): Promise<MCPServer> {
    try {
      // For Composio integrations
      if (serverId.includes('composio://')) {
        const appId = serverId.replace('composio://', '');
        
        // For now, return mock tools for Composio integrations
        const mockTools = this.getMockToolsForApp(appId);
        
        const tools: MCPTool[] = mockTools.map((action: any) => ({
          id: action.name,
          name: action.display_name || action.name,
          description: action.description || `Execute ${action.name} action`,
          server_id: serverId,
          parameters: {
            type: 'object',
            properties: action.parameters?.properties || {},
            required: action.parameters?.required || []
          },
          capabilities: ['execute'],
          usage_cost: 0.001, // Estimated cost per execution
          rate_limits: {
            requests_per_minute: 60,
            requests_per_day: 1000
          }
        }));

        const server: MCPServer = {
          id: serverId,
          name: appId,
          description: `${appId} via Composio`,
          endpoint: serverId,
          status: 'connected',
          capabilities: ['actions', 'triggers'],
          tools,
          metadata: {
            version: '1.0.0',
            provider: 'composio',
            category: 'integration',
            last_connected: new Date().toISOString()
          }
        };

        this.connectedServers.set(serverId, server);
        
        // Save to database
        await supabaseService.saveMCPServer(server);
        
        return server;
      }

      // For other MCP servers, implement direct MCP protocol connection
      return await this.connectDirectMCPServer(serverId, endpoint, transportType, authentication);
    } catch (error) {
      console.error('Error connecting to MCP server:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnectFromServer(serverId: string): Promise<void> {
    this.connectedServers.delete(serverId);
    await supabaseService.updateMCPServerStatus(serverId, 'disconnected');
  }

  /**
   * Get connected servers
   */
  getConnectedServers(): MCPServer[] {
    return Array.from(this.connectedServers.values());
  }

  // ========================================
  // TOOL EXECUTION
  // ========================================

  /**
   * Execute MCP tool
   */
  async executeTool(
    toolId: string,
    serverId: string,
    parameters: Record<string, any>,
    agentId?: string
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    execution_time: number;
    cost: number;
  }> {
    const startTime = Date.now();
    
    try {
      const server = this.connectedServers.get(serverId);
      if (!server) {
        throw new Error('Server not connected');
      }

      const tool = server.tools.find(t => t.id === toolId);
      if (!tool) {
        throw new Error('Tool not found');
      }

      let result: any;

      // Execute via Composio
      if (serverId.includes('composio://')) {
        // For now, return a mock result
        result = {
          success: true,
          message: `Executed ${toolId} with Composio`,
          data: parameters
        };
      } else {
        // Direct MCP execution
        result = await this.executeDirectMCPTool(serverId, toolId, parameters);
      }

      const executionTime = Date.now() - startTime;
      const cost = tool.usage_cost;

      // Log execution
      if (agentId) {
        await supabaseService.logMCPToolExecution({
          tool_id: toolId,
          server_id: serverId,
          agent_id: agentId,
          parameters,
          result,
          execution_time: executionTime,
          cost,
          status: 'success',
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: true,
        result,
        execution_time: executionTime,
        cost
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log error
      if (agentId) {
        await supabaseService.logMCPToolExecution({
          tool_id: toolId,
          server_id: serverId,
          agent_id: agentId,
          parameters,
          error: errorMessage,
          execution_time: executionTime,
          cost: 0,
          status: 'error',
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: false,
        error: errorMessage,
        execution_time: executionTime,
        cost: 0
      };
    }
  }

  // ========================================
  // AGENT INTEGRATION
  // ========================================

  /**
   * Connect MCP tools to agent
   */
  async connectToolsToAgent(
    agentId: string,
    connections: MCPConnection[]
  ): Promise<void> {
    for (const connection of connections) {
      await supabaseService.saveMCPConnection(connection);
      
      // Ensure server is connected
      if (!this.connectedServers.has(connection.server_id)) {
        await this.connectToServer(connection.server_id, undefined, undefined, connection.authentication);
      }
    }
  }

  /**
   * Get available tools for agent
   */
  async getAgentTools(agentId: string): Promise<MCPTool[]> {
    const connections = await supabaseService.getMCPConnections(agentId);
    const tools: MCPTool[] = [];

    for (const connection of connections) {
      if (connection.enabled) {
        const server = this.connectedServers.get(connection.server_id);
        if (server) {
          tools.push(...server.tools);
        }
      }
    }

    return tools;
  }

  /**
   * Convert MCP tools to OpenAI function format
   */
  convertToOpenAIFunctions(tools: MCPTool[]) {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.id,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private mapAppCapabilities(app: any): string[] {
    const capabilities = ['actions'];
    
    if (app.triggers && app.triggers.length > 0) {
      capabilities.push('triggers');
    }
    
    if (app.auth) {
      capabilities.push('authentication');
    }
    
    return capabilities;
  }

  private getMockToolsForApp(appId: string): any[] {
    const mockTools: Record<string, any[]> = {
      gmail: [
        {
          name: 'send_email',
          display_name: 'Send Email',
          description: 'Send an email via Gmail',
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient email address' },
              subject: { type: 'string', description: 'Email subject' },
              body: { type: 'string', description: 'Email body content' }
            },
            required: ['to', 'subject', 'body']
          }
        },
        {
          name: 'read_emails',
          display_name: 'Read Emails',
          description: 'Read recent emails from Gmail',
          parameters: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Number of emails to read' }
            },
            required: []
          }
        }
      ],
      googlecalendar: [
        {
          name: 'create_event',
          display_name: 'Create Calendar Event',
          description: 'Create a new calendar event',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Event title' },
              start_time: { type: 'string', description: 'Start time (ISO format)' },
              end_time: { type: 'string', description: 'End time (ISO format)' },
              description: { type: 'string', description: 'Event description' }
            },
            required: ['title', 'start_time', 'end_time']
          }
        },
        {
          name: 'list_events',
          display_name: 'List Calendar Events',
          description: 'List upcoming calendar events',
          parameters: {
            type: 'object',
            properties: {
              days_ahead: { type: 'number', description: 'Number of days to look ahead' }
            },
            required: []
          }
        }
      ],
      github: [
        {
          name: 'create_issue',
          display_name: 'Create GitHub Issue',
          description: 'Create a new issue in a GitHub repository',
          parameters: {
            type: 'object',
            properties: {
              repo: { type: 'string', description: 'Repository name (owner/repo)' },
              title: { type: 'string', description: 'Issue title' },
              body: { type: 'string', description: 'Issue description' }
            },
            required: ['repo', 'title']
          }
        },
        {
          name: 'list_repos',
          display_name: 'List Repositories',
          description: 'List user repositories',
          parameters: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['all', 'owner', 'member'], description: 'Repository type' }
            },
            required: []
          }
        }
      ],
      slack: [
        {
          name: 'send_message',
          display_name: 'Send Slack Message',
          description: 'Send a message to a Slack channel',
          parameters: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: 'Channel name or ID' },
              message: { type: 'string', description: 'Message content' }
            },
            required: ['channel', 'message']
          }
        }
      ]
    };

    return mockTools[appId] || [];
  }

  private async getPopularMCPServers(): Promise<MCPServer[]> {
    // Popular MCP servers with direct protocol support
    return [
      {
        id: 'filesystem',
        name: 'File System',
        description: 'Access and manipulate files and directories',
        endpoint: 'mcp://filesystem',
        status: 'disconnected',
        capabilities: ['read', 'write', 'list'],
        tools: [
          {
            id: 'read_file',
            name: 'Read File',
            description: 'Read contents of a file',
            server_id: 'filesystem',
            parameters: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path to read' }
              },
              required: ['path']
            },
            capabilities: ['read'],
            usage_cost: 0.0001,
            rate_limits: { requests_per_minute: 100, requests_per_day: 10000 }
          },
          {
            id: 'write_file',
            name: 'Write File',
            description: 'Write contents to a file',
            server_id: 'filesystem',
            parameters: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path to write' },
                content: { type: 'string', description: 'Content to write' }
              },
              required: ['path', 'content']
            },
            capabilities: ['write'],
            usage_cost: 0.0002,
            rate_limits: { requests_per_minute: 50, requests_per_day: 5000 }
          }
        ],
        metadata: {
          version: '1.0.0',
          provider: 'mcp',
          category: 'system',
          last_connected: new Date().toISOString()
        }
      },
      {
        id: 'web_search',
        name: 'Web Search',
        description: 'Search the web and get real-time information',
        endpoint: 'mcp://web-search',
        status: 'disconnected',
        capabilities: ['search', 'browse'],
        tools: [
          {
            id: 'search_web',
            name: 'Search Web',
            description: 'Search the web for information',
            server_id: 'web_search',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                max_results: { type: 'number', description: 'Maximum number of results' }
              },
              required: ['query']
            },
            capabilities: ['read'],
            usage_cost: 0.005,
            rate_limits: { requests_per_minute: 20, requests_per_day: 1000 }
          }
        ],
        metadata: {
          version: '1.0.0',
          provider: 'mcp',
          category: 'information',
          last_connected: new Date().toISOString()
        }
      }
    ];
  }

  private async connectDirectMCPServer(
    serverId: string,
    endpoint?: string,
    transportType?: 'sse' | 'stdio' | 'websocket',
    authentication?: MCPConnection['authentication']
  ): Promise<MCPServer> {
    // Implement direct MCP protocol connection
    // This would use the @modelcontextprotocol/sdk for direct connections
    
    // For now, return a mock implementation
    const server: MCPServer = {
      id: serverId,
      name: serverId.replace('mcp://', ''),
      description: `Direct MCP server: ${serverId}`,
      endpoint: endpoint || serverId,
      status: 'connected',
      capabilities: ['tools'],
      tools: [],
      transport_type: transportType,
      authentication,
      metadata: {
        version: '1.0.0',
        provider: 'mcp',
        category: 'direct',
        last_connected: new Date().toISOString()
      }
    };

    this.connectedServers.set(serverId, server);
    await supabaseService.saveMCPServer(server);
    
    return server;
  }

  private async executeDirectMCPTool(
    serverId: string,
    toolId: string,
    parameters: Record<string, any>
  ): Promise<any> {
    // Implement direct MCP tool execution
    // This would use the actual MCP protocol
    
    // Mock implementation for now
    switch (toolId) {
      case 'read_file':
        return { content: 'Mock file content', size: 1024 };
      case 'write_file':
        return { success: true, bytes_written: parameters.content?.length || 0 };
      case 'search_web':
        return {
          results: [
            {
              title: 'Mock Search Result',
              url: 'https://example.com',
              snippet: 'This is a mock search result for testing purposes'
            }
          ]
        };
      default:
        throw new Error(`Tool ${toolId} not implemented`);
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      connected_servers: this.connectedServers.size,
      available_tools: Array.from(this.connectedServers.values())
        .reduce((sum, server) => sum + server.tools.length, 0)
    };
  }
}

export const composioMCPService = new ComposioMCPService();