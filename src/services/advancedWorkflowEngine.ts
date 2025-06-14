import { supabaseService } from './supabase';
import { openAIAgentsService } from './openaiAgentsSimple';
import { mcpProtocolService } from './mcpProtocol';
import { realtimeChatService } from './realtimeChat';
import * as YAML from 'yaml';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  
  // Core workflow structure
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  
  // Configuration
  config: {
    timeout_minutes: number;
    max_retries: number;
    error_handling: 'stop' | 'continue' | 'retry';
    parallel_execution: boolean;
    priority: 'low' | 'medium' | 'high';
  };
  
  // Variables and parameters
  input_schema: JSONSchema;
  output_schema: JSONSchema;
  variables: WorkflowVariable[];
  
  // Triggers and scheduling
  triggers: WorkflowTrigger[];
  schedule?: WorkflowSchedule;
  
  // Metadata
  tags: string[];
  category: string;
  usage_stats: {
    total_executions: number;
    success_rate: number;
    avg_execution_time: number;
    last_execution: string;
  };
}

export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'agent' | 'mcp_tool' | 'condition' | 'loop' | 'parallel' | 'join' | 'delay' | 'webhook' | 'script';
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, any>;
    inputs: WorkflowInput[];
    outputs: WorkflowOutput[];
  };
  
  // Node-specific configurations
  timeout_seconds?: number;
  retry_config?: {
    max_attempts: number;
    backoff_strategy: 'linear' | 'exponential';
    delay_seconds: number;
  };
  
  // Error handling
  on_error?: 'stop' | 'continue' | 'retry' | 'goto';
  error_node_id?: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type: 'default' | 'conditional' | 'error';
  condition?: WorkflowCondition;
  data?: {
    label?: string;
    animation?: boolean;
  };
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: string | number | boolean | object;
  logical_operator?: 'and' | 'or';
  nested_conditions?: WorkflowCondition[];
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  default_value?: string | number | boolean | object | unknown[];
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: (string | number | boolean)[];
  };
}

export interface WorkflowInput {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface WorkflowOutput {
  name: string;
  type: string;
  description: string;
}

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'webhook' | 'schedule' | 'event' | 'agent_completion' | 'mcp_event';
  config: {
    endpoint?: string;
    event_type?: string;
    agent_id?: string;
    mcp_server_id?: string;
    conditions?: WorkflowCondition[];
  };
  enabled: boolean;
}

export interface WorkflowSchedule {
  enabled: boolean;
  cron_expression: string;
  timezone: string;
  start_date?: string;
  end_date?: string;
  max_executions?: number;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  
  // Execution context
  triggered_by: string;
  trigger_type: 'manual' | 'schedule' | 'webhook' | 'event';
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  
  // Timing
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  
  // Step tracking
  current_node_id?: string;
  completed_nodes: string[];
  failed_nodes: string[];
  
  // Execution logs
  logs: WorkflowExecutionLog[];
  steps: WorkflowStepExecution[];
  
  // Metrics
  total_cost: number;
  tokens_used: number;
  api_calls_made: number;
  
  // Error information
  error_message?: string;
  error_stack?: string;
  retry_count: number;
  
  // Metadata
  user_id?: string;
  session_id?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface WorkflowStepExecution {
  id: string;
  node_id: string;
  node_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  
  error_message?: string;
  retry_count: number;
  
  // Node-specific data
  agent_execution_id?: string;
  mcp_execution_id?: string;
  api_response?: Record<string, unknown>;
  
  cost: number;
  tokens_used: number;
}

export interface WorkflowExecutionLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  node_id?: string;
  data?: Record<string, any>;
}

interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

class AdvancedWorkflowEngine {
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private executionQueue: WorkflowExecution[] = [];
  private isProcessingQueue = false;
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  // ========================================
  // WORKFLOW MANAGEMENT
  // ========================================

  /**
   * Create a new workflow definition
   */
  async createWorkflow(workflow: Omit<WorkflowDefinition, 'id' | 'created_at' | 'updated_at' | 'usage_stats'>): Promise<WorkflowDefinition> {
    try {
      const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const fullWorkflow: WorkflowDefinition = {
        ...workflow,
        id: workflowId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_stats: {
          total_executions: 0,
          success_rate: 0,
          avg_execution_time: 0,
          last_execution: ''
        }
      };

      // Validate workflow structure
      await this.validateWorkflow(fullWorkflow);

      // Save to database
      await supabaseService.createWorkflow(fullWorkflow);

      // Set up triggers and schedules
      await this.setupWorkflowTriggers(fullWorkflow);

      return fullWorkflow;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Update existing workflow
   */
  async updateWorkflow(workflowId: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    try {
      const existing = await supabaseService.getWorkflow(workflowId);
      if (!existing) {
        throw new Error('Workflow not found');
      }

      const updated: WorkflowDefinition = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Validate updated workflow
      await this.validateWorkflow(updated);

      // Save to database
      await supabaseService.updateWorkflow(workflowId, updated);

      // Update triggers and schedules
      await this.setupWorkflowTriggers(updated);

      return updated;
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  }

  /**
   * Validate workflow structure and dependencies
   */
  private async validateWorkflow(workflow: WorkflowDefinition): Promise<void> {
    const errors: string[] = [];

    // Check for start and end nodes
    const hasStart = workflow.nodes.some(node => node.type === 'start');
    const hasEnd = workflow.nodes.some(node => node.type === 'end');
    
    if (!hasStart) errors.push('Workflow must have at least one start node');
    if (!hasEnd) errors.push('Workflow must have at least one end node');

    // Validate node connections
    for (const node of workflow.nodes) {
      if (node.type !== 'end') {
        const hasOutgoingEdge = workflow.edges.some(edge => edge.source === node.id);
        if (!hasOutgoingEdge) {
          errors.push(`Node ${node.id} has no outgoing connections`);
        }
      }
      
      if (node.type !== 'start') {
        const hasIncomingEdge = workflow.edges.some(edge => edge.target === node.id);
        if (!hasIncomingEdge) {
          errors.push(`Node ${node.id} has no incoming connections`);
        }
      }
    }

    // Validate agent nodes
    for (const node of workflow.nodes.filter(n => n.type === 'agent')) {
      const agentId = node.data.config.agent_id;
      if (agentId) {
        const agent = await supabaseService.getOpenAIAgent(agentId);
        if (!agent) {
          errors.push(`Agent ${agentId} not found for node ${node.id}`);
        }
      }
    }

    // Validate MCP tool nodes
    for (const node of workflow.nodes.filter(n => n.type === 'mcp_tool')) {
      const serverId = node.data.config.server_id;
      const toolId = node.data.config.tool_id;
      
      if (serverId && toolId) {
        const serverStatus = mcpProtocolService.getServerStatus(serverId);
        if (serverStatus !== 'connected') {
          errors.push(`MCP server ${serverId} not connected for node ${node.id}`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Workflow validation failed:\n${errors.join('\n')}`);
    }
  }

  // ========================================
  // WORKFLOW EXECUTION
  // ========================================

  /**
   * Execute workflow with full monitoring and error handling
   */
  async executeWorkflow(
    workflowId: string,
    inputData: Record<string, any> = {},
    context: {
      user_id?: string;
      session_id?: string;
      triggered_by: string;
      trigger_type: 'manual' | 'schedule' | 'webhook' | 'event';
      priority?: 'low' | 'medium' | 'high';
    }
  ): Promise<WorkflowExecution> {
    try {
      const workflow = await supabaseService.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      if (workflow.status !== 'active') {
        throw new Error('Workflow is not active');
      }

      // Create execution record
      const execution: WorkflowExecution = {
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflow_id: workflowId,
        status: 'pending',
        triggered_by: context.triggered_by,
        trigger_type: context.trigger_type,
        input_data: inputData,
        started_at: new Date().toISOString(),
        completed_nodes: [],
        failed_nodes: [],
        logs: [],
        steps: [],
        total_cost: 0,
        tokens_used: 0,
        api_calls_made: 0,
        retry_count: 0,
        user_id: context.user_id,
        session_id: context.session_id,
        priority: context.priority || 'medium'
      };

      // Save initial execution state
      await supabaseService.saveWorkflowExecution(execution);

      // Add to active executions
      this.activeExecutions.set(execution.id, execution);

      // Add to execution queue
      this.executionQueue.push(execution);

      // Start processing if not already running
      if (!this.isProcessingQueue) {
        this.processExecutionQueue();
      }

      this.logExecution(execution, 'info', 'Workflow execution started');

      return execution;
    } catch (error) {
      console.error('Error starting workflow execution:', error);
      throw error;
    }
  }

  /**
   * Process execution queue with priority handling
   */
  private async processExecutionQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;

    try {
      while (this.executionQueue.length > 0) {
        // Sort by priority
        this.executionQueue.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        const execution = this.executionQueue.shift()!;
        await this.executeWorkflowSteps(execution);
      }
    } catch (error) {
      console.error('Error processing execution queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Execute workflow steps with advanced flow control
   */
  private async executeWorkflowSteps(execution: WorkflowExecution): Promise<void> {
    try {
      const workflow = await supabaseService.getWorkflow(execution.workflow_id);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      execution.status = 'running';
      await this.updateExecution(execution);

      // Find start nodes
      const startNodes = workflow.nodes.filter((node: WorkflowNode) => node.type === 'start');
      if (startNodes.length === 0) {
        throw new Error('No start node found');
      }

      // Execute from start nodes
      const context = {
        variables: { ...execution.input_data },
        workflow,
        execution
      };

      for (const startNode of startNodes) {
        await this.executeNode(startNode, context);
      }

      // Mark execution as completed if no errors
      if (execution.status === 'running') {
        execution.status = 'completed';
        execution.completed_at = new Date().toISOString();
        execution.duration_ms = new Date().getTime() - new Date(execution.started_at).getTime();
        
        this.logExecution(execution, 'info', 'Workflow execution completed successfully');
      }

      await this.updateExecution(execution);
      this.activeExecutions.delete(execution.id);

      // Update workflow usage stats
      await this.updateWorkflowStats(execution.workflow_id, execution);

    } catch (error) {
      execution.status = 'failed';
      execution.error_message = error instanceof Error ? error.message : 'Unknown error';
      execution.completed_at = new Date().toISOString();
      execution.duration_ms = new Date().getTime() - new Date(execution.started_at).getTime();

      this.logExecution(execution, 'error', `Workflow execution failed: ${execution.error_message}`);
      
      await this.updateExecution(execution);
      this.activeExecutions.delete(execution.id);

      console.error('Workflow execution failed:', error);
    }
  }

  /**
   * Execute individual workflow node
   */
  private async executeNode(
    node: WorkflowNode,
    context: {
      variables: Record<string, any>;
      workflow: WorkflowDefinition;
      execution: WorkflowExecution;
    }
  ): Promise<any> {
    const stepExecution: WorkflowStepExecution = {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      node_id: node.id,
      node_type: node.type,
      status: 'running',
      started_at: new Date().toISOString(),
      input_data: { ...context.variables },
      retry_count: 0,
      cost: 0,
      tokens_used: 0
    };

    context.execution.steps.push(stepExecution);
    context.execution.current_node_id = node.id;

    this.logExecution(context.execution, 'info', `Executing node: ${node.data.label}`, node.id);

    try {
      let result: unknown;

      switch (node.type) {
        case 'start':
          result = await this.executeStartNode(node, context);
          break;
        case 'agent':
          result = await this.executeAgentNode(node, context, stepExecution);
          break;
        case 'mcp_tool':
          result = await this.executeMCPToolNode(node, context, stepExecution);
          break;
        case 'condition':
          result = await this.executeConditionNode(node, context);
          break;
        case 'loop':
          result = await this.executeLoopNode(node, context);
          break;
        case 'parallel':
          result = await this.executeParallelNode(node, context);
          break;
        case 'delay':
          result = await this.executeDelayNode(node, context);
          break;
        case 'webhook':
          result = await this.executeWebhookNode(node, context, stepExecution);
          break;
        case 'script':
          result = await this.executeScriptNode(node, context);
          break;
        case 'end':
          result = await this.executeEndNode(node, context);
          break;
        default:
          throw new Error(`Unsupported node type: ${node.type}`);
      }

      stepExecution.status = 'completed';
      stepExecution.completed_at = new Date().toISOString();
      stepExecution.duration_ms = new Date().getTime() - new Date(stepExecution.started_at).getTime();
      stepExecution.output_data = result as Record<string, any> | undefined;

      context.execution.completed_nodes.push(node.id);

      // Update execution variables with result
      if (result && typeof result === 'object') {
        context.variables = { ...context.variables, ...result };
      }

      // Execute next nodes
      if (node.type !== 'end') {
        await this.executeNextNodes(node, context, result);
      }

      return result;
    } catch (error) {
      stepExecution.status = 'failed';
      stepExecution.error_message = error instanceof Error ? error.message : 'Unknown error';
      stepExecution.completed_at = new Date().toISOString();
      stepExecution.duration_ms = new Date().getTime() - new Date(stepExecution.started_at).getTime();

      context.execution.failed_nodes.push(node.id);

      this.logExecution(context.execution, 'error', `Node execution failed: ${stepExecution.error_message}`, node.id);

      // Handle errors based on node configuration
      if (node.on_error === 'continue') {
        this.logExecution(context.execution, 'warn', 'Continuing execution despite error', node.id);
        await this.executeNextNodes(node, context, null);
      } else if (node.on_error === 'retry' && stepExecution.retry_count < (node.retry_config?.max_attempts || 3)) {
        stepExecution.retry_count++;
        this.logExecution(context.execution, 'info', `Retrying node execution (attempt ${stepExecution.retry_count})`, node.id);
        
        // Apply backoff delay
        if (node.retry_config?.delay_seconds) {
          await this.delay(node.retry_config.delay_seconds * 1000);
        }
        
        return this.executeNode(node, context);
      } else {
        throw error;
      }
    }
  }

  // ========================================
  // NODE EXECUTORS
  // ========================================

  private async executeStartNode(
    node: WorkflowNode,
    context: { variables: Record<string, any>; workflow: WorkflowDefinition; execution: WorkflowExecution }
  ): Promise<any> {
    return context.variables;
  }

  private async executeAgentNode(
    node: WorkflowNode,
    context: { variables: Record<string, any>; workflow: WorkflowDefinition; execution: WorkflowExecution },
    stepExecution: WorkflowStepExecution
  ): Promise<any> {
    const agentId = node.data.config.agent_id;
    const prompt = this.interpolateVariables(node.data.config.prompt || '', context.variables);
    const model = node.data.config.model;

    if (!agentId) {
      throw new Error('Agent ID not specified');
    }

    const result = await openAIAgentsService.executeAgent(agentId, prompt, {
      model,
      stream: false,
      conversationHistory: context.execution.session_id ? 
        await this.getChatHistory(context.execution.session_id) : []
    });

    stepExecution.agent_execution_id = result.id;
    stepExecution.cost += result.cost || 0;
    stepExecution.tokens_used += result.tokensUsed || 0;

    context.execution.total_cost += stepExecution.cost;
    context.execution.tokens_used += stepExecution.tokens_used;
    context.execution.api_calls_made++;

    return {
      agent_response: (result as any).content || (result as any).response || 'Agent execution completed',
      agent_execution_id: result.id,
      tokens_used: result.tokensUsed,
      cost: result.cost
    };
  }

  private async executeMCPToolNode(
    node: WorkflowNode,
    context: { variables: Record<string, any>; workflow: WorkflowDefinition; execution: WorkflowExecution },
    stepExecution: WorkflowStepExecution
  ): Promise<any> {
    const serverId = node.data.config.server_id;
    const toolId = node.data.config.tool_id;
    const parameters = this.interpolateObjectVariables(node.data.config.parameters || {}, context.variables);

    if (!serverId || !toolId) {
      throw new Error('MCP server ID and tool ID must be specified');
    }

    const result = await mcpProtocolService.executeTool(toolId, serverId, parameters);

    stepExecution.mcp_execution_id = result.id;
    stepExecution.cost += result.cost;

    context.execution.total_cost += stepExecution.cost;
    context.execution.api_calls_made++;

    return {
      tool_result: result.output_data,
      mcp_execution_id: result.id,
      cost: result.cost
    };
  }

  private async executeConditionNode(
    node: WorkflowNode,
    context: { variables: Record<string, any>; workflow: WorkflowDefinition; execution: WorkflowExecution }
  ): Promise<any> {
    const condition = node.data.config.condition;
    const result = this.evaluateCondition(condition, context.variables);
    
    return {
      condition_result: result,
      condition_met: result
    };
  }

  private async executeLoopNode(
    node: WorkflowNode,
    context: { variables: Record<string, any>; workflow: WorkflowDefinition; execution: WorkflowExecution }
  ): Promise<any> {
    const maxIterations = node.data.config.max_iterations || 10;
    const breakCondition = node.data.config.break_condition;
    const results: unknown[] = [];

    for (let i = 0; i < maxIterations; i++) {
      const loopContext = {
        ...context,
        variables: { ...context.variables, loop_index: i, loop_iteration: i + 1 }
      };

      // Execute loop body nodes
      const loopBodyNodeIds = node.data.config.loop_body_nodes || [];
      for (const nodeId of loopBodyNodeIds) {
        const bodyNode = context.workflow.nodes.find(n => n.id === nodeId);
        if (bodyNode) {
          const result = await this.executeNode(bodyNode, loopContext);
          results.push(result);
        }
      }

      // Check break condition
      if (breakCondition && this.evaluateCondition(breakCondition, loopContext.variables)) {
        break;
      }
    }

    return {
      loop_results: results,
      iterations_completed: results.length
    };
  }

  private async executeParallelNode(
    node: WorkflowNode,
    context: { variables: Record<string, any>; workflow: WorkflowDefinition; execution: WorkflowExecution }
  ): Promise<any> {
    const parallelNodeIds = node.data.config.parallel_nodes || [];
    const promises: Promise<any>[] = [];

    for (const nodeId of parallelNodeIds) {
      const parallelNode = context.workflow.nodes.find(n => n.id === nodeId);
      if (parallelNode) {
        const parallelContext = {
          ...context,
          variables: { ...context.variables }
        };
        promises.push(this.executeNode(parallelNode, parallelContext));
      }
    }

    const results = await Promise.allSettled(promises);
    const successfulResults = results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);

    const failedResults = results
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason);

    return {
      parallel_results: successfulResults,
      failed_count: failedResults.length,
      success_count: successfulResults.length
    };
  }

  private async executeDelayNode(
    node: WorkflowNode,
    context: { variables: Record<string, any>; workflow: WorkflowDefinition; execution: WorkflowExecution }
  ): Promise<any> {
    const delaySeconds = node.data.config.delay_seconds || 1;
    await this.delay(delaySeconds * 1000);
    
    return {
      delayed_seconds: delaySeconds
    };
  }

  private async executeWebhookNode(
    node: WorkflowNode,
    context: { variables: Record<string, any>; workflow: WorkflowDefinition; execution: WorkflowExecution },
    stepExecution: WorkflowStepExecution
  ): Promise<any> {
    const url = this.interpolateVariables(node.data.config.url || '', context.variables);
    const method = node.data.config.method || 'POST';
    const headers = this.interpolateObjectVariables(node.data.config.headers || {}, context.variables);
    const body = this.interpolateObjectVariables(node.data.config.body || {}, context.variables);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: method !== 'GET' ? JSON.stringify(body) : undefined
    });

    const responseData = await response.json().catch(() => ({}));

    stepExecution.api_response = {
      status: response.status,
      headers: response.headers ? Object.fromEntries(response.headers as any) : {},
      data: responseData
    };

    context.execution.api_calls_made++;

    return {
      webhook_response: responseData,
      status_code: response.status,
      success: response.ok
    };
  }

  private async executeScriptNode(
    node: WorkflowNode,
    context: { variables: Record<string, any>; workflow: WorkflowDefinition; execution: WorkflowExecution }
  ): Promise<any> {
    const script = node.data.config.script || '';
    const language = node.data.config.language || 'javascript';

    if (language === 'javascript') {
      // Create a safe execution context
      const safeFunction = new Function('variables', 'context', `
        const { ${Object.keys(context.variables).join(', ')} } = variables;
        ${script}
      `);

      const result = safeFunction(context.variables, {
        log: (message: string) => this.logExecution(context.execution, 'info', `Script: ${message}`, node.id)
      });

      return {
        script_result: result
      };
    } else {
      throw new Error(`Unsupported script language: ${language}`);
    }
  }

  private async executeEndNode(
    node: WorkflowNode,
    context: { variables: Record<string, any>; workflow: WorkflowDefinition; execution: WorkflowExecution }
  ): Promise<any> {
    const outputData = node.data.config.output_mapping ? 
      this.mapOutputData(node.data.config.output_mapping, context.variables) : 
      context.variables;

    context.execution.output_data = outputData;

    return outputData;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private async executeNextNodes(
    currentNode: WorkflowNode,
    context: { variables: Record<string, any>; workflow: WorkflowDefinition; execution: WorkflowExecution },
    result: unknown
  ): Promise<void> {
    const outgoingEdges = context.workflow.edges.filter(edge => edge.source === currentNode.id);

    for (const edge of outgoingEdges) {
      let shouldExecute = true;

      // Check conditional edges
      if (edge.condition) {
        shouldExecute = this.evaluateCondition(edge.condition, { ...context.variables, ...(result && typeof result === 'object' ? result as Record<string, unknown> : { result }) });
      }

      if (shouldExecute) {
        const nextNode = context.workflow.nodes.find(node => node.id === edge.target);
        if (nextNode) {
          await this.executeNode(nextNode, context);
        }
      }
    }
  }

  private evaluateCondition(condition: WorkflowCondition, variables: Record<string, any>): boolean {
    const value = variables[condition.field];
    
    let result = false;

    switch (condition.operator) {
      case 'equals':
        result = value === condition.value;
        break;
      case 'not_equals':
        result = value !== condition.value;
        break;
      case 'contains':
        result = String(value).includes(String(condition.value));
        break;
      case 'not_contains':
        result = !String(value).includes(String(condition.value));
        break;
      case 'greater_than':
        result = Number(value) > Number(condition.value);
        break;
      case 'less_than':
        result = Number(value) < Number(condition.value);
        break;
      case 'exists':
        result = value !== undefined && value !== null;
        break;
      case 'not_exists':
        result = value === undefined || value === null;
        break;
    }

    // Handle nested conditions
    if (condition.nested_conditions && condition.nested_conditions.length > 0) {
      const nestedResults = condition.nested_conditions.map(nested => 
        this.evaluateCondition(nested, variables)
      );

      if (condition.logical_operator === 'and') {
        result = result && nestedResults.every(r => r);
      } else if (condition.logical_operator === 'or') {
        result = result || nestedResults.some(r => r);
      }
    }

    return result;
  }

  private interpolateVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+(\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(variables, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private interpolateObjectVariables(obj: Record<string, any>, variables: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.interpolateVariables(value, variables);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateObjectVariables(value, variables);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: any, key) => current?.[key], obj);
  }

  private mapOutputData(mapping: Record<string, string>, variables: Record<string, any>): Record<string, any> {
    const output: Record<string, any> = {};
    
    for (const [outputKey, variablePath] of Object.entries(mapping)) {
      output[outputKey] = this.getNestedValue(variables, variablePath);
    }

    return output;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logExecution(
    execution: WorkflowExecution,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    nodeId?: string
  ): void {
    const log: WorkflowExecutionLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      node_id: nodeId
    };

    execution.logs.push(log);
    console.log(`[${level.toUpperCase()}] ${message}`, nodeId ? `(Node: ${nodeId})` : '');
  }

  private async updateExecution(execution: WorkflowExecution): Promise<void> {
    await supabaseService.updateWorkflowExecution(execution.id, execution);
  }

  private async getChatHistory(sessionId: string): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    try {
      const messages = await supabaseService.getChatMessages(sessionId);
      return messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  private async updateWorkflowStats(workflowId: string, execution: WorkflowExecution): Promise<void> {
    try {
      const workflow = await supabaseService.getWorkflow(workflowId);
      if (!workflow) return;

      const totalExecutions = workflow.usage_stats.total_executions + 1;
      const wasSuccessful = execution.status === 'completed';
      const currentSuccessCount = Math.round(workflow.usage_stats.success_rate * workflow.usage_stats.total_executions / 100);
      const newSuccessCount = wasSuccessful ? currentSuccessCount + 1 : currentSuccessCount;
      const successRate = (newSuccessCount / totalExecutions) * 100;

      const currentTotalTime = workflow.usage_stats.avg_execution_time * workflow.usage_stats.total_executions;
      const newTotalTime = currentTotalTime + (execution.duration_ms || 0);
      const avgExecutionTime = newTotalTime / totalExecutions;

      const updatedStats = {
        total_executions: totalExecutions,
        success_rate: successRate,
        avg_execution_time: avgExecutionTime,
        last_execution: execution.completed_at || execution.started_at
      };

      await supabaseService.updateWorkflowStats(workflowId, updatedStats);
    } catch (error) {
      console.error('Error updating workflow stats:', error);
    }
  }

  // ========================================
  // TRIGGER AND SCHEDULE MANAGEMENT
  // ========================================

  private async setupWorkflowTriggers(workflow: WorkflowDefinition): Promise<void> {
    // Clear existing scheduled jobs
    const existingJob = this.scheduledJobs.get(workflow.id);
    if (existingJob) {
      clearTimeout(existingJob);
      this.scheduledJobs.delete(workflow.id);
    }

    // Set up schedule if enabled
    if (workflow.schedule && workflow.schedule.enabled) {
      await this.setupSchedule(workflow);
    }

    // Set up other triggers would go here
    // (webhooks, events, etc.)
  }

  private async setupSchedule(workflow: WorkflowDefinition): Promise<void> {
    if (!workflow.schedule || !workflow.schedule.enabled) return;

    // Simple interval-based scheduling (in production, use a proper cron library)
    const scheduleNextExecution = () => {
      const timeout = setTimeout(async () => {
        try {
          await this.executeWorkflow(workflow.id, {}, {
            triggered_by: 'scheduler',
            trigger_type: 'schedule',
            priority: 'medium'
          });
        } catch (error) {
          console.error('Scheduled execution failed:', error);
        } finally {
          scheduleNextExecution(); // Schedule next execution
        }
      }, 60000); // 1 minute interval for demo

      this.scheduledJobs.set(workflow.id, timeout);
    };

    scheduleNextExecution();
  }

  // ========================================
  // PUBLIC API METHODS
  // ========================================

  /**
   * Get workflow execution status
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecution | null> {
    return this.activeExecutions.get(executionId) || 
           await supabaseService.getWorkflowExecution(executionId);
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = 'cancelled';
      execution.completed_at = new Date().toISOString();
      execution.duration_ms = new Date().getTime() - new Date(execution.started_at).getTime();
      
      await this.updateExecution(execution);
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Get workflow execution logs
   */
  async getExecutionLogs(executionId: string): Promise<WorkflowExecutionLog[]> {
    const execution = await this.getExecutionStatus(executionId);
    return execution?.logs || [];
  }

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(workflowId: string, days: number = 30): Promise<any> {
    return supabaseService.getWorkflowAnalytics(workflowId);
  }

  /**
   * Export workflow as YAML
   */
  exportWorkflowAsYAML(workflow: WorkflowDefinition): string {
    return YAML.stringify(workflow);
  }

  /**
   * Import workflow from YAML
   */
  importWorkflowFromYAML(yamlContent: string): WorkflowDefinition {
    return YAML.parse(yamlContent);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Clear all scheduled jobs
    this.scheduledJobs.forEach(timeout => clearTimeout(timeout));
    this.scheduledJobs.clear();

    // Clear active executions
    this.activeExecutions.clear();

    // Clear execution queue
    this.executionQueue.length = 0;
  }
}

export const advancedWorkflowEngine = new AdvancedWorkflowEngine();