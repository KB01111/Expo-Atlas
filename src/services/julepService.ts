import { 
  JulepWorkflow, 
  JulepExecution, 
  JulepVariable,
  OpenResponsesConfig,
  OpenResponsesExecution 
} from '../types/agents';
import { supabaseService } from './supabase';

/**
 * Julep Service for workflow management and Open Responses API integration
 * Provides self-hosted alternative to OpenAI with multi-provider support
 */
class JulepService {
  private openResponsesConfig: OpenResponsesConfig;
  private isConfigured: boolean = false;

  constructor() {
    this.openResponsesConfig = {
      base_url: process.env.EXPO_PUBLIC_JULEP_BASE_URL || 'http://localhost:8080',
      api_key: process.env.EXPO_PUBLIC_JULEP_API_KEY || 'local-key',
      default_model: process.env.EXPO_PUBLIC_JULEP_DEFAULT_MODEL || 'gpt-4o-mini',
      available_models: [],
      timeout_seconds: 30,
      max_retries: 3,
      enable_streaming: true,
      enable_tools: true
    };

    this.initialize();
  }

  /**
   * Initialize Julep service and check configuration
   */
  private async initialize(): Promise<void> {
    try {
      await this.checkConnection();
      await this.loadAvailableModels();
      this.isConfigured = true;
    } catch (error) {
      console.warn('Julep service not configured or unavailable:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check connection to Open Responses API
   */
  private async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.openResponsesConfig.base_url}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.openResponsesConfig.api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to connect to Open Responses API:', error);
      return false;
    }
  }

  /**
   * Load available models from Open Responses API
   */
  private async loadAvailableModels(): Promise<void> {
    try {
      const response = await fetch(`${this.openResponsesConfig.base_url}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.openResponsesConfig.api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.openResponsesConfig.available_models = data.data?.map((model: any) => model.id) || [];
      }
    } catch (error) {
      console.error('Failed to load available models:', error);
      // Use fallback models
      this.openResponsesConfig.available_models = [
        'gpt-4o-mini',
        'gpt-4o',
        'gpt-4',
        'claude-3-sonnet',
        'claude-3-haiku'
      ];
    }
  }

  // ========================================
  // OPEN RESPONSES API INTEGRATION
  // ========================================

  /**
   * Execute response using Open Responses API
   */
  async executeResponse(
    input: string,
    model?: string,
    options?: {
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
      tools?: any[];
    }
  ): Promise<OpenResponsesExecution> {
    try {
      if (!this.isConfigured) {
        throw new Error('Julep Open Responses API not configured');
      }

      const startTime = Date.now();
      const selectedModel = model || this.openResponsesConfig.default_model;

      const requestBody = {
        model: selectedModel,
        input: input,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.max_tokens || 1000,
        stream: options?.stream || false,
        tools: options?.tools || []
      };

      const response = await fetch(`${this.openResponsesConfig.base_url}/v1/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openResponsesConfig.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Open Responses API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const responseData = await response.json();
      const executionTime = Date.now() - startTime;

      const execution: OpenResponsesExecution = {
        id: `or_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        model: selectedModel,
        input: input,
        response: responseData.content || responseData.choices?.[0]?.message?.content || '',
        tokens_used: responseData.usage?.total_tokens || 0,
        cost: this.calculateCost(responseData.usage?.total_tokens || 0, selectedModel),
        execution_time_ms: executionTime,
        timestamp: new Date().toISOString(),
        metadata: {
          usage: responseData.usage,
          finish_reason: responseData.finish_reason,
          model_used: responseData.model
        }
      };

      // Save execution to database
      await supabaseService.saveOpenResponsesExecution(execution);

      return execution;
    } catch (error) {
      console.error('Error executing Open Responses request:', error);
      throw error;
    }
  }

  /**
   * Execute streaming response
   */
  async executeStreamingResponse(
    input: string,
    model?: string,
    onChunk?: (chunk: string) => void,
    options?: {
      temperature?: number;
      max_tokens?: number;
      tools?: any[];
    }
  ): Promise<ReadableStream<string>> {
    try {
      if (!this.isConfigured) {
        throw new Error('Julep Open Responses API not configured');
      }

      const selectedModel = model || this.openResponsesConfig.default_model;

      const requestBody = {
        model: selectedModel,
        input: input,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.max_tokens || 1000,
        stream: true,
        tools: options?.tools || []
      };

      const response = await fetch(`${this.openResponsesConfig.base_url}/v1/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openResponsesConfig.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Open Responses API error: ${response.status}`);
      }

      const stream = new ReadableStream<string>({
        start(controller) {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.error(new Error('No response body'));
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          function pump(): Promise<void> {
            return reader!.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    controller.close();
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    const chunk = parsed.choices?.[0]?.delta?.content || '';
                    if (chunk) {
                      controller.enqueue(chunk);
                      onChunk?.(chunk);
                    }
                  } catch (e) {
                    // Ignore parsing errors for non-JSON lines
                  }
                }
              }

              return pump();
            });
          }

          return pump().catch(error => controller.error(error));
        }
      });

      return stream;
    } catch (error) {
      console.error('Error executing streaming response:', error);
      throw error;
    }
  }

  /**
   * Calculate cost for Open Responses execution
   */
  private calculateCost(tokens: number, model: string): number {
    // Simplified cost calculation - could be enhanced based on actual provider pricing
    const costPerToken = this.getModelCostPerToken(model);
    return (tokens * costPerToken) / 1000; // Convert to cost per 1K tokens
  }

  /**
   * Get cost per token for model
   */
  private getModelCostPerToken(model: string): number {
    const costs: Record<string, number> = {
      'gpt-4o-mini': 0.00015,
      'gpt-4o': 0.005,
      'gpt-4': 0.03,
      'claude-3-sonnet': 0.003,
      'claude-3-haiku': 0.00025,
      'qwen': 0.0001,
      'ollama': 0 // Local models are free
    };

    // Find matching cost
    for (const [modelPattern, cost] of Object.entries(costs)) {
      if (model.includes(modelPattern)) {
        return cost;
      }
    }

    return 0.001; // Default cost
  }

  // ========================================
  // JULEP WORKFLOW MANAGEMENT
  // ========================================

  /**
   * Create Julep workflow
   */
  async createWorkflow(
    name: string,
    description: string,
    yamlDefinition: string,
    variables: JulepVariable[] = []
  ): Promise<JulepWorkflow> {
    try {
      const workflow: JulepWorkflow = {
        id: `julep_wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        yaml_definition: yamlDefinition,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        execution_count: 0,
        agents: [],
        variables
      };

      // Validate YAML definition
      this.validateWorkflowYaml(yamlDefinition);

      // Save to database
      await supabaseService.saveJulepWorkflow(workflow);

      return workflow;
    } catch (error) {
      console.error('Error creating Julep workflow:', error);
      throw error;
    }
  }

  /**
   * Execute Julep workflow
   */
  async executeWorkflow(
    workflowId: string,
    inputVariables: Record<string, any> = {}
  ): Promise<JulepExecution> {
    try {
      const workflow = await supabaseService.getJulepWorkflow(workflowId);
      
      if (workflow.status !== 'active') {
        throw new Error('Workflow is not active');
      }

      const execution: JulepExecution = {
        id: `julep_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflow_id: workflowId,
        status: 'running',
        started_at: new Date().toISOString(),
        input_variables: inputVariables,
        steps: [],
        total_tokens_used: 0,
        total_cost: 0
      };

      // Execute workflow steps based on YAML definition
      const result = await this.executeWorkflowSteps(workflow, inputVariables, execution);

      execution.status = 'completed';
      execution.completed_at = new Date().toISOString();
      execution.output = result;

      // Update workflow execution count
      workflow.execution_count++;
      workflow.last_execution_at = new Date().toISOString();
      await supabaseService.updateJulepWorkflow(workflow);

      // Save execution
      await supabaseService.saveJulepExecution(execution);

      return execution;
    } catch (error) {
      console.error('Error executing Julep workflow:', error);
      throw error;
    }
  }

  /**
   * Execute workflow steps from YAML definition
   */
  private async executeWorkflowSteps(
    workflow: JulepWorkflow,
    inputVariables: Record<string, any>,
    execution: JulepExecution
  ): Promise<any> {
    try {
      // Parse YAML workflow definition
      const workflowDef = this.parseWorkflowYaml(workflow.yaml_definition);
      
      // Execute main workflow
      return await this.executeWorkflowNode(workflowDef.main, inputVariables, execution);
    } catch (error) {
      console.error('Error executing workflow steps:', error);
      throw error;
    }
  }

  /**
   * Execute individual workflow node
   */
  private async executeWorkflowNode(
    node: any,
    variables: Record<string, any>,
    execution: JulepExecution
  ): Promise<any> {
    const stepExecution = {
      step_name: node.name || 'unnamed_step',
      status: 'running' as const,
      started_at: new Date().toISOString(),
      input: variables
    };

    execution.steps.push(stepExecution);

    try {
      let result: any;

      switch (node.tool) {
        case 'agent':
          result = await this.executeAgentStep(node, variables);
          break;
        case 'llm':
          result = await this.executeLLMStep(node, variables);
          break;
        case 'condition':
          result = await this.executeConditionStep(node, variables, execution);
          break;
        case 'loop':
          result = await this.executeLoopStep(node, variables, execution);
          break;
        default:
          result = variables; // Pass through
      }

      (stepExecution as any).status = 'completed';
      (stepExecution as any).completed_at = new Date().toISOString();
      (stepExecution as any).output = result;

      return result;
    } catch (error) {
      (stepExecution as any).status = 'failed';
      (stepExecution as any).error_message = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Execute agent step
   */
  private async executeAgentStep(node: any, variables: Record<string, any>): Promise<any> {
    if (node.agent_id) {
      // Use existing agent
      const agentResponse = await this.executeResponse(
        this.interpolateVariables(node.prompt, variables),
        node.model
      );
      return agentResponse.response;
    } else {
      // Direct LLM call
      return this.executeLLMStep(node, variables);
    }
  }

  /**
   * Execute LLM step
   */
  private async executeLLMStep(node: any, variables: Record<string, any>): Promise<any> {
    const prompt = this.interpolateVariables(node.prompt, variables);
    
    const response = await this.executeResponse(prompt, node.model, {
      temperature: node.temperature || 0.7,
      max_tokens: node.max_tokens || 1000
    });

    return response.response;
  }

  /**
   * Execute condition step
   */
  private async executeConditionStep(
    node: any,
    variables: Record<string, any>,
    execution: JulepExecution
  ): Promise<any> {
    const condition = this.evaluateCondition(node.condition, variables);
    
    if (condition && node.then) {
      return this.executeWorkflowNode(node.then, variables, execution);
    } else if (!condition && node.else) {
      return this.executeWorkflowNode(node.else, variables, execution);
    }
    
    return variables;
  }

  /**
   * Execute loop step
   */
  private async executeLoopStep(
    node: any,
    variables: Record<string, any>,
    execution: JulepExecution
  ): Promise<any> {
    const results: any[] = [];
    const maxIterations = node.max_iterations || 10;
    
    for (let i = 0; i < maxIterations; i++) {
      const loopVariables = { ...variables, loop_index: i };
      
      const result = await this.executeWorkflowNode(node.step, loopVariables, execution);
      results.push(result);
      
      // Check break condition
      if (node.break_condition && this.evaluateCondition(node.break_condition, result)) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Interpolate variables in text
   */
  private interpolateVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? String(variables[varName]) : match;
    });
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(condition: any, variables: Record<string, any>): boolean {
    // Simple condition evaluation - could be enhanced
    const value = variables[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return String(value).includes(condition.value);
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  /**
   * Validate workflow YAML
   */
  private validateWorkflowYaml(yaml: string): void {
    try {
      // Basic YAML validation - could use a proper YAML parser
      if (!yaml.trim()) {
        throw new Error('Workflow YAML is empty');
      }
      
      // Check for required structure
      if (!yaml.includes('main:')) {
        throw new Error('Workflow must contain a main section');
      }
    } catch (error) {
      throw new Error(`Invalid workflow YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse workflow YAML
   */
  private parseWorkflowYaml(yaml: string): any {
    // Simplified YAML parser - in production, use a proper YAML library
    try {
      // Basic parsing for demo purposes
      const lines = yaml.split('\n');
      const workflow: any = { main: { tool: 'llm', prompt: 'Hello' } };
      
      // This is a simplified parser - implement proper YAML parsing for production
      return workflow;
    } catch (error) {
      throw new Error(`Failed to parse workflow YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get configuration
   */
  getConfig(): OpenResponsesConfig {
    return { ...this.openResponsesConfig };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<OpenResponsesConfig>): void {
    this.openResponsesConfig = { ...this.openResponsesConfig, ...updates };
    this.initialize();
  }

  /**
   * Check if service is configured
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return this.openResponsesConfig.available_models;
  }

  /**
   * Get workflows
   */
  async getWorkflows(userId?: string): Promise<JulepWorkflow[]> {
    return supabaseService.getJulepWorkflows(userId);
  }

  /**
   * Get workflow executions
   */
  async getWorkflowExecutions(workflowId: string): Promise<JulepExecution[]> {
    return supabaseService.getJulepExecutions(workflowId);
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    return supabaseService.deleteJulepWorkflow(workflowId);
  }

  /**
   * Test connection to Open Responses API
   */
  async testConnection(): Promise<boolean> {
    return this.checkConnection();
  }
}

export const julepService = new JulepService();