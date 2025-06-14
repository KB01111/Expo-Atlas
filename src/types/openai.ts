// OpenAI Agents SDK Types and Interfaces
import type { 
  AssistantTool, 
  Assistant,
  AssistantCreateParams,
  AssistantUpdateParams 
} from 'openai/resources/beta/assistants';
import type { 
  Run, 
  RunCreateParams,
  RunStatus 
} from 'openai/resources/beta/threads/runs';
import type { 
  Message, 
  MessageCreateParams,
  MessageContent
} from 'openai/resources/beta/threads/messages';
import type { 
  Thread, 
  ThreadCreateParams 
} from 'openai/resources/beta/threads';
import type { 
  FileObject,
  FileCreateParams 
} from 'openai/resources/files';

// Custom function definition interface
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface OpenAIAgentTool {
  type: 'function' | 'code_interpreter' | 'file_search';
  function?: FunctionDefinition;
}

// Enhanced Agent Configuration with Full SDK Support
export interface OpenAIAgentConfig {
  // Basic Configuration
  name: string;
  description?: string;
  user_id?: string;
  model?: string;
  instructions: string;
  
  // Tools Configuration
  tools?: OpenAIAgentTool[];
  tool_resources?: {
    code_interpreter?: {
      file_ids?: string[];
    };
    file_search?: {
      vector_store_ids?: string[];
      vector_stores?: Array<{
        file_ids?: string[];
        chunking_strategy?: {
          type: 'auto' | 'static';
          static?: {
            max_chunk_size_tokens: number;
            chunk_overlap_tokens: number;
          };
        };
        metadata?: Record<string, string>;
      }>;
    };
  };
  
  // Model Parameters
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  response_format?: 'auto' | { type: 'text' | 'json_object' | 'json_schema'; json_schema?: any };
  
  // Metadata and Custom Properties
  metadata?: Record<string, any>;
  
  // Advanced Configuration
  parallel_tool_calls?: boolean;
  timeout?: number;
  max_completion_tokens?: number;
  max_prompt_tokens?: number;
}

export interface OpenAIAgent {
  id: string;
  name: string;
  description?: string;
  model: string;
  instructions: string;
  tools: OpenAIAgentTool[];
  metadata: Record<string, any>;
  status: 'active' | 'inactive' | 'error';
  created_at: string;
  updated_at: string;
  provider: 'openai-agents';
  executions: number;
  successRate: number;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  // OpenAI specific fields
  openai_assistant_id?: string;
}

export interface OpenAIAgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tool_calls?: OpenAIToolCall[];
  metadata?: Record<string, any>;
  // OpenAI specific fields
  thread_id?: string;
  assistant_id?: string;
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIAgentExecution {
  id: string;
  agentId: string;
  input: string;
  output: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime: string | null;
  tokensUsed: number;
  cost: number;
  messages: OpenAIAgentMessage[];
  metadata: Record<string, any>;
  error?: string;
  duration?: number;
  // OpenAI specific fields
  thread_id?: string;
  run_id?: string;
  run_status?: Run['status'];
}

export interface OpenAIStreamingEvent {
  type: 'message' | 'tool_call' | 'completion' | 'error';
  data: any;
  timestamp: string;
}

export interface OpenAIAgentRunOptions {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  stream?: boolean;
  tools?: OpenAIAgentTool[];
  metadata?: Record<string, any>;
  temperature?: number;
  max_tokens?: number;
  // OpenAI specific options
  assistant_id?: string;
  thread_id?: string;
  instructions?: string;
}

export interface OpenAIAgentStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageTokensUsed: number;
  totalCost: number;
  averageResponseTime: number;
  lastExecuted: string | null;
}

export interface OpenAIAgentPerformance {
  agentId: string;
  date: string;
  executions: number;
  successRate: number;
  averageTokens: number;
  totalCost: number;
  averageResponseTime: number;
}

// File and Vector Store Management
export interface OpenAIFile {
  id: string;
  object: 'file';
  bytes: number;
  created_at: number;
  filename: string;
  purpose: 'assistants' | 'vision' | 'batch' | 'fine-tune';
  status: 'uploaded' | 'processed' | 'error';
  status_details?: string;
  // Custom fields for our app
  agent_id?: string;
  description?: string;
  file_type?: 'document' | 'image' | 'code' | 'data';
  upload_progress?: number;
}

export interface OpenAIVectorStore {
  id: string;
  object: 'vector_store';
  created_at: number;
  name: string;
  usage_bytes: number;
  file_counts: {
    in_progress: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  };
  status: 'expired' | 'in_progress' | 'completed';
  expires_after?: {
    anchor: 'last_active_at';
    days: number;
  };
  expires_at?: number;
  last_active_at: number;
  metadata: Record<string, string>;
  // Custom fields for our app
  agent_id?: string;
  description?: string;
}

export interface OpenAIAgentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'assistant' | 'analyst' | 'writer' | 'coder' | 'researcher' | 'other';
  instructions: string;
  tools: OpenAIAgentTool[];
  model: string;
  tags: string[];
  isPublic: boolean;
  created_by: string;
  created_at: string;
  usage_count: number;
  
  // Enhanced template features
  tool_resources?: OpenAIAgentConfig['tool_resources'];
  response_format?: OpenAIAgentConfig['response_format'];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimated_setup_time?: number; // in minutes
  featured?: boolean;
  rating?: number;
  reviews_count?: number;
}

export interface OpenAIAgentConversation {
  id: string;
  agentId: string;
  title: string;
  messages: OpenAIAgentMessage[];
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived' | 'deleted';
  metadata: Record<string, any>;
}

export interface OpenAIAgentWorkflow {
  id: string;
  name: string;
  description: string;
  agents: Array<{
    agentId: string;
    order: number;
    conditions?: Record<string, any>;
  }>;
  triggers: Array<{
    type: 'manual' | 'scheduled' | 'webhook' | 'event';
    config: Record<string, any>;
  }>;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive';
}

export interface OpenAIAPIConfig {
  apiKey: string;
  organization?: string;
  project?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  dangerouslyAllowBrowser?: boolean; // Required for React Native/Expo
}

export interface OpenAIAgentError {
  code: string;
  message: string;
  type: 'api_error' | 'rate_limit' | 'invalid_request' | 'authentication' | 'permission' | 'server_error';
  details?: Record<string, any>;
}

export interface OpenAIAgentUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  model: string;
  timestamp: string;
}

export interface OpenAIAgentCapability {
  name: string;
  description: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface OpenAIAgentContext {
  sessionId?: string;
  userId?: string;
  conversationHistory?: OpenAIAgentMessage[];
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Event types for real-time communication
export type OpenAIAgentEventType = 
  | 'agent.created'
  | 'agent.updated'
  | 'agent.deleted'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.cancelled'
  | 'message.received'
  | 'tool.called'
  | 'error.occurred';

export interface OpenAIAgentEvent {
  type: OpenAIAgentEventType;
  agentId: string;
  executionId?: string;
  data: any;
  timestamp: string;
}

// Agent Builder Types
export interface OpenAIAgentBuilderConfig {
  id?: string;
  step: 'basic' | 'instructions' | 'tools' | 'files' | 'advanced' | 'test' | 'deploy';
  basic: {
    name: string;
    description: string;
    model: string;
    category: 'assistant' | 'analyst' | 'writer' | 'coder' | 'researcher' | 'custom';
    avatar?: string;
    tags: string[];
  };
  instructions: {
    system_prompt: string;
    personality: string;
    goals: string[];
    constraints: string[];
    examples: Array<{
      input: string;
      output: string;
      explanation: string;
    }>;
  };
  tools: {
    code_interpreter: boolean;
    file_search: boolean;
    functions: CustomFunction[];
  };
  files: {
    knowledge_files: AgentFile[];
    code_files: AgentFile[];
    vector_store_ids: string[];
  };
  advanced: {
    temperature: number;
    top_p: number;
    max_tokens: number;
    response_format?: 'text' | 'json_object';
    timeout_seconds: number;
    max_retries: number;
    fallback_behavior: 'error' | 'default_response' | 'escalate';
  };
  metadata: {
    created_by: string;
    team_id?: string;
    project_id?: string;
    environment: 'development' | 'staging' | 'production';
    version: string;
    changelog: string[];
  };
}

export interface CustomFunction {
  id: string;
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      required?: boolean;
    }>;
    required: string[];
  };
  implementation: {
    type: 'api_call' | 'javascript' | 'python' | 'external';
    code?: string;
    endpoint?: string;
    headers?: Record<string, string>;
  };
  test_cases: Array<{
    name: string;
    input: Record<string, any>;
    expected_output: any;
    description: string;
  }>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentFile {
  id: string;
  name: string;
  type: 'knowledge' | 'code' | 'image' | 'document';
  size_bytes: number;
  mime_type: string;
  content?: string;
  url?: string;
  openai_file_id?: string;
  vector_store_id?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  metadata: {
    upload_source: 'local' | 'url' | 'github' | 'google_drive';
    description?: string;
    tags: string[];
    auto_update: boolean;
    last_modified: string;
  };
}

export interface AgentBuilderState {
  config: OpenAIAgentBuilderConfig;
  validation: {
    step_errors: Record<string, string[]>;
    warnings: string[];
    is_valid: boolean;
  };
  preview: {
    agent_id?: string;
    test_conversations: AgentTestConversation[];
    performance_metrics?: AgentTestMetrics;
  };
  deployment: {
    status: 'draft' | 'deploying' | 'deployed' | 'failed';
    deployed_at?: string;
    deployment_id?: string;
    endpoints?: {
      api_url: string;
      webhook_url?: string;
      embed_url?: string;
    };
  };
}

export interface AgentTestConversation {
  id: string;
  name: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
  metrics: {
    response_time_ms: number;
    tokens_used: number;
    cost: number;
    satisfaction_score?: number;
  };
  status: 'running' | 'completed' | 'failed';
  created_at: string;
}

export interface AgentTestMetrics {
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  average_response_time: number;
  average_cost_per_interaction: number;
  total_tokens_used: number;
  success_rate: number;
  common_failures: Array<{
    type: string;
    count: number;
    examples: string[];
  }>;
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  config: Partial<OpenAIAgentBuilderConfig>;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_setup_time: number;
  popularity_score: number;
  created_by: {
    id: string;
    name: string;
    avatar?: string;
  };
  created_at: string;
  updated_at: string;
  usage_count: number;
  rating: {
    average: number;
    total_ratings: number;
  };
}

export interface AgentDeployment {
  id: string;
  agent_id: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  status: 'active' | 'inactive' | 'deprecated';
  endpoints: {
    api_url: string;
    webhook_url?: string;
    embed_url?: string;
  };
  configuration: {
    rate_limits: {
      requests_per_minute: number;
      tokens_per_day: number;
    };
    allowed_origins: string[];
    authentication_required: boolean;
    logging_enabled: boolean;
  };
  metrics: {
    total_requests: number;
    success_rate: number;
    average_response_time: number;
    last_request_at?: string;
  };
  deployed_at: string;
  deployed_by: string;
}

// ========================================
// MCP INTEGRATION TYPES
// ========================================

export interface MCPAuthentication {
  type: 'none' | 'api_key' | 'oauth' | 'bearer';
  credentials?: Record<string, string>;
}

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  capabilities: string[];
  tools: MCPTool[];
  transport_type?: 'sse' | 'stdio' | 'websocket';
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

export interface MCPConnection {
  id?: string;
  server_id: string;
  agent_id: string;
  enabled: boolean;
  configuration: Record<string, any>;
  authentication: MCPAuthentication;
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

export interface MCPToolExecution {
  tool_id: string;
  server_id: string;
  agent_id: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  execution_time: number;
  cost: number;
  status: 'success' | 'error';
  timestamp: string;
}