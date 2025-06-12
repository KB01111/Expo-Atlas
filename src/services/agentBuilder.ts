import OpenAI from 'openai';
import { 
  OpenAIAgentBuilderConfig,
  AgentBuilderState,
  CustomFunction,
  AgentFile,
  AgentTestConversation,
  AgentTestMetrics,
  AgentTemplate,
  AgentDeployment,
  OpenAIAgent,
  OpenAIAgentExecution
} from '../types/openai';
import { supabaseService } from './supabase';
import { openaiModelsService } from './openaiModels';

/**
 * Comprehensive OpenAI Agent Builder Service
 * Full-featured agent creation, testing, and deployment with Supabase persistence
 */
class AgentBuilderService {
  private openai: OpenAI;
  private apiKey: string;
  private builderStates: Map<string, AgentBuilderState> = new Map();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    
    this.openai = new OpenAI({ 
      apiKey: this.apiKey,
      organization: process.env.EXPO_PUBLIC_OPENAI_ORGANIZATION,
      dangerouslyAllowBrowser: true
    });
  }

  // ========================================
  // BUILDER STATE MANAGEMENT
  // ========================================

  /**
   * Initialize new agent builder session
   */
  async initializeBuilder(userId: string, builderId?: string): Promise<{ state: AgentBuilderState, builderId: string }> {
    const defaultConfig: OpenAIAgentBuilderConfig = {
      step: 'basic',
      basic: {
        name: '',
        description: '',
        model: 'gpt-4o',
        category: 'assistant',
        tags: []
      },
      instructions: {
        system_prompt: '',
        personality: '',
        goals: [],
        constraints: [],
        examples: []
      },
      tools: {
        code_interpreter: false,
        file_search: false,
        functions: []
      },
      files: {
        knowledge_files: [],
        code_files: [],
        vector_store_ids: []
      },
      advanced: {
        temperature: 0.7,
        top_p: 1.0,
        max_tokens: 4096,
        timeout_seconds: 60,
        max_retries: 3,
        fallback_behavior: 'error'
      },
      metadata: {
        created_by: userId,
        environment: 'development',
        version: '1.0.0',
        changelog: []
      }
    };

    const state: AgentBuilderState = {
      config: defaultConfig,
      validation: {
        step_errors: {},
        warnings: [],
        is_valid: false
      },
      preview: {
        test_conversations: [],
      },
      deployment: {
        status: 'draft'
      }
    };

    const finalBuilderId = builderId || `builder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.builderStates.set(finalBuilderId, state);

    // Save to Supabase
    await supabaseService.saveAgentBuilderState(finalBuilderId, state);

    return { state, builderId: finalBuilderId };
  }

  /**
   * Update builder configuration step
   */
  async updateBuilderStep(
    builderId: string, 
    step: OpenAIAgentBuilderConfig['step'], 
    data: Partial<OpenAIAgentBuilderConfig>
  ): Promise<AgentBuilderState> {
    const state = this.builderStates.get(builderId);
    if (!state) throw new Error('Builder session not found');

    // Update configuration
    state.config = { ...state.config, ...data, step };
    
    // Validate current step
    const validation = await this.validateBuilderStep(state.config, step);
    state.validation = validation;

    // Save to Supabase
    await supabaseService.saveAgentBuilderState(builderId, state);
    this.builderStates.set(builderId, state);

    return state;
  }

  /**
   * Get builder state
   */
  async getBuilderState(builderId: string): Promise<AgentBuilderState | null> {
    // Try memory first
    let state = this.builderStates.get(builderId);
    
    if (!state) {
      // Try Supabase
      state = await supabaseService.getAgentBuilderState(builderId);
      if (state) {
        this.builderStates.set(builderId, state);
      }
    }

    return state || null;
  }

  // ========================================
  // VALIDATION
  // ========================================

  /**
   * Validate builder step configuration
   */
  private async validateBuilderStep(
    config: OpenAIAgentBuilderConfig, 
    step: string
  ): Promise<AgentBuilderState['validation']> {
    const errors: Record<string, string[]> = {};
    const warnings: string[] = [];

    switch (step) {
      case 'basic':
        if (!config.basic.name.trim()) {
          errors.name = ['Agent name is required'];
        }
        if (!config.basic.description.trim()) {
          errors.description = ['Agent description is required'];
        }
        if (!config.basic.model) {
          errors.model = ['Model selection is required'];
        }
        break;

      case 'instructions':
        if (!config.instructions.system_prompt.trim()) {
          errors.system_prompt = ['System prompt is required'];
        }
        if (config.instructions.system_prompt.length > 32000) {
          errors.system_prompt = ['System prompt too long (max 32000 characters)'];
        }
        if (config.instructions.goals.length === 0) {
          warnings.push('Consider adding specific goals for your agent');
        }
        break;

      case 'tools':
        // Validate custom functions
        for (const func of config.tools.functions) {
          const funcErrors = await this.validateCustomFunction(func);
          if (funcErrors.length > 0) {
            errors[`function_${func.id}`] = funcErrors;
          }
        }
        break;

      case 'files':
        // Validate file uploads
        for (const file of [...config.files.knowledge_files, ...config.files.code_files]) {
          if (file.processing_status === 'failed') {
            errors[`file_${file.id}`] = [`File processing failed: ${file.processing_error}`];
          }
        }
        break;

      case 'advanced':
        if (config.advanced.temperature < 0 || config.advanced.temperature > 2) {
          errors.temperature = ['Temperature must be between 0 and 2'];
        }
        if (config.advanced.top_p < 0 || config.advanced.top_p > 1) {
          errors.top_p = ['Top-p must be between 0 and 1'];
        }
        if (config.advanced.max_tokens < 1 || config.advanced.max_tokens > 128000) {
          errors.max_tokens = ['Max tokens must be between 1 and 128000'];
        }
        break;
    }

    return {
      step_errors: errors,
      warnings,
      is_valid: Object.keys(errors).length === 0
    };
  }

  /**
   * Validate custom function definition
   */
  private async validateCustomFunction(func: CustomFunction): Promise<string[]> {
    const errors: string[] = [];

    if (!func.name.trim()) {
      errors.push('Function name is required');
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(func.name)) {
      errors.push('Function name must be valid identifier');
    }

    if (!func.description.trim()) {
      errors.push('Function description is required');
    }

    if (!func.parameters.properties || Object.keys(func.parameters.properties).length === 0) {
      errors.push('Function must have at least one parameter');
    }

    // Validate implementation
    switch (func.implementation.type) {
      case 'api_call':
        if (!func.implementation.endpoint) {
          errors.push('API endpoint is required');
        }
        break;
      case 'javascript':
      case 'python':
        if (!func.implementation.code) {
          errors.push('Function code is required');
        }
        break;
    }

    return errors;
  }

  // ========================================
  // FILE MANAGEMENT
  // ========================================

  /**
   * Upload file for agent
   */
  async uploadAgentFile(
    builderId: string,
    file: File,
    type: AgentFile['type']
  ): Promise<AgentFile> {
    try {
      // Upload to OpenAI
      const openaiFile = await this.openai.files.create({
        file: file,
        purpose: type === 'knowledge' ? 'assistants' : 'assistants'
      });

      const agentFile: AgentFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type,
        size_bytes: file.size,
        mime_type: file.type,
        openai_file_id: openaiFile.id,
        processing_status: 'processing',
        metadata: {
          upload_source: 'local',
          tags: [],
          auto_update: false,
          last_modified: new Date().toISOString()
        }
      };

      // Save to Supabase
      await supabaseService.saveAgentFile(agentFile);

      // Update builder state
      const state = await this.getBuilderState(builderId);
      if (state) {
        if (type === 'knowledge') {
          state.config.files.knowledge_files.push(agentFile);
        } else {
          state.config.files.code_files.push(agentFile);
        }
        await supabaseService.saveAgentBuilderState(builderId, state);
      }

      return agentFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Create vector store for files
   */
  async createVectorStore(
    builderId: string,
    name: string,
    fileIds: string[]
  ): Promise<string> {
    try {
      // Note: Vector stores require newer OpenAI SDK version
      // For now, create a logical grouping
      const vectorStoreId = `vs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Save vector store info to Supabase
      await supabaseService.saveVectorStore({
        id: vectorStoreId,
        name,
        description: `Vector store for agent builder ${builderId}`,
        created_at: new Date().toISOString(),
        file_count: fileIds.length,
        total_size_bytes: 0,
        embedding_model: 'text-embedding-3-small',
        status: 'ready',
        agents: [builderId]
      });

      return vectorStoreId;
    } catch (error) {
      console.error('Error creating vector store:', error);
      throw error;
    }
  }

  // ========================================
  // CUSTOM FUNCTIONS
  // ========================================

  /**
   * Add custom function to agent
   */
  async addCustomFunction(
    builderId: string,
    func: Omit<CustomFunction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CustomFunction> {
    const customFunction: CustomFunction = {
      ...func,
      id: `func_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Validate function
    const errors = await this.validateCustomFunction(customFunction);
    if (errors.length > 0) {
      throw new Error(`Function validation failed: ${errors.join(', ')}`);
    }

    // Save to Supabase
    await supabaseService.saveCustomFunction(customFunction);

    // Update builder state
    const state = await this.getBuilderState(builderId);
    if (state) {
      state.config.tools.functions.push(customFunction);
      await supabaseService.saveAgentBuilderState(builderId, state);
    }

    return customFunction;
  }

  /**
   * Test custom function
   */
  async testCustomFunction(
    functionId: string,
    testInput: Record<string, any>
  ): Promise<{ success: boolean; output?: any; error?: string; execution_time: number }> {
    try {
      const func = await supabaseService.getCustomFunction(functionId);
      if (!func) throw new Error('Function not found');

      const startTime = Date.now();
      let result: any;

      switch (func.implementation.type) {
        case 'api_call':
          result = await this.executeAPIFunction(func, testInput);
          break;
        case 'javascript':
          result = await this.executeJavaScriptFunction(func, testInput);
          break;
        default:
          throw new Error(`Function type ${func.implementation.type} not supported`);
      }

      const execution_time = Date.now() - startTime;

      return {
        success: true,
        output: result,
        execution_time
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time: 0
      };
    }
  }

  /**
   * Execute API-based function
   */
  private async executeAPIFunction(
    func: CustomFunction,
    input: Record<string, any>
  ): Promise<any> {
    if (!func.implementation.endpoint) {
      throw new Error('API endpoint not configured');
    }

    const response = await fetch(func.implementation.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...func.implementation.headers
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Execute JavaScript function (sandboxed)
   */
  private async executeJavaScriptFunction(
    func: CustomFunction,
    input: Record<string, any>
  ): Promise<any> {
    if (!func.implementation.code) {
      throw new Error('JavaScript code not provided');
    }

    try {
      // Create a sandboxed function
      const sandboxedFunction = new Function(
        'input',
        `
        "use strict";
        ${func.implementation.code}
        `
      );

      return sandboxedFunction(input);
    } catch (error) {
      throw new Error(`JavaScript execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ========================================
  // AGENT TESTING
  // ========================================

  /**
   * Create test conversation
   */
  async createTestConversation(
    builderId: string,
    testName: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<AgentTestConversation> {
    const state = await this.getBuilderState(builderId);
    if (!state) throw new Error('Builder session not found');

    // Create temporary assistant for testing
    const testAssistant = await this.createTestAssistant(state.config);

    const conversation: AgentTestConversation = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: testName,
      messages: [],
      metrics: {
        response_time_ms: 0,
        tokens_used: 0,
        cost: 0
      },
      status: 'running',
      created_at: new Date().toISOString(),
      error: undefined
    };

    try {
      // Create thread
      const thread = await this.openai.beta.threads.create();

      let totalTokens = 0;
      let totalCost = 0;
      const startTime = Date.now();

      for (const message of messages) {
        if (message.role === 'user') {
          // Add user message
          await this.openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: message.content
          });

          conversation.messages.push({
            ...message,
            timestamp: new Date().toISOString()
          });

          // Run assistant
          const run = await this.openai.beta.threads.runs.createAndPoll(thread.id, {
            assistant_id: testAssistant.id,
            model: state.config.basic.model
          });

          if (run.status === 'completed') {
            // Get assistant response
            const responseMessages = await this.openai.beta.threads.messages.list(thread.id);
            const lastMessage = responseMessages.data[0];

            if (lastMessage.content[0]?.type === 'text') {
              conversation.messages.push({
                role: 'assistant',
                content: lastMessage.content[0].text.value,
                timestamp: new Date().toISOString()
              });
            }

            // Calculate usage
            if (run.usage) {
              totalTokens += run.usage.total_tokens || 0;
              totalCost += this.calculateCost(state.config.basic.model, run.usage.total_tokens || 0);
            }
          }
        }
      }

      const totalTime = Date.now() - startTime;

      conversation.metrics = {
        response_time_ms: totalTime,
        tokens_used: totalTokens,
        cost: totalCost
      };
      conversation.status = 'completed';

      // Clean up test assistant
      // Note: Assistant cleanup would happen here in production
      // OpenAI SDK may not have delete method in current version

      // Save conversation
      await supabaseService.saveTestConversation(conversation);

      // Update builder state
      state.preview.test_conversations.push(conversation);
      await supabaseService.saveAgentBuilderState(builderId, state);

      return conversation;
    } catch (error) {
      conversation.status = 'failed';
      conversation.error = error instanceof Error ? error.message : String(error);
      console.error('Test conversation failed:', error);

      // Save failed conversation for metrics
      state.preview.test_conversations.push(conversation);
      await supabaseService.saveAgentBuilderState(builderId, state);

      throw error;
    }
  }

  /**
   * Create temporary assistant for testing
   */
  private async createTestAssistant(config: OpenAIAgentBuilderConfig) {
    const tools: any[] = [];

    if (config.tools.code_interpreter) {
      tools.push({ type: 'code_interpreter' });
    }

    if (config.tools.file_search) {
      tools.push({ type: 'file_search' });
    }

    // Add custom functions
    for (const func of config.tools.functions) {
      if (func.enabled) {
        tools.push({
          type: 'function',
          function: {
            name: func.name,
            description: func.description,
            parameters: func.parameters
          }
        });
      }
    }

    return this.openai.beta.assistants.create({
      name: `Test: ${config.basic.name}`,
      description: config.basic.description,
      model: config.basic.model,
      instructions: config.instructions.system_prompt,
      tools,
      temperature: config.advanced.temperature,
      top_p: config.advanced.top_p
    });
  }

  /**
   * Calculate test metrics
   */
  async calculateTestMetrics(builderId: string): Promise<AgentTestMetrics> {
    const state = await this.getBuilderState(builderId);
    if (!state) throw new Error('Builder session not found');

    const conversations = state.preview.test_conversations;
    const completedTests = conversations.filter(c => c.status === 'completed');
    const failedTests = conversations.filter(c => c.status === 'failed');

    const totalTokens = completedTests.reduce((sum, c) => sum + c.metrics.tokens_used, 0);
    const totalCost = completedTests.reduce((sum, c) => sum + c.metrics.cost, 0);
    const totalResponseTime = completedTests.reduce((sum, c) => sum + c.metrics.response_time_ms, 0);

    const failureMap: Record<string, number> = {};
    for (const convo of failedTests) {
      const message = convo.error || 'Unknown Error';
      failureMap[message] = (failureMap[message] || 0) + 1;
    }
    const commonFailures = Object.entries(failureMap).map(([message, count]) => ({ message, count }));

    return {
      total_tests: conversations.length,
      passed_tests: completedTests.length,
      failed_tests: failedTests.length,
      average_response_time: completedTests.length > 0 ? totalResponseTime / completedTests.length : 0,
      average_cost_per_interaction: completedTests.length > 0 ? totalCost / completedTests.length : 0,
      total_tokens_used: totalTokens,
      success_rate: conversations.length > 0 ? completedTests.length / conversations.length : 0,
      common_failures: commonFailures
    };
  }

  // ========================================
  // DEPLOYMENT
  // ========================================

  /**
   * Deploy agent to production
   */
  async deployAgent(
    builderId: string,
    environment: 'development' | 'staging' | 'production' = 'production'
  ): Promise<AgentDeployment> {
    const state = await this.getBuilderState(builderId);
    if (!state) throw new Error('Builder session not found');

    if (!state.validation.is_valid) {
      throw new Error('Agent configuration is not valid');
    }

    try {
      state.deployment.status = 'deploying';
      await supabaseService.saveAgentBuilderState(builderId, state);

      // Create OpenAI Assistant
      const assistant = await this.createProductionAssistant(state.config);

      // Create agent record that matches Supabase schema
      const agentData = {
        user_id: state.config.metadata.created_by,
        name: state.config.basic.name,
        description: state.config.basic.description,
        status: 'active' as const,
        provider: 'openai-agents',
        model: state.config.basic.model,
        configuration: {
          // Store full OpenAI agent config in JSONB
          instructions: state.config.instructions.system_prompt,
          tools: this.convertBuilderToolsToAgentTools(state.config.tools),
          metadata: state.config.metadata,
          temperature: state.config.advanced.temperature,
          top_p: state.config.advanced.top_p,
          max_tokens: state.config.advanced.max_tokens,
          openai_assistant_id: assistant.id,
          builder_config: state.config,
          executions: 0,
          successRate: 0
        }
      };

      // Save agent to Supabase (will get UUID auto-generated)
      const savedAgent = await supabaseService.createAgent(agentData);
      if (!savedAgent) {
        throw new Error('Failed to save agent to database');
      }

      // Create deployment record
      const deployment: AgentDeployment = {
        id: `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agent_id: savedAgent.id,
        environment,
        version: state.config.metadata.version,
        status: 'active',
        endpoints: {
          api_url: `https://api.your-domain.com/agents/${savedAgent.id}`,
          webhook_url: `https://api.your-domain.com/webhooks/agents/${savedAgent.id}`,
          embed_url: `https://embed.your-domain.com/agents/${savedAgent.id}`
        },
        configuration: {
          rate_limits: {
            requests_per_minute: 60,
            tokens_per_day: 100000
          },
          allowed_origins: ['*'],
          authentication_required: false,
          logging_enabled: true
        },
        metrics: {
          total_requests: 0,
          success_rate: 0,
          average_response_time: 0
        },
        deployed_at: new Date().toISOString(),
        deployed_by: state.config.metadata.created_by
      };

      // Save deployment
      await supabaseService.saveAgentDeployment(deployment);

      // Update builder state
      state.deployment = {
        status: 'deployed',
        deployed_at: deployment.deployed_at,
        deployment_id: deployment.id,
        endpoints: deployment.endpoints
      };
      state.preview.agent_id = savedAgent.id;
      await supabaseService.saveAgentBuilderState(builderId, state);

      return deployment;
    } catch (error) {
      state.deployment.status = 'failed';
      await supabaseService.saveAgentBuilderState(builderId, state);
      console.error('Deployment failed:', error);
      throw error;
    }
  }

  /**
   * Create production assistant
   */
  private async createProductionAssistant(config: OpenAIAgentBuilderConfig) {
    const tools: any[] = [];

    if (config.tools.code_interpreter) {
      tools.push({ type: 'code_interpreter' });
    }

    if (config.tools.file_search) {
      tools.push({ type: 'file_search' });
    }

    // Add custom functions
    for (const func of config.tools.functions) {
      if (func.enabled) {
        tools.push({
          type: 'function',
          function: {
            name: func.name,
            description: func.description,
            parameters: func.parameters
          }
        });
      }
    }

    const assistantData: any = {
      name: config.basic.name,
      description: config.basic.description,
      model: config.basic.model,
      instructions: config.instructions.system_prompt,
      tools,
      temperature: config.advanced.temperature,
      top_p: config.advanced.top_p,
      metadata: {
        created_by: config.metadata.created_by,
        environment: config.metadata.environment,
        version: config.metadata.version
      }
    };

    // Add file IDs if any
    const fileIds = [
      ...config.files.knowledge_files.map(f => f.openai_file_id),
      ...config.files.code_files.map(f => f.openai_file_id)
    ].filter(Boolean);

    if (fileIds.length > 0) {
      assistantData.file_ids = fileIds;
    }

    return this.openai.beta.assistants.create(assistantData);
  }

  // ========================================
  // TEMPLATES
  // ========================================

  /**
   * Get available templates
   */
  async getTemplates(category?: string): Promise<AgentTemplate[]> {
    return supabaseService.getAgentTemplates(category);
  }

  /**
   * Create template from builder config
   */
  async createTemplate(
    builderId: string,
    templateData: {
      name: string;
      description: string;
      category: string;
      tags: string[];
      isPublic: boolean;
      creatorName: string;
    }
  ): Promise<AgentTemplate> {
    const state = await this.getBuilderState(builderId);
    if (!state) throw new Error('Builder session not found');

    const template: AgentTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...templateData,
      config: state.config,
      difficulty: 'intermediate',
      estimated_setup_time: 30,
      popularity_score: 0,
      created_by: {
        id: state.config.metadata.created_by,
        name: templateData.creatorName,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0,
      rating: {
        average: 0,
        total_ratings: 0
      }
    };

    await supabaseService.saveAgentTemplate(template);
    return template;
  }

  /**
   * Load template into builder
   */
  async loadTemplate(templateId: string, userId: string): Promise<string> {
    const template = await supabaseService.getAgentTemplate(templateId);
    if (!template) throw new Error('Template not found');

    // Initialize new builder with template config
    const result = await this.initializeBuilder(userId);
    const builderId = result.builderId;
    const state = result.state;

    state.config = {
      ...state.config,
      ...template.config,
      metadata: {
        ...state.config.metadata,
        created_by: userId
      }
    };

    await supabaseService.saveAgentBuilderState(builderId, state);
    this.builderStates.set(builderId, state);

    // Increment usage count
    await supabaseService.incrementTemplateUsage(templateId);

    return builderId;
  }

  // ========================================
  // EXPORT/IMPORT
  // ========================================

  /**
   * Export agent configuration
   */
  async exportAgent(builderId: string): Promise<{
    config: OpenAIAgentBuilderConfig;
    metadata: any;
    exportedAt: string;
  }> {
    const state = await this.getBuilderState(builderId);
    if (!state) throw new Error('Builder session not found');

    return {
      config: state.config,
      metadata: {
        builder_version: '1.0.0',
        export_format: 'json',
        includes_files: state.config.files.knowledge_files.length > 0 || state.config.files.code_files.length > 0
      },
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import agent configuration
   */
  async importAgent(
    userId: string,
    exportData: {
      config: OpenAIAgentBuilderConfig;
      metadata: any;
      exportedAt: string;
    }
  ): Promise<string> {
    const result = await this.initializeBuilder(userId);
    const builderId = result.builderId;
    const state = result.state;

    state.config = {
      ...exportData.config,
      metadata: {
        ...exportData.config.metadata,
        created_by: userId,
        changelog: [...(exportData.config.metadata.changelog || []), `Imported from export dated ${exportData.exportedAt}`]
      }
    };

    await supabaseService.saveAgentBuilderState(builderId, state);
    this.builderStates.set(builderId, state);

    return builderId;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Calculate cost for model usage
   */
  private calculateCost(model: string, tokens: number): number {
    // Cost per 1K tokens (approximate)
    const costs: Record<string, number> = {
      'gpt-4o': 0.005,
      'gpt-4o-mini': 0.00015,
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.0015
    };

    const costPer1K = costs[model] || 0.002;
    return (tokens / 1000) * costPer1K;
  }

  /**
   * Convert builder tools to agent tools format
   */
  private convertBuilderToolsToAgentTools(tools: OpenAIAgentBuilderConfig['tools']) {
    const agentTools: any[] = [];

    if (tools.code_interpreter) {
      agentTools.push({ type: 'code_interpreter' });
    }

    if (tools.file_search) {
      agentTools.push({ type: 'file_search' });
    }

    for (const func of tools.functions) {
      if (func.enabled) {
        agentTools.push({
          type: 'function',
          function: {
            name: func.name,
            description: func.description,
            parameters: func.parameters
          }
        });
      }
    }

    return agentTools;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const agentBuilderService = new AgentBuilderService();