import { AgentTemplate, OpenAIAgentBuilderConfig } from '../types/openai';
import { supabaseService } from './supabase';
import { composioMCPService } from './composioMCP';
import { agentBuilderService } from './agentBuilder';

/**
 * Comprehensive AI Agent Templates Service
 * Provides pre-built agent templates with 1-click deployment
 */

export interface AgentTemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  templates: AgentTemplate[];
}

export interface OneClickAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  setup_time: number; // minutes
  features: string[];
  config: OpenAIAgentBuilderConfig;
  required_integrations?: string[];
  demo_conversation?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

class AgentTemplatesService {
  private templates: Map<string, AgentTemplate> = new Map();
  private categories: AgentTemplateCategory[] = [];
  private oneClickAgents: OneClickAgent[] = [];

  constructor() {
    this.initializeTemplates();
  }

  // ========================================
  // TEMPLATE INITIALIZATION
  // ========================================

  private initializeTemplates() {
    this.categories = [
      {
        id: 'productivity',
        name: 'Productivity',
        description: 'Agents that boost your daily productivity',
        icon: 'rocket',
        color: '#6366F1',
        templates: []
      },
      {
        id: 'business',
        name: 'Business',
        description: 'Business automation and analytics agents',
        icon: 'briefcase',
        color: '#10B981',
        templates: []
      },
      {
        id: 'development',
        name: 'Development',
        description: 'Code generation and development assistance',
        icon: 'code',
        color: '#F59E0B',
        templates: []
      },
      {
        id: 'research',
        name: 'Research',
        description: 'Research and data analysis agents',
        icon: 'search',
        color: '#EF4444',
        templates: []
      },
      {
        id: 'creative',
        name: 'Creative',
        description: 'Content creation and creative assistance',
        icon: 'brush',
        color: '#8B5CF6',
        templates: []
      },
      {
        id: 'support',
        name: 'Customer Support',
        description: 'Customer service and support agents',
        icon: 'headphones',
        color: '#06B6D4',
        templates: []
      }
    ];

    this.oneClickAgents = this.createOneClickAgents();
    this.createTemplateLibrary();
  }

  // ========================================
  // ONE-CLICK AGENTS
  // ========================================

  private createOneClickAgents(): OneClickAgent[] {
    return [
      // PRODUCTIVITY AGENTS
      {
        id: 'smart_assistant',
        name: 'Smart Personal Assistant',
        description: 'AI assistant that manages tasks, schedules, and provides intelligent reminders',
        category: 'productivity',
        icon: 'person-circle',
        difficulty: 'beginner',
        setup_time: 2,
        features: [
          'Task management',
          'Calendar integration',
          'Email management',
          'Smart reminders',
          'Web search'
        ],
        config: {
          step: 'deploy',
          basic: {
            name: 'Smart Personal Assistant',
            description: 'Your intelligent personal assistant for daily productivity',
            model: 'gpt-4o',
            category: 'assistant',
            tags: ['productivity', 'personal', 'tasks', 'calendar']
          },
          instructions: {
            system_prompt: `You are a smart personal assistant designed to help users manage their daily tasks and productivity. You can:

1. Manage tasks and to-do lists
2. Schedule appointments and meetings
3. Set reminders and notifications
4. Search the web for information
5. Draft emails and messages
6. Provide weather and news updates

Be proactive, friendly, and always look for ways to optimize the user's workflow. Ask clarifying questions when needed and provide actionable suggestions.`,
            personality: 'Friendly, efficient, and proactive. Always looking for ways to help optimize productivity.',
            goals: [
              'Help users stay organized and productive',
              'Automate routine tasks',
              'Provide timely reminders and updates',
              'Anticipate user needs'
            ],
            constraints: [
              'Always respect user privacy',
              'Never make commitments on behalf of the user without confirmation',
              'Provide accurate and up-to-date information'
            ],
            examples: [
              {
                input: 'I need to schedule a meeting with John tomorrow',
                output: 'I\'ll help you schedule that meeting with John. What time works best for you tomorrow? Also, how long should the meeting be, and would you like me to suggest some agenda items?',
                explanation: 'Proactively gathering details to properly schedule the meeting'
              }
            ]
          },
          tools: {
            code_interpreter: false,
            file_search: true,
            functions: []
          },
          files: {
            knowledge_files: [],
            code_files: [],
            vector_store_ids: []
          },
          advanced: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 2048,
            timeout_seconds: 30,
            max_retries: 3,
            fallback_behavior: 'default_response'
          },
          metadata: {
            created_by: 'system',
            environment: 'production',
            version: '1.0.0',
            changelog: ['Initial template creation']
          }
        },
        required_integrations: ['calendar', 'email', 'web_search'],
        demo_conversation: [
          {
            role: 'user',
            content: 'Hi! I have a busy day tomorrow. Can you help me organize it?'
          },
          {
            role: 'assistant',
            content: 'Absolutely! I\'d be happy to help you organize tomorrow. Let me start by checking your calendar. Could you tell me what meetings or appointments you already have scheduled, and what tasks you need to accomplish?'
          }
        ]
      },

      {
        id: 'email_manager',
        name: 'Email Management Pro',
        description: 'Intelligent email assistant that drafts, organizes, and responds to emails',
        category: 'productivity',
        icon: 'mail',
        difficulty: 'beginner',
        setup_time: 3,
        features: [
          'Email drafting',
          'Response suggestions',
          'Email categorization',
          'Priority inbox',
          'Auto-responses'
        ],
        config: {
          step: 'deploy',
          basic: {
            name: 'Email Management Pro',
            description: 'Professional email assistant for efficient communication',
            model: 'gpt-4o',
            category: 'assistant',
            tags: ['email', 'communication', 'productivity']
          },
          instructions: {
            system_prompt: `You are an expert email management assistant. Your role is to help users:

1. Draft professional and effective emails
2. Respond to emails with appropriate tone and content
3. Organize and categorize emails
4. Identify urgent or important messages
5. Suggest email templates and best practices
6. Manage email workflows and follow-ups

Maintain a professional tone while adapting to the user's communication style. Always ensure clarity, conciseness, and proper etiquette.`,
            personality: 'Professional, articulate, and efficient. Excellent written communication skills.',
            goals: [
              'Improve email communication quality',
              'Reduce time spent on email management',
              'Ensure professional and clear communication',
              'Organize email workflows effectively'
            ],
            constraints: [
              'Never send emails without user approval',
              'Respect confidentiality and privacy',
              'Follow email etiquette and best practices'
            ],
            examples: [
              {
                input: 'Help me write a follow-up email to a client about a delayed project',
                output: 'I\'ll help you draft a professional follow-up email. Could you provide me with: 1) The client\'s name, 2) The project details, 3) The reason for the delay, and 4) Your proposed new timeline? This will help me craft an appropriate message.',
                explanation: 'Gathering necessary context for a professional follow-up email'
              }
            ]
          },
          tools: {
            code_interpreter: false,
            file_search: true,
            functions: []
          },
          files: {
            knowledge_files: [],
            code_files: [],
            vector_store_ids: []
          },
          advanced: {
            temperature: 0.6,
            top_p: 0.8,
            max_tokens: 1024,
            timeout_seconds: 30,
            max_retries: 3,
            fallback_behavior: 'default_response'
          },
          metadata: {
            created_by: 'system',
            environment: 'production',
            version: '1.0.0',
            changelog: ['Initial template creation']
          }
        },
        required_integrations: ['email', 'calendar'],
        demo_conversation: [
          {
            role: 'user',
            content: 'I need to write a professional email declining a meeting invitation due to a scheduling conflict.'
          },
          {
            role: 'assistant',
            content: 'I\'ll help you draft a polite and professional decline email. Could you provide me with the meeting organizer\'s name and the reason for your scheduling conflict? I\'ll also suggest alternative times if you\'d like to reschedule.'
          }
        ]
      },

      // BUSINESS AGENTS
      {
        id: 'sales_analyst',
        name: 'Sales Analytics Expert',
        description: 'Advanced sales data analysis and forecasting agent',
        category: 'business',
        icon: 'trending-up',
        difficulty: 'intermediate',
        setup_time: 5,
        features: [
          'Sales performance analysis',
          'Revenue forecasting',
          'Customer insights',
          'Report generation',
          'KPI tracking'
        ],
        config: {
          step: 'deploy',
          basic: {
            name: 'Sales Analytics Expert',
            description: 'Expert sales analyst for data-driven business insights',
            model: 'gpt-4o',
            category: 'analyst',
            tags: ['sales', 'analytics', 'forecasting', 'business']
          },
          instructions: {
            system_prompt: `You are a senior sales analytics expert specializing in:

1. Sales performance analysis and reporting
2. Revenue forecasting and trend analysis
3. Customer behavior and segmentation analysis
4. KPI tracking and optimization recommendations
5. Market analysis and competitive insights
6. Data visualization and dashboard creation

Provide actionable insights backed by data analysis. Use statistical methods and business intelligence to drive recommendations.`,
            personality: 'Analytical, detail-oriented, and results-focused. Excellent at translating data into business insights.',
            goals: [
              'Provide accurate sales forecasts',
              'Identify growth opportunities',
              'Optimize sales performance',
              'Generate actionable business insights'
            ],
            constraints: [
              'Base recommendations on data evidence',
              'Explain methodology and assumptions',
              'Consider business context and constraints'
            ],
            examples: [
              {
                input: 'Analyze our Q3 sales performance compared to Q2',
                output: 'I\'ll analyze your Q3 vs Q2 sales performance. Please provide me with the sales data including revenue, units sold, customer acquisition, and any relevant product/region breakdowns. I\'ll examine trends, identify key drivers of change, and provide actionable insights.',
                explanation: 'Systematic approach to comparative sales analysis'
              }
            ]
          },
          tools: {
            code_interpreter: true,
            file_search: true,
            functions: []
          },
          files: {
            knowledge_files: [],
            code_files: [],
            vector_store_ids: []
          },
          advanced: {
            temperature: 0.3,
            top_p: 0.7,
            max_tokens: 3072,
            timeout_seconds: 60,
            max_retries: 3,
            fallback_behavior: 'default_response'
          },
          metadata: {
            created_by: 'system',
            environment: 'production',
            version: '1.0.0',
            changelog: ['Initial template creation']
          }
        },
        required_integrations: ['spreadsheets', 'crm', 'analytics'],
        demo_conversation: [
          {
            role: 'user',
            content: 'I need help forecasting next quarter\'s sales based on current trends.'
          },
          {
            role: 'assistant',
            content: 'I\'ll help you create an accurate sales forecast for next quarter. Please share your historical sales data (at least last 4-6 quarters), current pipeline data, and any known factors that might impact future sales like seasonality, marketing campaigns, or market changes.'
          }
        ]
      },

      // DEVELOPMENT AGENTS
      {
        id: 'code_reviewer',
        name: 'AI Code Reviewer',
        description: 'Expert code review and optimization assistant',
        category: 'development',
        icon: 'code-slash',
        difficulty: 'advanced',
        setup_time: 4,
        features: [
          'Code quality analysis',
          'Security vulnerability detection',
          'Performance optimization',
          'Best practices enforcement',
          'Documentation generation'
        ],
        config: {
          step: 'deploy',
          basic: {
            name: 'AI Code Reviewer',
            description: 'Expert code reviewer for quality and security',
            model: 'gpt-4o',
            category: 'coder',
            tags: ['code', 'review', 'security', 'optimization']
          },
          instructions: {
            system_prompt: `You are an expert code reviewer with deep knowledge across multiple programming languages and frameworks. Your expertise includes:

1. Code quality and maintainability analysis
2. Security vulnerability detection and mitigation
3. Performance optimization recommendations
4. Design pattern and architecture review
5. Documentation and commenting standards
6. Testing and error handling best practices

Provide detailed, actionable feedback with specific examples and improvement suggestions.`,
            personality: 'Thorough, constructive, and educational. Focus on helping developers improve their skills.',
            goals: [
              'Improve code quality and maintainability',
              'Identify and prevent security vulnerabilities',
              'Optimize performance and efficiency',
              'Educate developers on best practices'
            ],
            constraints: [
              'Provide constructive, not destructive criticism',
              'Explain the reasoning behind recommendations',
              'Consider project context and constraints'
            ],
            examples: [
              {
                input: 'Please review this Python function for potential issues',
                output: 'I\'ll thoroughly review your Python function for code quality, security, performance, and best practices. Please share the code and let me know the context of how it\'s used. I\'ll provide specific feedback with improvement suggestions.',
                explanation: 'Comprehensive code review approach'
              }
            ]
          },
          tools: {
            code_interpreter: true,
            file_search: true,
            functions: []
          },
          files: {
            knowledge_files: [],
            code_files: [],
            vector_store_ids: []
          },
          advanced: {
            temperature: 0.2,
            top_p: 0.6,
            max_tokens: 4096,
            timeout_seconds: 90,
            max_retries: 3,
            fallback_behavior: 'default_response'
          },
          metadata: {
            created_by: 'system',
            environment: 'production',
            version: '1.0.0',
            changelog: ['Initial template creation']
          }
        },
        required_integrations: ['github', 'code_analysis'],
        demo_conversation: [
          {
            role: 'user',
            content: 'Can you review this React component for performance and best practices?'
          },
          {
            role: 'assistant',
            content: 'Absolutely! I\'ll review your React component for performance optimization, best practices, and potential issues. Please share the component code, and let me know if there are any specific performance concerns or constraints I should consider.'
          }
        ]
      },

      // RESEARCH AGENTS
      {
        id: 'research_analyst',
        name: 'AI Research Analyst',
        description: 'Comprehensive research and analysis assistant',
        category: 'research',
        icon: 'library',
        difficulty: 'intermediate',
        setup_time: 4,
        features: [
          'Web research and analysis',
          'Report generation',
          'Data synthesis',
          'Citation management',
          'Trend analysis'
        ],
        config: {
          step: 'deploy',
          basic: {
            name: 'AI Research Analyst',
            description: 'Expert research analyst for comprehensive analysis',
            model: 'gpt-4o',
            category: 'researcher',
            tags: ['research', 'analysis', 'reports', 'data']
          },
          instructions: {
            system_prompt: `You are a professional research analyst with expertise in:

1. Comprehensive web research and information gathering
2. Data analysis and synthesis from multiple sources
3. Report writing and documentation
4. Market research and trend analysis
5. Academic and business research methodologies
6. Fact-checking and source verification

Provide well-researched, accurate, and actionable insights with proper citations and methodology.`,
            personality: 'Methodical, thorough, and objective. Strong analytical and critical thinking skills.',
            goals: [
              'Provide accurate and comprehensive research',
              'Synthesize information from multiple sources',
              'Generate actionable insights and recommendations',
              'Maintain high standards of research quality'
            ],
            constraints: [
              'Always cite sources and verify information',
              'Distinguish between facts and opinions',
              'Acknowledge limitations and uncertainties'
            ],
            examples: [
              {
                input: 'Research the current state of AI in healthcare',
                output: 'I\'ll conduct comprehensive research on AI in healthcare. I\'ll examine current applications, key players, market trends, regulatory considerations, and future prospects. Would you like me to focus on specific areas like diagnostic AI, drug discovery, or patient care automation?',
                explanation: 'Structured approach to comprehensive research'
              }
            ]
          },
          tools: {
            code_interpreter: true,
            file_search: true,
            functions: []
          },
          files: {
            knowledge_files: [],
            code_files: [],
            vector_store_ids: []
          },
          advanced: {
            temperature: 0.4,
            top_p: 0.8,
            max_tokens: 3072,
            timeout_seconds: 60,
            max_retries: 3,
            fallback_behavior: 'default_response'
          },
          metadata: {
            created_by: 'system',
            environment: 'production',
            version: '1.0.0',
            changelog: ['Initial template creation']
          }
        },
        required_integrations: ['web_search', 'academic_databases'],
        demo_conversation: [
          {
            role: 'user',
            content: 'I need a market analysis report on sustainable energy trends for 2024.'
          },
          {
            role: 'assistant',
            content: 'I\'ll create a comprehensive market analysis report on sustainable energy trends for 2024. I\'ll research current market data, growth projections, key technologies, major players, and regulatory impacts. Would you like me to focus on specific regions or energy types?'
          }
        ]
      },

      // CREATIVE AGENTS
      {
        id: 'content_creator',
        name: 'Creative Content Generator',
        description: 'AI-powered content creation for marketing and social media',
        category: 'creative',
        icon: 'create',
        difficulty: 'beginner',
        setup_time: 3,
        features: [
          'Blog post generation',
          'Social media content',
          'Marketing copy',
          'SEO optimization',
          'Brand voice adaptation'
        ],
        config: {
          step: 'deploy',
          basic: {
            name: 'Creative Content Generator',
            description: 'AI content creator for marketing and social media',
            model: 'gpt-4o',
            category: 'writer',
            tags: ['content', 'marketing', 'social', 'creative']
          },
          instructions: {
            system_prompt: `You are a creative content specialist with expertise in:

1. Blog post and article writing
2. Social media content creation
3. Marketing copy and advertisements
4. SEO-optimized content
5. Brand voice and tone adaptation
6. Content strategy and planning

Create engaging, original content that resonates with target audiences while maintaining brand consistency and SEO best practices.`,
            personality: 'Creative, engaging, and adaptable. Strong understanding of digital marketing and audience psychology.',
            goals: [
              'Create engaging and original content',
              'Optimize for search engines and social platforms',
              'Maintain consistent brand voice',
              'Drive audience engagement and conversions'
            ],
            constraints: [
              'Ensure content is original and plagiarism-free',
              'Follow platform-specific guidelines and best practices',
              'Respect copyright and intellectual property'
            ],
            examples: [
              {
                input: 'Create a LinkedIn post about the importance of AI in business',
                output: 'I\'ll create an engaging LinkedIn post about AI in business. Could you tell me your target audience (executives, entrepreneurs, etc.) and your company\'s perspective on AI? I\'ll craft content that\'s professional yet engaging, with appropriate hashtags and call-to-action.',
                explanation: 'Tailored content creation for specific platforms and audiences'
              }
            ]
          },
          tools: {
            code_interpreter: false,
            file_search: true,
            functions: []
          },
          files: {
            knowledge_files: [],
            code_files: [],
            vector_store_ids: []
          },
          advanced: {
            temperature: 0.8,
            top_p: 0.9,
            max_tokens: 2048,
            timeout_seconds: 45,
            max_retries: 3,
            fallback_behavior: 'default_response'
          },
          metadata: {
            created_by: 'system',
            environment: 'production',
            version: '1.0.0',
            changelog: ['Initial template creation']
          }
        },
        required_integrations: ['social_media', 'seo_tools'],
        demo_conversation: [
          {
            role: 'user',
            content: 'I need a series of Instagram posts for my fitness coaching business.'
          },
          {
            role: 'assistant',
            content: 'I\'d love to help create engaging Instagram content for your fitness coaching business! Could you share your brand voice, target audience, and key services? I\'ll create posts with engaging captions, relevant hashtags, and content pillars that drive engagement and attract clients.'
          }
        ]
      },

      // CUSTOMER SUPPORT AGENTS
      {
        id: 'support_specialist',
        name: 'AI Support Specialist',
        description: 'Intelligent customer support and help desk assistant',
        category: 'support',
        icon: 'help-circle',
        difficulty: 'intermediate',
        setup_time: 5,
        features: [
          '24/7 customer support',
          'Ticket management',
          'FAQ automation',
          'Escalation handling',
          'Knowledge base integration'
        ],
        config: {
          step: 'deploy',
          basic: {
            name: 'AI Support Specialist',
            description: 'Intelligent customer support assistant',
            model: 'gpt-4o',
            category: 'assistant',
            tags: ['support', 'customer', 'help', 'service']
          },
          instructions: {
            system_prompt: `You are a professional customer support specialist with expertise in:

1. Resolving customer inquiries and technical issues
2. Managing support tickets and escalations
3. Providing product information and guidance
4. Handling complaints with empathy and professionalism
5. Accessing and utilizing knowledge base resources
6. Following company policies and procedures

Provide helpful, accurate, and empathetic support while maintaining a positive customer experience.`,
            personality: 'Patient, empathetic, and solution-oriented. Excellent communication and problem-solving skills.',
            goals: [
              'Resolve customer issues quickly and effectively',
              'Maintain high customer satisfaction',
              'Provide accurate product information',
              'Follow up on outstanding issues'
            ],
            constraints: [
              'Never make promises beyond company capabilities',
              'Escalate complex issues to human agents when appropriate',
              'Protect customer privacy and data'
            ],
            examples: [
              {
                input: 'My account is locked and I can\'t access my dashboard',
                output: 'I understand how frustrating that must be! I\'m here to help you regain access to your account. Let me gather some information to assist you safely. Could you please provide your registered email address? I\'ll also need to verify your identity before proceeding.',
                explanation: 'Empathetic response with security-conscious verification process'
              }
            ]
          },
          tools: {
            code_interpreter: false,
            file_search: true,
            functions: []
          },
          files: {
            knowledge_files: [],
            code_files: [],
            vector_store_ids: []
          },
          advanced: {
            temperature: 0.5,
            top_p: 0.8,
            max_tokens: 1536,
            timeout_seconds: 30,
            max_retries: 3,
            fallback_behavior: 'escalate'
          },
          metadata: {
            created_by: 'system',
            environment: 'production',
            version: '1.0.0',
            changelog: ['Initial template creation']
          }
        },
        required_integrations: ['helpdesk', 'knowledge_base', 'crm'],
        demo_conversation: [
          {
            role: 'user',
            content: 'I\'m having trouble with my billing. I was charged twice this month.'
          },
          {
            role: 'assistant',
            content: 'I\'m sorry to hear about the billing issue - that\'s definitely concerning and I\'m here to help resolve this quickly. Let me look into your account. Could you please provide your account email or customer ID? I\'ll investigate the charges and make sure we get this sorted out for you.'
          }
        ]
      }
    ];
  }

  // ========================================
  // TEMPLATE LIBRARY CREATION
  // ========================================

  private createTemplateLibrary() {
    // Convert one-click agents to templates and organize by category
    this.oneClickAgents.forEach(agent => {
      const template: AgentTemplate = {
        id: `template_${agent.id}`,
        name: agent.name,
        description: agent.description,
        category: agent.category,
        thumbnail: `https://api.dicebear.com/7.x/icons/svg?icon=${agent.icon}`,
        config: agent.config,
        tags: agent.config.basic.tags,
        difficulty: agent.difficulty,
        estimated_setup_time: agent.setup_time,
        popularity_score: Math.floor(Math.random() * 100),
        created_by: {
          id: 'system',
          name: 'System Templates',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: Math.floor(Math.random() * 1000),
        rating: {
          average: 4.2 + Math.random() * 0.7,
          total_ratings: Math.floor(Math.random() * 50) + 10
        }
      };

      this.templates.set(template.id, template);

      // Add to appropriate category
      const categoryIndex = this.categories.findIndex(cat => cat.id === agent.category);
      if (categoryIndex !== -1) {
        this.categories[categoryIndex].templates.push(template);
      }
    });
  }

  // ========================================
  // PUBLIC METHODS
  // ========================================

  /**
   * Get all template categories
   */
  getCategories(): AgentTemplateCategory[] {
    return this.categories;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(categoryId: string): AgentTemplate[] {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category?.templates || [];
  }

  /**
   * Get one-click agents
   */
  getOneClickAgents(category?: string): OneClickAgent[] {
    if (category) {
      return this.oneClickAgents.filter(agent => agent.category === category);
    }
    return this.oneClickAgents;
  }

  /**
   * Get featured templates
   */
  getFeaturedTemplates(limit = 6): AgentTemplate[] {
    const allTemplates = Array.from(this.templates.values());
    return allTemplates
      .sort((a, b) => b.popularity_score - a.popularity_score)
      .slice(0, limit);
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): AgentTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(template =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): AgentTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Get one-click agent by ID
   */
  getOneClickAgent(id: string): OneClickAgent | null {
    return this.oneClickAgents.find(agent => agent.id === id) || null;
  }

  /**
   * Deploy one-click agent
   */
  async deployOneClickAgent(
    agentId: string, 
    userId: string,
    customizations?: Partial<OpenAIAgentBuilderConfig>
  ): Promise<string> {
    console.log('🔄 deployOneClickAgent called with:', { agentId, userId });
    
    const agent = this.getOneClickAgent(agentId);
    if (!agent) {
      console.error('❌ Agent template not found:', agentId);
      throw new Error('Agent template not found');
    }

    console.log('✅ Found agent template:', agent.name);

    try {
      // Create agent configuration with customizations
      const config = {
        ...agent.config,
        ...customizations,
        metadata: {
          ...agent.config.metadata,
          created_by: userId,
          template_id: agentId,
          deployed_from_template: true
        }
      };

      console.log('✅ Agent configuration created');

      // Set up required integrations
      if (agent.required_integrations?.length) {
        console.log('🔄 Setting up required integrations:', agent.required_integrations);
        await this.setupRequiredIntegrations(agent.required_integrations, userId);
      }

      // Use agent builder service to create the agent
      console.log('🔄 Initializing agent builder...');
      const result = await agentBuilderService.initializeBuilder(userId);
      const builderId = result.builderId;
      const builderState = result.state;
      
      console.log('✅ Agent builder initialized:', builderId);

      // Set the configuration
      builderState.config = config;
      
      // Validate the configuration to ensure deployment will succeed
      console.log('🔄 Validating configuration...');
      await agentBuilderService.updateBuilderStep(builderId, 'deploy', config);

      console.log('✅ Configuration validated');

      // Deploy the agent
      console.log('🔄 Deploying agent...');
      const deployment = await agentBuilderService.deployAgent(builderId);

      console.log('✅ Agent deployed successfully:', deployment.agent_id);

      // Log template usage
      await this.logTemplateUsage(agentId, userId);

      return deployment.agent_id;
    } catch (error) {
      console.error('❌ Error deploying one-click agent:', error);
      throw error;
    }
  }

  /**
   * Setup required integrations for agent
   */
  private async setupRequiredIntegrations(
    integrations: string[],
    userId: string
  ): Promise<void> {
    for (const integration of integrations) {
      try {
        switch (integration) {
          case 'web_search':
            await composioMCPService.connectToServer('web_search');
            break;
          case 'email':
            await composioMCPService.connectToServer('gmail');
            break;
          case 'calendar':
            await composioMCPService.connectToServer('googlecalendar');
            break;
          case 'github':
            await composioMCPService.connectToServer('github');
            break;
          case 'spreadsheets':
            await composioMCPService.connectToServer('googlesheets');
            break;
          case 'social_media':
            await composioMCPService.connectToServer('twitter');
            await composioMCPService.connectToServer('linkedin');
            break;
          default:
            console.warn(`Unknown integration: ${integration}`);
        }
      } catch (error) {
        console.warn(`Failed to setup integration ${integration}:`, error);
      }
    }
  }

  /**
   * Log template usage
   */
  private async logTemplateUsage(templateId: string, userId: string): Promise<void> {
    try {
      await supabaseService.logTemplateUsage({
        template_id: templateId,
        user_id: userId,
        deployment_type: 'one_click',
        timestamp: new Date().toISOString()
      });

      // Increment usage count
      const template = this.templates.get(`template_${templateId}`);
      if (template) {
        template.usage_count += 1;
        this.templates.set(`template_${templateId}`, template);
      }
    } catch (error) {
      console.error('Error logging template usage:', error);
    }
  }

  /**
   * Get template analytics
   */
  async getTemplateAnalytics(templateId?: string) {
    try {
      if (templateId) {
        return await supabaseService.getTemplateAnalytics(templateId);
      } else {
        return await supabaseService.getAllTemplateAnalytics();
      }
    } catch (error) {
      console.error('Error fetching template analytics:', error);
      return null;
    }
  }
}

export const agentTemplatesService = new AgentTemplatesService();