import OpenAI from 'openai';

export interface OpenAIModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  capabilities?: {
    vision?: boolean;
    function_calling?: boolean;
    reasoning?: boolean;
  };
  pricing?: {
    input_tokens_per_1k: number;
    output_tokens_per_1k: number;
  };
  context_window?: number;
  description?: string;
}

export interface ModelCategory {
  category: string;
  models: OpenAIModelInfo[];
  description: string;
}

class OpenAIModelsService {
  private openai: OpenAI;
  private modelsCache: OpenAIModelInfo[] | null = null;
  private lastFetch: number = 0;
  private cacheTimeout = 1000 * 60 * 60; // 1 hour cache

  constructor(apiKey?: string) {
    const key = apiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    this.openai = new OpenAI({ 
      apiKey: key,
      organization: process.env.EXPO_PUBLIC_OPENAI_ORGANIZATION,
      dangerouslyAllowBrowser: true
    });
  }

  /**
   * Fetches all available models from OpenAI API
   */
  async fetchAllModels(forceRefresh = false): Promise<OpenAIModelInfo[]> {
    const now = Date.now();
    
    // Return cached models if available and not expired
    if (!forceRefresh && this.modelsCache && (now - this.lastFetch < this.cacheTimeout)) {
      return this.modelsCache;
    }

    try {
      const response = await this.openai.models.list();
      
      // Filter and enhance model data
      const models: OpenAIModelInfo[] = response.data
        .filter((model: { id: string }) => model.id.includes('gpt') || model.id.includes('o3') || model.id.includes('o4'))
        .map((model: { id: string; object: string; created: number; owned_by: string }) => ({
          id: model.id,
          object: model.object,
          created: model.created,
          owned_by: model.owned_by,
          capabilities: this.getModelCapabilities(model.id),
          pricing: this.getModelPricing(model.id),
          context_window: this.getModelContextWindow(model.id),
          description: this.getModelDescription(model.id)
        }))
        .sort((a: OpenAIModelInfo, b: OpenAIModelInfo) => b.created - a.created); // Sort by newest first

      this.modelsCache = models;
      this.lastFetch = now;
      
      return models;
    } catch (error) {
      console.error('Failed to fetch OpenAI models:', error);
      
      // Return fallback models if API call fails
      return this.getFallbackModels();
    }
  }

  /**
   * Get models organized by categories
   */
  async getModelsByCategory(): Promise<ModelCategory[]> {
    const models = await this.fetchAllModels();
    
    const categories: ModelCategory[] = [
      {
        category: 'Reasoning Models (o-series)',
        description: 'Advanced reasoning models for complex problem-solving',
        models: models.filter(m => 
          m.id.includes('o3') || 
          m.id.includes('o4') || 
          m.id.includes('o1')
        )
      },
      {
        category: 'Latest GPT Models',
        description: 'Newest GPT models with enhanced capabilities',
        models: models.filter(m => 
          m.id.includes('gpt-4.5') || 
          m.id.includes('gpt-4.1') ||
          m.id.includes('gpt-4o')
        )
      },
      {
        category: 'GPT-4 Models',
        description: 'GPT-4 family models for general use',
        models: models.filter(m => 
          m.id.includes('gpt-4') && 
          !m.id.includes('gpt-4o') &&
          !m.id.includes('gpt-4.5') &&
          !m.id.includes('gpt-4.1')
        )
      },
      {
        category: 'GPT-3.5 Models',
        description: 'Cost-effective models for simpler tasks',
        models: models.filter(m => m.id.includes('gpt-3.5'))
      }
    ];

    return categories.filter(cat => cat.models.length > 0);
  }

  /**
   * Get just the model IDs for quick selection
   */
  async getAvailableModelIds(): Promise<string[]> {
    const models = await this.fetchAllModels();
    return models.map(m => m.id);
  }

  /**
   * Get model capabilities based on model ID
   */
  private getModelCapabilities(modelId: string): OpenAIModelInfo['capabilities'] {
    const capabilities: OpenAIModelInfo['capabilities'] = {
      vision: false,
      function_calling: true,
      reasoning: false
    };

    // Vision capabilities
    if (modelId.includes('vision') || modelId.includes('gpt-4o') || modelId.includes('gpt-4.5')) {
      capabilities.vision = true;
    }

    // Reasoning capabilities
    if (modelId.includes('o3') || modelId.includes('o4') || modelId.includes('o1')) {
      capabilities.reasoning = true;
    }

    // Function calling (most modern models support this)
    if (modelId.includes('gpt-3.5') || modelId.includes('gpt-4')) {
      capabilities.function_calling = true;
    }

    return capabilities;
  }

  /**
   * Get pricing information for models (in USD per 1K tokens)
   */
  private getModelPricing(modelId: string): OpenAIModelInfo['pricing'] {
    // Updated pricing as of January 2025 (approximate)
    const pricingMap: Record<string, OpenAIModelInfo['pricing']> = {
      'gpt-4.5': { input_tokens_per_1k: 0.01, output_tokens_per_1k: 0.03 },
      'gpt-4.1': { input_tokens_per_1k: 0.008, output_tokens_per_1k: 0.025 },
      'gpt-4o': { input_tokens_per_1k: 0.005, output_tokens_per_1k: 0.015 },
      'gpt-4o-mini': { input_tokens_per_1k: 0.00015, output_tokens_per_1k: 0.0006 },
      'gpt-4-turbo': { input_tokens_per_1k: 0.01, output_tokens_per_1k: 0.03 },
      'gpt-4': { input_tokens_per_1k: 0.03, output_tokens_per_1k: 0.06 },
      'gpt-3.5-turbo': { input_tokens_per_1k: 0.0015, output_tokens_per_1k: 0.002 },
      'o3-mini': { input_tokens_per_1k: 0.02, output_tokens_per_1k: 0.08 },
      'o4-mini': { input_tokens_per_1k: 0.015, output_tokens_per_1k: 0.06 }
    };

    // Find matching pricing
    for (const [modelPattern, pricing] of Object.entries(pricingMap)) {
      if (modelId.includes(modelPattern)) {
        return pricing;
      }
    }

    // Default pricing for unknown models
    return { input_tokens_per_1k: 0.01, output_tokens_per_1k: 0.03 };
  }

  /**
   * Get context window size for models
   */
  private getModelContextWindow(modelId: string): number {
    if (modelId.includes('gpt-4.5') || modelId.includes('gpt-4.1')) {
      return 1000000; // 1M tokens
    }
    if (modelId.includes('gpt-4o')) {
      return 128000; // 128K tokens
    }
    if (modelId.includes('gpt-4-turbo')) {
      return 128000;
    }
    if (modelId.includes('gpt-4')) {
      return 8192;
    }
    if (modelId.includes('gpt-3.5')) {
      return 16385;
    }
    if (modelId.includes('o3') || modelId.includes('o4')) {
      return 200000; // Reasoning models typically have large context
    }
    
    return 8192; // Default
  }

  /**
   * Get model description
   */
  private getModelDescription(modelId: string): string {
    if (modelId.includes('gpt-4.5')) {
      return 'Latest and most capable model with enhanced factual accuracy';
    }
    if (modelId.includes('gpt-4.1')) {
      return 'Advanced model with major improvements in coding and instruction following';
    }
    if (modelId.includes('gpt-4o-mini')) {
      return 'Cost-effective model with vision capabilities';
    }
    if (modelId.includes('gpt-4o')) {
      return 'Multimodal model with vision and text capabilities';
    }
    if (modelId.includes('gpt-4-turbo')) {
      return 'Fast and efficient GPT-4 variant';
    }
    if (modelId.includes('gpt-4')) {
      return 'Most capable GPT model for complex tasks';
    }
    if (modelId.includes('gpt-3.5')) {
      return 'Fast and cost-effective for simpler tasks';
    }
    if (modelId.includes('o3')) {
      return 'Advanced reasoning model for complex problem-solving';
    }
    if (modelId.includes('o4-mini')) {
      return 'Compact reasoning model for efficient problem-solving';
    }
    
    return 'OpenAI language model';
  }

  /**
   * Fallback models if API call fails
   */
  private getFallbackModels(): OpenAIModelInfo[] {
    return [
      {
        id: 'gpt-4.5',
        object: 'model',
        created: Date.now() / 1000,
        owned_by: 'openai',
        capabilities: { vision: true, function_calling: true, reasoning: false },
        pricing: { input_tokens_per_1k: 0.01, output_tokens_per_1k: 0.03 },
        context_window: 1000000,
        description: 'Latest and most capable model with enhanced factual accuracy'
      },
      {
        id: 'gpt-4.1',
        object: 'model',
        created: Date.now() / 1000,
        owned_by: 'openai',
        capabilities: { vision: true, function_calling: true, reasoning: false },
        pricing: { input_tokens_per_1k: 0.008, output_tokens_per_1k: 0.025 },
        context_window: 1000000,
        description: 'Advanced model with major improvements in coding and instruction following'
      },
      {
        id: 'o4-mini',
        object: 'model',
        created: Date.now() / 1000,
        owned_by: 'openai',
        capabilities: { vision: false, function_calling: true, reasoning: true },
        pricing: { input_tokens_per_1k: 0.015, output_tokens_per_1k: 0.06 },
        context_window: 200000,
        description: 'Compact reasoning model for efficient problem-solving'
      },
      {
        id: 'o3-mini',
        object: 'model',
        created: Date.now() / 1000,
        owned_by: 'openai',
        capabilities: { vision: false, function_calling: true, reasoning: true },
        pricing: { input_tokens_per_1k: 0.02, output_tokens_per_1k: 0.08 },
        context_window: 200000,
        description: 'Advanced reasoning model for complex problem-solving'
      },
      {
        id: 'gpt-4o',
        object: 'model',
        created: Date.now() / 1000,
        owned_by: 'openai',
        capabilities: { vision: true, function_calling: true, reasoning: false },
        pricing: { input_tokens_per_1k: 0.005, output_tokens_per_1k: 0.015 },
        context_window: 128000,
        description: 'Multimodal model with vision and text capabilities'
      },
      {
        id: 'gpt-4o-mini',
        object: 'model',
        created: Date.now() / 1000,
        owned_by: 'openai',
        capabilities: { vision: true, function_calling: true, reasoning: false },
        pricing: { input_tokens_per_1k: 0.00015, output_tokens_per_1k: 0.0006 },
        context_window: 128000,
        description: 'Cost-effective model with vision capabilities'
      }
    ];
  }
}

export const openaiModelsService = new OpenAIModelsService();