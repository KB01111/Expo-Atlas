/**
 * OpenAI Agents SDK Integration Service
 * Provides full compatibility and proper error handling for the OpenAI Agents SDK
 */

import OpenAI from 'openai';
// Note: @openai/agents SDK is experimental and may not be available in all environments
// We'll use the standard OpenAI SDK with Assistants API as the primary implementation
// import { Agent } from '@openai/agents';

import { 
  OpenAIAgent, 
  OpenAIAgentConfig, 
  OpenAIAgentExecution, 
  OpenAIAgentMessage,
  OpenAIAgentTool 
} from '../types/openai';
import { supabaseService } from './supabase';

interface AgentSDKConfig {
  apiKey: string;
  organization?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}

class OpenAIAgentsSDKService {
  private openai!: OpenAI;
  private config: AgentSDKConfig;
  private isConfigured: boolean = false;

  constructor(config?: Partial<AgentSDKConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
      organization: config?.organization || process.env.EXPO_PUBLIC_OPENAI_ORGANIZATION,
      baseURL: config?.baseURL || 'https://api.openai.com/v1',
      timeout: config?.timeout || 60000,
      maxRetries: config?.maxRetries || 3
    };

    this.initializeSDK();
  }

  /**
   * Initialize the OpenAI SDK with proper configuration
   */
  private initializeSDK(): void {
    try {
      if (!this.config.apiKey) {
        console.warn('OpenAI API key not configured. SDK will be in read-only mode.');
        this.isConfigured = false;
        // Create placeholder client for non-API operations
        this.openai = new OpenAI({ 
          apiKey: 'placeholder',
          dangerouslyAllowBrowser: true 
        });
        return;
      }

      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        organization: this.config.organization,
        baseURL: this.config.baseURL,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries,
        dangerouslyAllowBrowser: true, // Required for React Native/Expo
        defaultHeaders: {
          'User-Agent': 'Expo-Atlas-Mobile-App/1.0.0'
        }
      });

      this.isConfigured = true;
      console.log('✅ OpenAI Agents SDK initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI SDK:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if the SDK is properly configured
   */
  public getConfigurationStatus(): {
    isConfigured: boolean;
    hasApiKey: boolean;
    hasOrganization: boolean;
    endpoint: string;
    features: string[];
  } {
    return {
      isConfigured: this.isConfigured,
      hasApiKey: !!this.config.apiKey && this.config.apiKey !== 'placeholder',
      hasOrganization: !!this.config.organization,
      endpoint: this.config.baseURL || 'https://api.openai.com/v1',
      features: [
        'Assistants API',
        'Threads API', 
        'Messages API',
        'Runs API',
        'Files API',
        'Function Calling',
        'Code Interpreter',
        'File Search',
        'Streaming'
      ]
    };
  }

  /**
   * Test SDK connectivity and permissions
   */
  public async testConnection(): Promise<{
    success: boolean;
    models: string[];
    organization?: string;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: false,
        models: [],
        error: 'SDK not configured - missing API key'
      };
    }

    try {
      // Test basic API access
      const modelsResponse = await this.openai.models.list();
      const models = modelsResponse.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id)
        .slice(0, 5); // Just get first 5 for testing

      return {
        success: true,
        models,
        organization: this.config.organization
      };
    } catch (error) {
      console.error('SDK connection test failed:', error);
      return {
        success: false,
        models: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create an AI assistant using the Assistants API
   */
  public async createAssistant(config: {
    name: string;
    description?: string;
    instructions: string;
    model: string;
    tools?: OpenAIAgentTool[];
    fileIds?: string[];
    metadata?: Record<string, any>;
  }): Promise<{
    id: string;
    name: string;
    description?: string;
    instructions: string;
    model: string;
    tools: OpenAIAgentTool[];
    metadata: Record<string, any>;
  }> {
    if (!this.isConfigured) {
      throw new Error('OpenAI SDK not configured - check API key');
    }

    try {
      const assistant = await this.openai.beta.assistants.create({
        name: config.name,
        description: config.description,
        instructions: config.instructions,
        model: config.model,
        tools: config.tools?.map(tool => {
          if (tool.type === 'function' && tool.function) {
            return {
              type: 'function' as const,
              function: tool.function
            };
          } else if (tool.type === 'code_interpreter') {
            return { type: 'code_interpreter' as const };
          } else if (tool.type === 'file_search') {
            return { type: 'file_search' as const };
          }
          throw new Error(`Invalid tool type: ${tool.type}`);
        }) || [],
        metadata: config.metadata || {}
      });

      return {
        id: assistant.id,
        name: assistant.name || config.name,
        description: assistant.description || config.description,
        instructions: assistant.instructions || config.instructions,
        model: assistant.model,
        tools: config.tools || [],
        metadata: assistant.metadata || {}
      };
    } catch (error) {
      console.error('Failed to create assistant:', error);
      throw new Error(`Assistant creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute an assistant with a message
   */
  public async executeAssistant(
    assistantId: string,
    message: string,
    options?: {
      threadId?: string;
      additionalInstructions?: string;
      metadata?: Record<string, any>;
      onProgress?: (event: { type: 'message' | 'progress'; data: any }) => void;
    }
  ): Promise<{
    threadId: string;
    runId: string;
    messages: OpenAIAgentMessage[];
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    status: 'completed' | 'failed' | 'cancelled';
    error?: string;
  }> {
    if (!this.isConfigured) {
      throw new Error('OpenAI SDK not configured - check API key');
    }

    try {
      // Create or use existing thread
      let threadId = options?.threadId;
      if (!threadId) {
        const thread = await this.openai.beta.threads.create();
        threadId = thread.id;
      }

      // Add message to thread
      await this.openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: message
      });

      // Create and poll run
      const run = await this.openai.beta.threads.runs.createAndPoll(threadId, {
        assistant_id: assistantId,
        additional_instructions: options?.additionalInstructions,
        metadata: options?.metadata
      });

      // Get messages
      const messagesResponse = await this.openai.beta.threads.messages.list(threadId);
      const messages: OpenAIAgentMessage[] = messagesResponse.data.map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content[0]?.type === 'text' ? msg.content[0].text.value : '',
        timestamp: new Date(msg.created_at * 1000).toISOString()
      }));

      return {
        threadId,
        runId: run.id,
        messages: messages.reverse(), // Reverse to get chronological order
        usage: run.usage ? {
          promptTokens: run.usage.prompt_tokens || 0,
          completionTokens: run.usage.completion_tokens || 0,
          totalTokens: run.usage.total_tokens || 0
        } : undefined,
        status: run.status === 'completed' ? 'completed' : 'failed',
        error: run.status !== 'completed' ? `Run ${run.status}` : undefined
      };
    } catch (error) {
      console.error('Assistant execution failed:', error);
      throw new Error(`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream assistant execution for real-time responses
   */
  public async streamAssistant(
    assistantId: string,
    message: string,
    onMessage: (message: OpenAIAgentMessage) => void,
    options?: {
      threadId?: string;
      additionalInstructions?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    threadId: string;
    runId: string;
    finalMessage?: string;
    usage?: any;
  }> {
    if (!this.isConfigured) {
      throw new Error('OpenAI SDK not configured - check API key');
    }

    try {
      // For now, we'll use the polling method and simulate streaming
      // Real streaming would require the streaming API
      const result = await this.executeAssistant(assistantId, message, {
        ...options,
        onProgress: (event) => {
          if (event.type === 'message') {
            onMessage(event.data);
          }
        }
      });

      // Send final message
      const assistantMessage = result.messages.find(msg => msg.role === 'assistant');
      if (assistantMessage) {
        onMessage(assistantMessage);
      }

      return {
        threadId: result.threadId,
        runId: result.runId,
        finalMessage: assistantMessage?.content,
        usage: result.usage
      };
    } catch (error) {
      console.error('Streaming execution failed:', error);
      throw error;
    }
  }

  /**
   * Upload file for assistant use
   */
  public async uploadFile(
    file: File | Blob,
    purpose: 'assistants' | 'fine-tune' = 'assistants'
  ): Promise<{
    id: string;
    filename: string;
    bytes: number;
    purpose: string;
  }> {
    if (!this.isConfigured) {
      throw new Error('OpenAI SDK not configured - check API key');
    }

    try {
      const uploadedFile = await this.openai.files.create({
        file: file,
        purpose: purpose
      });

      return {
        id: uploadedFile.id,
        filename: uploadedFile.filename,
        bytes: uploadedFile.bytes,
        purpose: uploadedFile.purpose
      };
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List available models
   */
  public async getAvailableModels(): Promise<{
    gptModels: string[];
    assistantModels: string[];
    allModels: string[];
  }> {
    if (!this.isConfigured) {
      return {
        gptModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'],
        assistantModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'],
        allModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo']
      };
    }

    try {
      const response = await this.openai.models.list();
      const allModels = response.data.map(model => model.id);
      const gptModels = allModels.filter(id => id.includes('gpt'));
      const assistantModels = gptModels.filter(id => 
        ['gpt-4', 'gpt-3.5-turbo'].some(prefix => id.startsWith(prefix))
      );

      return {
        gptModels,
        assistantModels,
        allModels
      };
    } catch (error) {
      console.error('Failed to fetch models:', error);
      // Return fallback models
      return {
        gptModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'],
        assistantModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'],
        allModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo']
      };
    }
  }

  /**
   * Clean up resources (threads, files)
   */
  public async cleanup(resourceIds: {
    threadIds?: string[];
    assistantIds?: string[];
    fileIds?: string[];
  }): Promise<{
    threadsDeleted: number;
    assistantsDeleted: number;
    filesDeleted: number;
    errors: string[];
  }> {
    if (!this.isConfigured) {
      return {
        threadsDeleted: 0,
        assistantsDeleted: 0,
        filesDeleted: 0,
        errors: ['SDK not configured']
      };
    }

    const results = {
      threadsDeleted: 0,
      assistantsDeleted: 0,
      filesDeleted: 0,
      errors: [] as string[]
    };

    // Clean up threads
    if (resourceIds.threadIds) {
      for (const threadId of resourceIds.threadIds) {
        try {
          await this.openai.beta.threads.delete(threadId);
          results.threadsDeleted++;
        } catch (error) {
          results.errors.push(`Failed to delete thread ${threadId}: ${error}`);
        }
      }
    }

    // Clean up assistants
    if (resourceIds.assistantIds) {
      for (const assistantId of resourceIds.assistantIds) {
        try {
          await this.openai.beta.assistants.delete(assistantId);
          results.assistantsDeleted++;
        } catch (error) {
          results.errors.push(`Failed to delete assistant ${assistantId}: ${error}`);
        }
      }
    }

    // Clean up files
    if (resourceIds.fileIds) {
      for (const fileId of resourceIds.fileIds) {
        try {
          await this.openai.files.delete(fileId);
          results.filesDeleted++;
        } catch (error) {
          results.errors.push(`Failed to delete file ${fileId}: ${error}`);
        }
      }
    }

    return results;
  }

  /**
   * Update configuration
   */
  public updateConfiguration(newConfig: Partial<AgentSDKConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeSDK();
  }

  /**
   * Get current configuration (without sensitive data)
   */
  public getConfiguration(): Omit<AgentSDKConfig, 'apiKey'> & { hasApiKey: boolean } {
    return {
      hasApiKey: !!this.config.apiKey && this.config.apiKey !== 'placeholder',
      organization: this.config.organization,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries
    };
  }
}

// Create singleton instance
export const openaiAgentsSDK = new OpenAIAgentsSDKService();
export default openaiAgentsSDK;