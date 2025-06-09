import { OpenAIAgent, OpenAIAgentConfig, OpenAIAgentExecution, OpenAIAgentMessage } from '../types/openai';
import { supabaseService } from './supabase';
import { Agent as DatabaseAgent } from '../types';

class OpenAIAgentsService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. Please set EXPO_PUBLIC_OPENAI_API_KEY environment variable.');
    }
  }

  async createAgent(config: OpenAIAgentConfig): Promise<OpenAIAgent> {
    try {
      // Create database record for the agent
      const databaseAgent: Omit<DatabaseAgent, 'id' | 'created_at' | 'updated_at' | 'tasks' | 'successRate'> = {
        name: config.name,
        description: config.description,
        status: 'active',
        provider: 'openai-agents',
        model: config.model || 'gpt-4',
        configuration: {
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
        metadata: config.metadata || {},
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
      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found`);
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

      // Simulate OpenAI API call
      try {
        const response = await this.callOpenAIAPI(agent, input);
        execution.output = response.output;
        execution.tokensUsed = response.tokensUsed;
        execution.cost = response.cost;
        execution.messages = response.messages;
        execution.status = 'completed';
        execution.endTime = new Date().toISOString();
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
        error: execution.status === 'failed' ? execution.output : null
      });

      return execution;
    } catch (error) {
      console.error('Error executing OpenAI agent:', error);
      throw new Error(`Failed to execute OpenAI agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async callOpenAIAPI(agent: OpenAIAgent, input: string): Promise<{
    output: string;
    tokensUsed: number;
    cost: number;
    messages: OpenAIAgentMessage[];
  }> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // This is a simplified OpenAI API call
    // In a real implementation, you would use the actual OpenAI SDK
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agent.model,
        messages: [
          {
            role: 'system',
            content: agent.instructions
          },
          {
            role: 'user',
            content: input
          }
        ],
        temperature: agent.temperature || 0.7,
        max_tokens: agent.max_tokens || 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const output = data.choices[0]?.message?.content || 'No response';
    const tokensUsed = data.usage?.total_tokens || 0;
    const cost = this.calculateCost(tokensUsed, agent.model);

    const messages: OpenAIAgentMessage[] = [
      {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content: input,
        timestamp: new Date().toISOString()
      },
      {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: output,
        timestamp: new Date().toISOString()
      }
    ];

    return {
      output,
      tokensUsed,
      cost,
      messages
    };
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
      const existingAgent = await this.getAgent(agentId);
      if (!existingAgent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }

      // Update the database record
      const updatedConfig = {
        instructions: updates.instructions || existingAgent.instructions,
        tools: updates.tools || existingAgent.tools,
        metadata: updates.metadata || existingAgent.metadata,
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

  private calculateCost(tokens: number, model: string): number {
    // Pricing estimates (per 1K tokens) - update these with current OpenAI pricing
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
    };

    const modelPricing = pricing[model] || pricing['gpt-4'];
    // Simplified calculation - assuming equal input/output tokens
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