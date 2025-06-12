// Enhanced agent types for full OpenAI Agents SDK and team management

export interface AgentTeam {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  members: AgentTeamMember[];
  workflow?: TeamWorkflow;
  status: 'active' | 'inactive' | 'paused';
  owner_id: string;
  metadata?: Record<string, any>;
}

export interface AgentTeamMember {
  id: string;
  agent_id: string;
  role: 'leader' | 'collaborator' | 'specialist' | 'observer';
  capabilities: string[];
  priority: number;
  status: 'active' | 'inactive';
  added_at: string;
}

export interface TeamWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  execution_mode: 'sequential' | 'parallel' | 'conditional';
  status: 'draft' | 'active' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'agent_task' | 'decision' | 'parallel_split' | 'merge' | 'condition' | 'loop';
  agent_id?: string;
  input_mapping?: Record<string, string>;
  output_mapping?: Record<string, string>;
  conditions?: WorkflowCondition[];
  next_steps?: string[];
  parallel_branches?: WorkflowStep[];
  loop_config?: LoopConfig;
  timeout_seconds?: number;
  retry_count?: number;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: string | number | boolean;
  next_step_id: string;
}

export interface LoopConfig {
  max_iterations: number;
  break_condition?: WorkflowCondition;
  loop_variable?: string;
}

export interface TeamExecution {
  id: string;
  team_id: string;
  workflow_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  started_at: string;
  completed_at?: string;
  current_step?: string;
  step_executions: StepExecution[];
  input: any;
  output?: any;
  error_message?: string;
  total_tokens_used: number;
  total_cost: number;
  execution_time_ms: number;
}

export interface StepExecution {
  id: string;
  step_id: string;
  agent_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at: string;
  completed_at?: string;
  input: any;
  output?: any;
  error_message?: string;
  tokens_used: number;
  cost: number;
  execution_time_ms: number;
}

// Enhanced conversation management
export interface PersistentConversation {
  id: string;
  agent_id?: string;
  team_id?: string;
  thread_id: string;
  title?: string;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  message_count: number;
  context: ConversationContext;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  user_preferences?: Record<string, any>;
  conversation_summary?: string;
  key_topics?: string[];
  mentioned_entities?: Entity[];
  conversation_state?: Record<string, any>;
}

export interface Entity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'concept' | 'other';
  context?: string;
  first_mentioned_at: string;
  mention_count: number;
}

// Real-time streaming and events
export interface AgentStreamEvent {
  type: 'message_start' | 'content_delta' | 'message_complete' | 'error' | 'tool_call' | 'tool_result';
  timestamp: string;
  agent_id?: string;
  conversation_id?: string;
  data: any;
}

export interface StreamingResponse {
  id: string;
  conversation_id: string;
  agent_id: string;
  stream: ReadableStream<AgentStreamEvent>;
  status: 'streaming' | 'completed' | 'error';
  started_at: string;
  completed_at?: string;
}

// File and vector store management
export interface AgentFile {
  id: string;
  agent_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
  processed: boolean;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  vector_store_id?: string;
  metadata?: Record<string, any>;
}

export interface VectorStore {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  file_count: number;
  total_size_bytes: number;
  embedding_model: string;
  status: 'ready' | 'processing' | 'error';
  agents: string[]; // Agent IDs that can access this store
}

// Enhanced tool management
export interface CustomTool {
  id: string;
  name: string;
  description: string;
  type: 'function' | 'api' | 'database' | 'file_operation' | 'external_service';
  schema: ToolSchema;
  implementation: ToolImplementation;
  access_level: 'public' | 'team' | 'private';
  created_by: string;
  created_at: string;
  usage_count: number;
  agents: string[]; // Agent IDs that have access
  teams: string[]; // Team IDs that have access
}

export interface ToolSchema {
  parameters: Record<string, any>;
  required_parameters: string[];
  return_type: string;
  examples?: ToolExample[];
}

export interface ToolImplementation {
  code?: string;
  api_endpoint?: string;
  headers?: Record<string, string>;
  authentication?: ToolAuthentication;
  timeout_seconds?: number;
}

export interface ToolAuthentication {
  type: 'api_key' | 'bearer_token' | 'basic_auth' | 'oauth2';
  config: Record<string, string>;
}

export interface ToolExample {
  name: string;
  description: string;
  input: any;
  expected_output: any;
}

// Performance monitoring and analytics
export interface AgentPerformanceMetrics {
  agent_id: string;
  time_period: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_response_time_ms: number;
  total_tokens_used: number;
  total_cost: number;
  average_cost_per_execution: number;
  most_used_tools: string[];
  error_rate: number;
  user_satisfaction_score?: number;
}

export interface TeamPerformanceMetrics {
  team_id: string;
  time_period: string;
  total_workflow_executions: number;
  successful_workflow_executions: number;
  failed_workflow_executions: number;
  average_workflow_completion_time_ms: number;
  total_tokens_used: number;
  total_cost: number;
  most_active_agents: AgentActivity[];
  collaboration_efficiency_score: number;
}

export interface AgentActivity {
  agent_id: string;
  execution_count: number;
  average_response_time_ms: number;
  success_rate: number;
  collaboration_score: number;
}

export interface AgentStatsAccumulator {
  agent_id: string;
  execution_count: number;
  total_time: number;
  successful_count: number;
  collaboration_score: number;
}

// Julep integration types
export interface JulepWorkflow {
  id: string;
  name: string;
  description?: string;
  yaml_definition: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  created_at: string;
  updated_at: string;
  execution_count: number;
  last_execution_at?: string;
  agents: string[]; // Agent IDs associated with this workflow
  variables: JulepVariable[];
}

export interface JulepVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  default_value?: any;
  description?: string;
  required: boolean;
}

export interface JulepExecution {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  input_variables: Record<string, any>;
  output?: any;
  error_message?: string;
  steps: JulepStepExecution[];
  total_tokens_used: number;
  total_cost: number;
}

export interface JulepStepExecution {
  step_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at: string;
  completed_at?: string;
  input: any;
  output?: any;
  error_message?: string;
  agent_id?: string;
}

export interface OpenResponsesConfig {
  base_url: string;
  api_key: string;
  default_model: string;
  available_models: string[];
  timeout_seconds: number;
  max_retries: number;
  enable_streaming: boolean;
  enable_tools: boolean;
  custom_headers?: Record<string, string>;
}

export interface OpenResponsesExecution {
  id: string;
  model: string;
  input: string;
  response: string;
  tokens_used: number;
  cost: number;
  execution_time_ms: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

// UI State management types
export interface AgentUIState {
  selectedAgent?: string;
  selectedTeam?: string;
  selectedConversation?: string;
  viewMode: 'agents' | 'teams' | 'workflows' | 'analytics';
  filterOptions: FilterOptions;
  sortOptions: SortOptions;
  isLoading: boolean;
  error?: string;
}

export interface FilterOptions {
  status?: string[];
  capabilities?: string[];
  models?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}