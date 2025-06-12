// import { Agent } from '@openai/agents'; // Note: Experimental SDK, using standard OpenAI SDK
import OpenAI from 'openai';
import { OpenAIAgent, OpenAIAgentConfig, OpenAIAgentExecution, OpenAIAgentMessage } from '../types/openai';
import { supabaseService } from './supabase';
import { Agent as DatabaseAgent } from '../types';
import { openaiModelsService } from './openaiModels';
import { openaiAgentsSDK } from './openaiAgentsSDK';

// Simple in-memory tracker for tool usage
const toolUsageTracker: Record<string, number> = {};

class OpenAIAgentsService {
  private openai: OpenAI;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. Please set EXPO_PUBLIC_OPENAI_API_KEY environment variable.');
      // Create a placeholder client
      this.openai = new OpenAI({ apiKey: 'placeholder' });
    } else {
      this.openai = new OpenAI({ 
        apiKey: this.apiKey,
        organization: process.env.EXPO_PUBLIC_OPENAI_ORGANIZATION,
        dangerouslyAllowBrowser: true // Required for React Native/Expo
      });
    }
  }

  async createAgent(config: OpenAIAgentConfig): Promise<OpenAIAgent> {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Create OpenAI Assistant using the official SDK
      const assistant = await this.openai.beta.assistants.create({
        name: config.name,
        description: config.description,
        instructions: config.instructions,
        model: config.model || 'gpt-4',
        tools: config.tools?.map(tool => {
          if (tool.type === 'function') {
            return {
              type: 'function',
              function: tool.function!
            };
          }
          return { type: tool.type };
        }) || [],
        temperature: config.temperature,
        top_p: config.top_p,
        metadata: config.metadata || {}
      });

      // Create database record for the agent
      const databaseAgent: Omit<DatabaseAgent, 'id' | 'created_at' | 'updated_at' | 'tasks' | 'successRate'> = {
        user_id: config.user_id,
        name: config.name,
        description: config.description,
        status: 'active',
        provider: 'openai-agents',
        model: config.model || 'gpt-4',
        configuration: {
          openai_assistant_id: assistant.id,
          instructions: config.instructions,
          tools: config.tools || [],
          metadata: config.metadata || {},
          temperature: config.temperature,
          top_p: config.top_p,
          max_tokens: config.max_tokens
        }
      };

      const savedAgent = await supabaseService.createAgent(databaseAgent);
      if (!savedAgent) {
        throw new Error('Failed to save agent to database');
      }

      const openAIAgent: OpenAIAgent = {
        id: savedAgent.id,
        name: savedAgent.name,
        description: savedAgent.description,
        model: savedAgent.model,
        instructions: config.instructions,
        tools: config.tools || [],
        metadata: { ...config.metadata, openai_assistant_id: assistant.id },
        status: savedAgent.status as 'active' | 'inactive' | 'error',
        created_at: savedAgent.created_at,
        updated_at: savedAgent.updated_at,
        provider: 'openai-agents',
        executions: 0,
        successRate: 0,
        temperature: config.temperature,
        top_p: config.top_p,
        max_tokens: config.max_tokens
      };

      return openAIAgent;
    } catch (error) {
      console.error('Error creating OpenAI agent:', error);
      throw new Error(`Failed to create OpenAI agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeAgent(agentId: string, input: string, context?: Record<string, any>): Promise<OpenAIAgentExecution> {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }

      const openaiAssistantId = agent.metadata?.openai_assistant_id;
      if (!openaiAssistantId) {
        throw new Error('OpenAI Assistant ID not found for agent');
      }

      const startTime = new Date();

      // Create execution record in database
      const databaseExecution = await supabaseService.createExecution({
        agent_id: agentId,
        status: 'running',
        input,
        metadata: context || {}
      });

      if (!databaseExecution) {
        throw new Error('Failed to create execution record');
      }

      const execution: OpenAIAgentExecution = {
        id: databaseExecution.id,
        agentId,
        input,
        output: '',
        status: 'running',
        startTime: startTime.toISOString(),
        endTime: null,
        tokensUsed: 0,
        cost: 0,
        messages: [],
        metadata: context || {}
      };

      try {
        // Create a thread
        const thread = await this.openai.beta.threads.create();

        // Add message to thread
        await this.openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: input
        });

        // Create and poll run
        const run = await this.openai.beta.threads.runs.createAndPoll(thread.id, {
          assistant_id: openaiAssistantId,
          temperature: agent.temperature,
          max_prompt_tokens: agent.max_tokens
        });

        const invokedTools: string[] = [];
        if (run.status === 'completed') {
          // Get messages
          const messages = await this.openai.beta.threads.messages.list(thread.id);
          const assistantMessages = messages.data.filter((msg: any) => msg.role === 'assistant');

          if (assistantMessages.length > 0) {
            const lastMessage = assistantMessages[0];
            const content = lastMessage.content[0];

            if (content.type === 'text') {
              execution.output = content.text.value;
            }

            // Track tool calls from message metadata
            if (Array.isArray(lastMessage.tool_calls)) {
              for (const call of lastMessage.tool_calls) {
                const toolName = call.type === 'function' ? call.function.name : call.type;
                invokedTools.push(toolName);
                toolUsageTracker[toolName] = (toolUsageTracker[toolName] || 0) + 1;
              }
            }
          }

          // Calculate tokens and cost (approximation)
          execution.tokensUsed = run.usage?.total_tokens || 0;
          execution.cost = await this.calculateCost(execution.tokensUsed, agent.model);
          execution.status = 'completed';
        } else {
          execution.status = 'failed';
          execution.output = `Run failed with status: ${run.status}`;
        }

        execution.endTime = new Date().toISOString();

        // Clean up thread
        await this.openai.beta.threads.delete(thread.id);

        // Save invoked tools in execution metadata
        if (invokedTools.length > 0) {
          execution.metadata = { ...execution.metadata, tools_used: invokedTools };
        }

      } catch (error) {
        execution.status = 'failed';
        execution.output = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        execution.endTime = new Date().toISOString();
      }

      // Update the execution in the database
      await supabaseService.updateExecution(execution.id, {
        status: execution.status,
        output: execution.output,
        completed_at: execution.endTime,
        tokens_used: execution.tokensUsed,
        cost: execution.cost,
        error: execution.status === 'failed' ? execution.output : null,
        metadata: execution.metadata
      });

      return execution;
    } catch (error) {
      console.error('Error executing OpenAI agent:', error);
      throw new Error(`Failed to execute OpenAI agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  async getAgent(agentId: string): Promise<OpenAIAgent | null> {
    try {
      // Get all agents from database to find the OpenAI agent
      const agents = await supabaseService.getAgents();
      const dbAgent = agents.find(a => a.id === agentId && a.provider === 'openai-agents');
      
      if (!dbAgent) return null;

      const config = dbAgent.configuration || {};
      return {
        id: dbAgent.id,
        name: dbAgent.name,
        description: dbAgent.description,
        model: dbAgent.model,
        instructions: config.instructions || '',
        tools: config.tools || [],
        metadata: config.metadata || {},
        status: dbAgent.status as 'active' | 'inactive' | 'error',
        created_at: dbAgent.created_at,
        updated_at: dbAgent.updated_at,
        provider: 'openai-agents',
        executions: dbAgent.tasks || 0,
        successRate: dbAgent.successRate || 0,
        temperature: config.temperature,
        top_p: config.top_p,
        max_tokens: config.max_tokens
      };
    } catch (error) {
      console.error('Error getting agent:', error);
      return null;
    }
  }

  async updateAgent(agentId: string, updates: Partial<OpenAIAgentConfig>): Promise<OpenAIAgent> {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const existingAgent = await this.getAgent(agentId);
      if (!existingAgent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }

      const openaiAssistantId = existingAgent.metadata?.openai_assistant_id;
      if (openaiAssistantId) {
        // Update the OpenAI Assistant
        await this.openai.beta.assistants.update(openaiAssistantId, {
          name: updates.name || existingAgent.name,
          description: updates.description || existingAgent.description,
          instructions: updates.instructions || existingAgent.instructions,
          model: updates.model || existingAgent.model,
          tools: updates.tools?.map(tool => {
            if (tool.type === 'function') {
              return {
                type: 'function',
                function: tool.function!
              };
            }
            return { type: tool.type };
          }) || existingAgent.tools.map(tool => {
            if (tool.type === 'function') {
              return {
                type: 'function',
                function: tool.function!
              };
            }
            return { type: tool.type };
          }),
          temperature: updates.temperature || existingAgent.temperature,
          top_p: updates.top_p || existingAgent.top_p,
          metadata: { ...existingAgent.metadata, ...updates.metadata }
        });
      }

      // Update the database record
      const updatedConfig = {
        openai_assistant_id: openaiAssistantId,
        instructions: updates.instructions || existingAgent.instructions,
        tools: updates.tools || existingAgent.tools,
        metadata: { ...existingAgent.metadata, ...updates.metadata },
        temperature: updates.temperature || existingAgent.temperature,
        top_p: updates.top_p || existingAgent.top_p,
        max_tokens: updates.max_tokens || existingAgent.max_tokens
      };

      const updatedDbAgent = await supabaseService.updateAgent(agentId, {
        name: updates.name || existingAgent.name,
        description: updates.description || existingAgent.description,
        model: updates.model || existingAgent.model,
        configuration: updatedConfig
      });

      if (!updatedDbAgent) {
        throw new Error('Failed to update agent in database');
      }

      return {
        id: updatedDbAgent.id,
        name: updatedDbAgent.name,
        description: updatedDbAgent.description,
        model: updatedDbAgent.model,
        instructions: updatedConfig.instructions,
        tools: updatedConfig.tools || [],
        metadata: updatedConfig.metadata || {},
        status: updatedDbAgent.status as 'active' | 'inactive' | 'error',
        created_at: updatedDbAgent.created_at,
        updated_at: updatedDbAgent.updated_at,
        provider: 'openai-agents',
        executions: existingAgent.executions,
        successRate: existingAgent.successRate,
        temperature: updatedConfig.temperature,
        top_p: updatedConfig.top_p,
        max_tokens: updatedConfig.max_tokens
      };
    } catch (error) {
      console.error('Error updating OpenAI agent:', error);
      throw new Error(`Failed to update OpenAI agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    try {
      const agent = await this.getAgent(agentId);
      if (agent && this.apiKey) {
        const openaiAssistantId = agent.metadata?.openai_assistant_id;
        if (openaiAssistantId) {
          // Delete the OpenAI Assistant
          try {
            await this.openai.beta.assistants.delete(openaiAssistantId);
          } catch (error) {
            console.warn('Failed to delete OpenAI assistant, continuing with database deletion:', error);
          }
        }
      }

      // Delete from database
      const success = await supabaseService.deleteAgent(agentId);
      return success;
    } catch (error) {
      console.error('Error deleting OpenAI agent:', error);
      return false;
    }
  }

  async listAgents(): Promise<OpenAIAgent[]> {
    try {
      // Get all agents from database and filter for OpenAI agents
      const allAgents = await supabaseService.getAgents();
      const openAIAgents = allAgents.filter(agent => agent.provider === 'openai-agents');
      
      return openAIAgents.map(dbAgent => {
        const config = dbAgent.configuration || {};
        return {
          id: dbAgent.id,
          name: dbAgent.name,
          description: dbAgent.description,
          model: dbAgent.model,
          instructions: config.instructions || '',
          tools: config.tools || [],
          metadata: config.metadata || {},
          status: dbAgent.status as 'active' | 'inactive' | 'error',
          created_at: dbAgent.created_at,
          updated_at: dbAgent.updated_at,
          provider: 'openai-agents',
          executions: dbAgent.tasks || 0,
          successRate: dbAgent.successRate || 0,
          temperature: config.temperature,
          top_p: config.top_p,
          max_tokens: config.max_tokens
        };
      });
    } catch (error) {
      console.error('Error listing agents:', error);
      return [];
    }
  }

  async streamExecution(agentId: string, input: string, onMessage?: (message: OpenAIAgentMessage) => void): Promise<OpenAIAgentExecution> {
    // For now, just call the regular execution method
    // In a real implementation, you would stream the response
    if (onMessage) {
      const message: OpenAIAgentMessage = {
        id: `msg_${Date.now()}_stream`,
        role: 'assistant',
        content: 'Processing your request...',
        timestamp: new Date().toISOString()
      };
      onMessage(message);
    }

    return this.executeAgent(agentId, input);
  }

  private async calculateCost(tokens: number, model: string): Promise<number> {
    try {
      // Get latest pricing from models service
      const models = await openaiModelsService.fetchAllModels();
      const modelInfo = models.find(m => m.id === model);
      
      if (modelInfo?.pricing) {
        const tokensInK = tokens / 1000;
        // Simplified calculation - assuming equal input/output tokens
        return (tokensInK * modelInfo.pricing.input_tokens_per_1k + tokensInK * modelInfo.pricing.output_tokens_per_1k) / 2;
      }
    } catch (error) {
      console.warn('Failed to fetch dynamic pricing, using fallback:', error);
    }

    // Fallback pricing if dynamic fetch fails
    const fallbackPricing: Record<string, { input: number; output: number }> = {
      'gpt-4.5': { input: 0.01, output: 0.03 },
      'gpt-4.1': { input: 0.008, output: 0.025 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'o3-mini': { input: 0.02, output: 0.08 },
      'o4-mini': { input: 0.015, output: 0.06 }
    };

    const modelPricing = fallbackPricing[model] || fallbackPricing['gpt-4'];
    const tokensInK = tokens / 1000;
    return (tokensInK * modelPricing.input + tokensInK * modelPricing.output) / 2;
  }

  getAgentCount(): number {
    // This would need to be cached or fetched from database
    return 0;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const openAIAgentsService = new OpenAIAgentsService();
export default openAIAgentsService;