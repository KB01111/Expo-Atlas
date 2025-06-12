// OpenAI Agents SDK Types and Interfaces
import type { AssistantTool } from 'openai/resources/beta/assistants';
import type { Run } from 'openai/resources/beta/threads/runs';
import type { Message } from 'openai/resources/beta/threads/messages';

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

export interface OpenAIAgentConfig {
  user_id: string;
  name: string;
  description?: string;
  model?: string;
  instructions: string;
  tools?: OpenAIAgentTool[];
  metadata?: Record<string, any>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
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

export interface AgentTestConversation {
  id: string;
  name: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  metrics: {
    response_time_ms: number;
    tokens_used: number;
    cost: number;
  };
  status: 'running' | 'completed' | 'failed';
  error?: string;
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
  common_failures: Array<{ message: string; count: number }>;
}