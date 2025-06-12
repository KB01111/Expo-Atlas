import OpenAI from 'openai';
import { 
  AgentTeam, 
  AgentTeamMember, 
  TeamWorkflow, 
  TeamExecution, 
  PersistentConversation,
  AgentStreamEvent,
  StreamingResponse,
  AgentFile,
  VectorStore,
  CustomTool,
  AgentPerformanceMetrics,
  TeamPerformanceMetrics,
  WorkflowStep,
  WorkflowCondition,
  StepExecution,
  AgentActivity,
  AgentStatsAccumulator
} from '../types/agents';
import { OpenAIAgent, OpenAIAgentConfig } from '../types/openai';
import { supabaseService } from './supabase';
import { openaiModelsService } from './openaiModels';

/**
 * Enhanced OpenAI Agents Service with full SDK capabilities
 * Includes team management, workflows, streaming, and advanced features
 */
class EnhancedAgentsService {
  private openai: OpenAI;
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    this.baseUrl = baseUrl || 'https://api.openai.com/v1';
    
    this.openai = new OpenAI({ 
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
      organization: process.env.EXPO_PUBLIC_OPENAI_ORGANIZATION,
      dangerouslyAllowBrowser: true
    });
  }

  // ========================================
  // TEAM MANAGEMENT
  // ========================================

  /**
   * Create a new agent team
   */
  async createTeam(teamData: Omit<AgentTeam, 'id' | 'created_at' | 'updated_at'>): Promise<AgentTeam> {
    try {
      const team: AgentTeam = {
        id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...teamData
      };

      // Save to database
      const savedTeam = await supabaseService.createTeam(team);
      return savedTeam;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  /**
   * Add agent to team
   */
  async addAgentToTeam(
    teamId: string, 
    agentId: string, 
    role: AgentTeamMember['role'] = 'collaborator',
    capabilities: string[] = []
  ): Promise<AgentTeamMember> {
    try {
      const member: AgentTeamMember = {
        id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agent_id: agentId,
        role,
        capabilities,
        priority: 1,
        status: 'active',
        added_at: new Date().toISOString()
      };

      await supabaseService.addTeamMember(teamId, member);
      return member;
    } catch (error) {
      console.error('Error adding agent to team:', error);
      throw error;
    }
  }

  /**
   * Execute team workflow
   */
  async executeTeamWorkflow(
    teamId: string, 
    workflowId: string, 
    input: Record<string, unknown>
  ): Promise<TeamExecution> {
    try {
      const team = await supabaseService.getTeam(teamId);
      const workflow = team.workflow;
      
      if (!workflow) {
        throw new Error('No workflow defined for team');
      }

      const execution: TeamExecution = {
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        team_id: teamId,
        workflow_id: workflowId,
        status: 'running',
        started_at: new Date().toISOString(),
        current_step: workflow.steps[0]?.id,
        step_executions: [],
        input,
        total_tokens_used: 0,
        total_cost: 0,
        execution_time_ms: 0
      };

      // Execute workflow steps
      const result = await this.executeWorkflowSteps(workflow, team, input, execution);
      
      execution.status = 'completed';
      execution.completed_at = new Date().toISOString();
      execution.output = result;
      execution.execution_time_ms = Date.now() - new Date(execution.started_at).getTime();

      // Save execution
      await supabaseService.saveTeamExecution(execution);
      
      return execution;
    } catch (error) {
      console.error('Error executing team workflow:', error);
      throw error;
    }
  }

  /**
   * Execute workflow steps with team coordination
   */
  private async executeWorkflowSteps(
    workflow: TeamWorkflow,
    team: AgentTeam,
    input: Record<string, unknown>,
    execution: TeamExecution
  ): Promise<unknown> {
    let currentInput = input;
    const results: unknown[] = [];

    for (const step of workflow.steps) {
      try {
        const stepResult = await this.executeWorkflowStep(step, team, currentInput, execution);
        results.push(stepResult);
        
        // Update input for next step
        if (step.output_mapping && typeof stepResult === 'object' && stepResult !== null) {
          currentInput = this.mapStepOutput(stepResult as Record<string, unknown>, step.output_mapping);
        } else {
          currentInput = typeof stepResult === 'object' && stepResult !== null ? stepResult as Record<string, unknown> : { result: stepResult };
        }
      } catch (error) {
        console.error(`Error executing step ${step.id}:`, error);
        throw error;
      }
    }

    return workflow.execution_mode === 'sequential' ? results[results.length - 1] : results;
  }

  /**
   * Execute individual workflow step
   */
  private async executeWorkflowStep(
    step: WorkflowStep,
    team: AgentTeam,
    input: Record<string, unknown>,
    execution: TeamExecution
  ): Promise<unknown> {
    const stepExecution: StepExecution = {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      step_id: step.id,
      agent_id: step.agent_id,
      status: 'running',
      started_at: new Date().toISOString(),
      input,
      tokens_used: 0,
      cost: 0,
      execution_time_ms: 0
    };

    execution.step_executions.push(stepExecution);

    try {
      let result: unknown;

      switch (step.type) {
        case 'agent_task':
          if (!step.agent_id) throw new Error('Agent ID required for agent_task step');
          result = await this.executeAgentTask(step.agent_id, input);
          break;
        case 'parallel_split':
          if (!step.parallel_branches) throw new Error('Parallel branches required for parallel_split step');
          result = await this.executeParallelSteps(step.parallel_branches, team, input, execution);
          break;
        case 'condition':
          if (!step.conditions) throw new Error('Conditions required for condition step');
          result = await this.evaluateCondition(step.conditions, input);
          break;
        default:
          result = input; // Pass through
      }

      stepExecution.status = 'completed';
      stepExecution.completed_at = new Date().toISOString();
      stepExecution.output = result;
      stepExecution.execution_time_ms = Date.now() - new Date(stepExecution.started_at).getTime();

      return result;
    } catch (error) {
      stepExecution.status = 'failed';
      stepExecution.error_message = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Execute agent task
   */
  private async executeAgentTask(agentId: string, input: Record<string, unknown>): Promise<string> {
    try {
      const agents = await supabaseService.getAgents();
      const agent = agents.find(a => a.id === agentId);
      if (!agent) throw new Error('Agent not found');
      
      // Create thread
      const thread = await this.openai.beta.threads.create();

      // Add message
      await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: typeof input === 'string' ? input : JSON.stringify(input)
      });

      // Execute agent
      const run = await this.openai.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: agent.openai_assistant_id,
        model: agent.model
      });

      if (run.status === 'completed') {
        const messages = await this.openai.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];
        
        if (lastMessage.content[0]?.type === 'text') {
          return lastMessage.content[0].text.value;
        }
      }

      throw new Error(`Agent execution failed: ${run.status}`);
    } catch (error) {
      console.error('Error executing agent task:', error);
      throw error;
    }
  }

  /**
   * Execute parallel workflow steps
   */
  private async executeParallelSteps(
    branches: WorkflowStep[],
    team: AgentTeam,
    input: Record<string, unknown>,
    execution: TeamExecution
  ): Promise<unknown[]> {
    const promises = branches.map(branch => 
      this.executeWorkflowStep(branch, team, input, execution)
    );
    
    return Promise.all(promises);
  }

  /**
   * Evaluate workflow condition
   */
  private async evaluateCondition(conditions: WorkflowCondition[], input: Record<string, unknown>): Promise<boolean> {
    for (const condition of conditions) {
      const value = this.getNestedValue(input, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'contains':
          if (!String(value).includes(String(condition.value))) return false;
          break;
        case 'greater_than':
          if (Number(value) <= Number(condition.value)) return false;
          break;
        case 'exists':
          if (value === undefined || value === null) return false;
          break;
        default:
          return false;
      }
    }
    
    return true;
  }

  /**
   * Map step output using mapping configuration
   */
  private mapStepOutput(output: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    
    for (const [outputKey, inputKey] of Object.entries(mapping)) {
      mapped[inputKey] = this.getNestedValue(output, outputKey);
    }
    
    return mapped;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: any, key) => current?.[key], obj);
  }

  // ========================================
  // PERSISTENT CONVERSATIONS
  // ========================================

  /**
   * Create persistent conversation
   */
  async createPersistentConversation(
    agentId?: string,
    teamId?: string,
    title?: string
  ): Promise<PersistentConversation> {
    try {
      // Create OpenAI thread
      const thread = await this.openai.beta.threads.create();

      const conversation: PersistentConversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agent_id: agentId,
        team_id: teamId,
        thread_id: thread.id,
        title,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        context: {
          key_topics: [],
          mentioned_entities: []
        }
      };

      await supabaseService.savePersistentConversation(conversation);
      return conversation;
    } catch (error) {
      console.error('Error creating persistent conversation:', error);
      throw error;
    }
  }

  /**
   * Continue persistent conversation
   */
  async continueConversation(
    conversationId: string,
    message: string,
    agentId?: string
  ): Promise<string> {
    try {
      const conversation = await supabaseService.getPersistentConversation(conversationId);
      
      // Add user message
      await this.openai.beta.threads.messages.create(conversation.thread_id, {
        role: 'user',
        content: message
      });

      // Determine which agent to use
      const activeAgentId = agentId || conversation.agent_id;
      if (!activeAgentId) {
        throw new Error('No agent specified for conversation');
      }

      const agents = await supabaseService.getAgents();
      const agent = agents.find(a => a.id === activeAgentId);
      if (!agent) throw new Error('Agent not found');

      // Execute agent
      const run = await this.openai.beta.threads.runs.createAndPoll(conversation.thread_id, {
        assistant_id: agent.openai_assistant_id,
        model: agent.model
      });

      if (run.status === 'completed') {
        const messages = await this.openai.beta.threads.messages.list(conversation.thread_id);
        const lastMessage = messages.data[0];
        
        if (lastMessage.content[0]?.type === 'text') {
          const response = lastMessage.content[0].text.value;
          
          // Update conversation
          conversation.message_count += 2; // User + assistant
          conversation.last_message_at = new Date().toISOString();
          conversation.updated_at = new Date().toISOString();
          
          await supabaseService.updatePersistentConversation(conversation);
          
          return response;
        }
      }

      throw new Error(`Conversation execution failed: ${run.status}`);
    } catch (error) {
      console.error('Error continuing conversation:', error);
      throw error;
    }
  }

  // ========================================
  // REAL-TIME STREAMING
  // ========================================

  /**
   * Create streaming response for agent
   */
  async createStreamingResponse(
    agentId: string,
    conversationId: string,
    message: string
  ): Promise<StreamingResponse> {
    try {
      const conversation = await supabaseService.getPersistentConversation(conversationId);
      const agents = await supabaseService.getAgents();
      const agent = agents.find(a => a.id === agentId);
      if (!agent) throw new Error('Agent not found');

      // Add user message
      await this.openai.beta.threads.messages.create(conversation.thread_id, {
        role: 'user',
        content: message
      });

      // Create streaming run
      const stream = await this.openai.beta.threads.runs.stream(conversation.thread_id, {
        assistant_id: agent.openai_assistant_id,
        model: agent.model
      });

      // Convert OpenAI stream to our format
      const responseStream = new ReadableStream<AgentStreamEvent>({
        start(controller) {
          stream.on('textCreated', (text: any) => {
            controller.enqueue({
              type: 'message_start',
              timestamp: new Date().toISOString(),
              agent_id: agentId,
              conversation_id: conversationId,
              data: { text }
            });
          });

          stream.on('textDelta', (textDelta: any) => {
            controller.enqueue({
              type: 'content_delta',
              timestamp: new Date().toISOString(),
              agent_id: agentId,
              conversation_id: conversationId,
              data: { delta: textDelta.value }
            });
          });

          stream.on('toolCallCreated', (toolCall: any) => {
            controller.enqueue({
              type: 'tool_call',
              timestamp: new Date().toISOString(),
              agent_id: agentId,
              conversation_id: conversationId,
              data: { toolCall }
            });
          });

          stream.on('end', () => {
            controller.enqueue({
              type: 'message_complete',
              timestamp: new Date().toISOString(),
              agent_id: agentId,
              conversation_id: conversationId,
              data: {}
            });
            controller.close();
          });

          stream.on('error', (error: any) => {
            controller.enqueue({
              type: 'error',
              timestamp: new Date().toISOString(),
              agent_id: agentId,
              conversation_id: conversationId,
              data: { error: error.message }
            });
            controller.error(error);
          });
        }
      });

      return {
        id: `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversation_id: conversationId,
        agent_id: agentId,
        stream: responseStream,
        status: 'streaming',
        started_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating streaming response:', error);
      throw error;
    }
  }

  // ========================================
  // FILE AND VECTOR STORE MANAGEMENT
  // ========================================

  /**
   * Upload file for agent
   */
  async uploadAgentFile(
    agentId: string,
    file: File,
    purpose: 'assistants' | 'vision' = 'assistants'
  ): Promise<AgentFile> {
    try {
      // Upload to OpenAI
      const openaiFile = await this.openai.files.create({
        file: file,
        purpose: purpose
      });

      const agentFile: AgentFile = {
        id: openaiFile.id,
        agent_id: agentId,
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
        uploaded_at: new Date().toISOString(),
        processed: false,
        processing_status: 'pending'
      };

      await supabaseService.saveAgentFile(agentFile);
      return agentFile;
    } catch (error) {
      console.error('Error uploading agent file:', error);
      throw error;
    }
  }

  /**
   * Create vector store
   */
  async createVectorStore(
    name: string,
    description?: string,
    embeddingModel: string = 'text-embedding-3-small'
  ): Promise<VectorStore> {
    try {
      // Note: Vector stores require newer OpenAI SDK version
      // For now, create local vector store record
      const vectorStoreId = `vs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const vectorStore: VectorStore = {
        id: vectorStoreId,
        name,
        description,
        created_at: new Date().toISOString(),
        file_count: 0,
        total_size_bytes: 0,
        embedding_model: embeddingModel,
        status: 'ready',
        agents: []
      };

      await supabaseService.saveVectorStore(vectorStore);
      return vectorStore;
    } catch (error) {
      console.error('Error creating vector store:', error);
      throw error;
    }
  }

  // ========================================
  // PERFORMANCE MONITORING
  // ========================================

  /**
   * Get agent performance metrics
   */
  async getAgentPerformanceMetrics(
    agentId: string,
    timePeriod: string = '7d'
  ): Promise<AgentPerformanceMetrics> {
    try {
      const executions = await supabaseService.getAgentExecutions(agentId, timePeriod);
      
      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(e => e.status === 'completed').length;
      const failedExecutions = executions.filter(e => e.status === 'failed').length;
      
      const totalTokens = executions.reduce((sum, e) => sum + (e.tokensUsed || 0), 0);
      const totalCost = executions.reduce((sum, e) => sum + (e.cost || 0), 0);
      const totalTime = executions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0);

      return {
        agent_id: agentId,
        time_period: timePeriod,
        total_executions: totalExecutions,
        successful_executions: successfulExecutions,
        failed_executions: failedExecutions,
        average_response_time_ms: totalExecutions > 0 ? totalTime / totalExecutions : 0,
        total_tokens_used: totalTokens,
        total_cost: totalCost,
        average_cost_per_execution: totalExecutions > 0 ? totalCost / totalExecutions : 0,
        most_used_tools: [], // TODO: Implement tool usage tracking
        error_rate: totalExecutions > 0 ? failedExecutions / totalExecutions : 0
      };
    } catch (error) {
      console.error('Error getting agent performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get team performance metrics
   */
  async getTeamPerformanceMetrics(
    teamId: string,
    timePeriod: string = '7d'
  ): Promise<TeamPerformanceMetrics> {
    try {
      const executions = await supabaseService.getTeamExecutions(teamId, timePeriod);
      
      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(e => e.status === 'completed').length;
      const failedExecutions = executions.filter(e => e.status === 'failed').length;
      
      const totalTokens = executions.reduce((sum, e) => sum + e.total_tokens_used, 0);
      const totalCost = executions.reduce((sum, e) => sum + e.total_cost, 0);
      const totalTime = executions.reduce((sum, e) => sum + e.execution_time_ms, 0);

      // Calculate agent activities
      const agentActivities = this.calculateAgentActivities(executions);

      return {
        team_id: teamId,
        time_period: timePeriod,
        total_workflow_executions: totalExecutions,
        successful_workflow_executions: successfulExecutions,
        failed_workflow_executions: failedExecutions,
        average_workflow_completion_time_ms: totalExecutions > 0 ? totalTime / totalExecutions : 0,
        total_tokens_used: totalTokens,
        total_cost: totalCost,
        most_active_agents: agentActivities,
        collaboration_efficiency_score: this.calculateCollaborationScore(agentActivities)
      };
    } catch (error) {
      console.error('Error getting team performance metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate agent activities from team executions
   */
  private calculateAgentActivities(executions: TeamExecution[]): AgentActivity[] {
    const agentStats: Record<string, AgentStatsAccumulator> = {};

    executions.forEach(execution => {
      execution.step_executions.forEach(step => {
        if (step.agent_id) {
          if (!agentStats[step.agent_id]) {
            agentStats[step.agent_id] = {
              agent_id: step.agent_id,
              execution_count: 0,
              total_time: 0,
              successful_count: 0,
              collaboration_score: 0
            };
          }

          agentStats[step.agent_id].execution_count++;
          agentStats[step.agent_id].total_time += step.execution_time_ms;
          
          if (step.status === 'completed') {
            agentStats[step.agent_id].successful_count++;
          }
        }
      });
    });

    return Object.values(agentStats).map(stats => ({
      agent_id: stats.agent_id,
      execution_count: stats.execution_count,
      average_response_time_ms: stats.execution_count > 0 ? stats.total_time / stats.execution_count : 0,
      success_rate: stats.execution_count > 0 ? stats.successful_count / stats.execution_count : 0,
      collaboration_score: Math.random() * 100 // TODO: Implement proper collaboration scoring
    }));
  }

  /**
   * Calculate collaboration efficiency score
   */
  private calculateCollaborationScore(agentActivities: AgentActivity[]): number {
    if (agentActivities.length === 0) return 0;
    
    const avgSuccessRate = agentActivities.reduce((sum, activity) => sum + activity.success_rate, 0) / agentActivities.length;
    const avgCollaborationScore = agentActivities.reduce((sum, activity) => sum + activity.collaboration_score, 0) / agentActivities.length;
    
    return (avgSuccessRate * 0.6 + avgCollaborationScore * 0.4) * 100;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get available teams
   */
  async getTeams(userId?: string): Promise<AgentTeam[]> {
    return supabaseService.getTeams();
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string): Promise<AgentTeam> {
    return supabaseService.getTeam(teamId);
  }

  /**
   * Update team
   */
  async updateTeam(teamId: string, updates: Partial<AgentTeam>): Promise<AgentTeam> {
    return supabaseService.updateTeam(teamId, { ...updates, updated_at: new Date().toISOString() });
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string): Promise<void> {
    return supabaseService.deleteTeam(teamId);
  }
}

export const enhancedAgentsService = new EnhancedAgentsService();