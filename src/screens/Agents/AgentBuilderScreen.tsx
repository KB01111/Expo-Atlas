import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  Switch,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Button, Modal, StatusBadge, AnimatedView } from '../../components/ui';
import { MotiView } from '../../components/animations';
import { createSharedStyles } from '../../styles/shared';
import { agentBuilderService } from '../../services/agentBuilder';
import { openaiModelsService } from '../../services/openaiModels';
import { openaiAgentsComplete } from '../../services/openaiAgentsComplete';
import { supabaseService } from '../../services/supabase';
import { 
  OpenAIAgentBuilderConfig, 
  AgentBuilderState, 
  CustomFunction,
  AgentFile,
  AgentTemplate,
  OpenAIFile,
  OpenAIVectorStore,
  AgentTestConversation,
  AgentTestMetrics,
  OpenAIAgentConfig
} from '../../types/openai';
import { AppTheme } from '../../types';
import MCPToolsPanel from '../../components/mcp/MCPToolsPanel';

const { width } = Dimensions.get('window');

interface AgentBuilderScreenProps {
  route?: {
    params?: {
      templateId?: string;
      builderId?: string;
    };
  };
  navigation?: any;
}

const AgentBuilderScreen: React.FC<AgentBuilderScreenProps> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const sharedStyles = createSharedStyles(theme);

  // Builder State
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [builderState, setBuilderState] = useState<AgentBuilderState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Current Step State
  const [currentStep, setCurrentStep] = useState<OpenAIAgentBuilderConfig['step']>('basic');
  
  // Form State
  const [basicForm, setBasicForm] = useState({
    name: '',
    description: '',
    model: 'gpt-4o',
    category: 'assistant' as 'assistant' | 'analyst' | 'writer' | 'coder' | 'researcher' | 'custom',
    tags: [] as string[],
  });

  const [instructionsForm, setInstructionsForm] = useState({
    system_prompt: '',
    personality: '',
    goals: [] as string[],
    constraints: [] as string[],
    examples: [] as Array<{ input: string; output: string; explanation: string }>,
  });

  const [toolsForm, setToolsForm] = useState({
    code_interpreter: false,
    file_search: false,
    functions: [] as CustomFunction[],
    parallel_tool_calls: true,
    tool_choice: 'auto' as 'auto' | 'none' | 'required',
  });

  const [filesForm, setFilesForm] = useState({
    knowledge_files: [] as AgentFile[],
    code_files: [] as AgentFile[],
    vector_store_ids: [] as string[],
  });

  const [advancedForm, setAdvancedForm] = useState({
    temperature: 0.7,
    top_p: 1.0,
    max_tokens: 4096,
    max_completion_tokens: 4096,
    max_prompt_tokens: 32000,
    response_format: 'text' as 'text' | 'json_object',
    timeout_seconds: 60,
    max_retries: 3,
    fallback_behavior: 'error' as 'error' | 'default_response' | 'escalate',
    frequency_penalty: 0,
    presence_penalty: 0,
    seed: undefined as number | undefined,
  });

  // UI State
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [modelCategories, setModelCategories] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [newConstraint, setNewConstraint] = useState('');
  const [newTag, setNewTag] = useState('');
  
  // Enhanced Features State
  const [uploadedFiles, setUploadedFiles] = useState<OpenAIFile[]>([]);
  const [vectorStores, setVectorStores] = useState<OpenAIVectorStore[]>([]);
  const [testConversations, setTestConversations] = useState<AgentTestConversation[]>([]);
  const [testMetrics, setTestMetrics] = useState<AgentTestMetrics | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [isCreatingVectorStore, setIsCreatingVectorStore] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    initializeBuilder();
    loadAvailableModels();
    loadTemplates();
  }, []);

  const initializeBuilder = async () => {
    try {
      setLoading(true);
      
      let state: AgentBuilderState;
      let id: string;

      if (route?.params?.builderId) {
        // Load existing builder
        const existingState = await agentBuilderService.getBuilderState(route.params.builderId);
        if (existingState) {
          state = existingState;
          id = route.params.builderId;
        } else {
          throw new Error('Builder session not found');
        }
      } else if (route?.params?.templateId) {
        // Load from template
        id = await agentBuilderService.loadTemplate(route.params.templateId, 'current_user'); // TODO: Get from auth
        const templateState = await agentBuilderService.getBuilderState(id);
        if (!templateState) throw new Error('Failed to load template');
        state = templateState;
      } else {
        // Initialize new builder
        const result = await agentBuilderService.initializeBuilder('current_user'); // TODO: Get from auth
        state = result.state;
        id = result.builderId;
      }

      setBuilderId(id);
      setBuilderState(state);
      setCurrentStep(state.config.step);
      loadFormStates(state.config);
    } catch (error) {
      console.error('Error initializing builder:', error);
      Alert.alert('Error', 'Failed to initialize agent builder');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableModels = async () => {
    try {
      const [models, categories] = await Promise.all([
        openaiModelsService.fetchAllModels(),
        openaiModelsService.getModelsByCategory()
      ]);
      setAvailableModels(models);
      setModelCategories(categories);
    } catch (error) {
      console.error('Error loading models:', error);
      // Set fallback models
      setAvailableModels([
        { id: 'gpt-4.5', description: 'Latest and most capable model', capabilities: { vision: true, reasoning: false } },
        { id: 'gpt-4.1', description: 'Advanced model with improved capabilities', capabilities: { vision: true, reasoning: false } },
        { id: 'o4-mini', description: 'Compact reasoning model', capabilities: { vision: false, reasoning: true } },
        { id: 'o3-mini', description: 'Advanced reasoning model', capabilities: { vision: false, reasoning: true } },
        { id: 'gpt-4o', description: 'Multimodal model with vision', capabilities: { vision: true, reasoning: false } },
        { id: 'gpt-4o-mini', description: 'Cost-effective vision model', capabilities: { vision: true, reasoning: false } }
      ]);
      setModelCategories([]);
    }
  };

  const loadTemplates = async () => {
    try {
      const templateList = await agentBuilderService.getTemplates();
      setTemplates(templateList);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadFormStates = (config: OpenAIAgentBuilderConfig) => {
    setBasicForm(config.basic);
    setInstructionsForm(config.instructions);
    setToolsForm(config.tools);
    setFilesForm(config.files);
    setAdvancedForm(config.advanced);
  };

  const saveCurrentStep = async () => {
    if (!builderId || !builderState) return;

    try {
      setSaving(true);

      const updateData: Partial<OpenAIAgentBuilderConfig> = {
        step: currentStep,
      };

      switch (currentStep) {
        case 'basic':
          updateData.basic = basicForm;
          break;
        case 'instructions':
          updateData.instructions = instructionsForm;
          break;
        case 'tools':
          updateData.tools = toolsForm;
          break;
        case 'files':
          updateData.files = filesForm;
          break;
        case 'advanced':
          updateData.advanced = advancedForm;
          break;
      }

      const updatedState = await agentBuilderService.updateBuilderStep(builderId, currentStep, updateData);
      setBuilderState(updatedState);
    } catch (error) {
      console.error('Error saving step:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const navigateToStep = async (step: OpenAIAgentBuilderConfig['step']) => {
    await saveCurrentStep();
    setCurrentStep(step);
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      setInstructionsForm(prev => ({
        ...prev,
        goals: [...prev.goals, newGoal.trim()]
      }));
      setNewGoal('');
    }
  };

  const removeGoal = (index: number) => {
    setInstructionsForm(prev => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index)
    }));
  };

  const addConstraint = () => {
    if (newConstraint.trim()) {
      setInstructionsForm(prev => ({
        ...prev,
        constraints: [...prev.constraints, newConstraint.trim()]
      }));
      setNewConstraint('');
    }
  };

  const removeConstraint = (index: number) => {
    setInstructionsForm(prev => ({
      ...prev,
      constraints: prev.constraints.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !basicForm.tags.includes(newTag.trim())) {
      setBasicForm(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setBasicForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  // Enhanced File Management Functions
  const uploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setIsFileUploading(true);

      // Create a File object from the asset
      const file = {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
        size: asset.size,
      } as any;

      // Upload to OpenAI
      const uploadedFile = await openaiAgentsComplete.uploadFile(file, {
        purpose: 'assistants',
        filename: asset.name,
        description: `Knowledge file for agent: ${basicForm.name}`,
        file_type: 'document',
      });

      // Save to Supabase
      await supabaseService.saveOpenAIFile(uploadedFile);

      setUploadedFiles(prev => [...prev, uploadedFile]);
      
      // Add to builder config
      const agentFile: AgentFile = {
        id: uploadedFile.id,
        name: uploadedFile.filename,
        type: 'knowledge',
        size_bytes: uploadedFile.bytes,
        mime_type: asset.mimeType || 'application/octet-stream',
        openai_file_id: uploadedFile.id,
        processing_status: 'completed',
        metadata: {
          upload_source: 'local',
          tags: [],
          auto_update: false,
          last_modified: new Date().toISOString(),
        },
      };

      setFilesForm(prev => ({
        ...prev,
        knowledge_files: [...prev.knowledge_files, agentFile]
      }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('File upload failed:', error);
      Alert.alert('Upload Failed', 'Failed to upload file. Please try again.');
    } finally {
      setIsFileUploading(false);
    }
  };

  const createVectorStore = async () => {
    if (filesForm.knowledge_files.length === 0) {
      Alert.alert('No Files', 'Please upload some files first.');
      return;
    }

    setIsCreatingVectorStore(true);
    try {
      const vectorStore = await openaiAgentsComplete.createVectorStore({
        name: `${basicForm.name} Knowledge Base`,
        file_ids: filesForm.knowledge_files
          .filter(f => f.openai_file_id)
          .map(f => f.openai_file_id!),
      });

      await supabaseService.saveOpenAIVectorStore(vectorStore);
      setVectorStores(prev => [...prev, vectorStore]);
      
      setFilesForm(prev => ({
        ...prev,
        vector_store_ids: [...prev.vector_store_ids, vectorStore.id]
      }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Vector store creation failed:', error);
      Alert.alert('Creation Failed', 'Failed to create vector store. Please try again.');
    } finally {
      setIsCreatingVectorStore(false);
    }
  };

  const testAgent = async () => {
    setIsTesting(true);
    try {
      // Create a temporary agent for testing
      const testConfig: OpenAIAgentConfig = {
        name: `${basicForm.name} (Test)`,
        description: basicForm.description,
        instructions: instructionsForm.system_prompt,
        model: basicForm.model,
        tools: [],
        temperature: advancedForm.temperature,
        top_p: advancedForm.top_p,
        max_tokens: advancedForm.max_tokens,
      };

      if (toolsForm.code_interpreter) {
        testConfig.tools!.push({ type: 'code_interpreter' });
      }
      if (toolsForm.file_search) {
        testConfig.tools!.push({ type: 'file_search' });
      }

      const testAgent = await openaiAgentsComplete.createAgent(testConfig);
      
      // Run test conversations
      const testPrompts = [
        'Hello, can you introduce yourself?',
        'What are your main capabilities?',
        'How can you help me?',
      ];

      const conversations: AgentTestConversation[] = [];
      
      for (const prompt of testPrompts) {
        const startTime = Date.now();
        try {
          const execution = await openaiAgentsComplete.executeAgent(testAgent.id, prompt);
          const endTime = Date.now();

          conversations.push({
            id: `test_${Date.now()}_${Math.random()}`,
            name: `Test: ${prompt.slice(0, 30)}...`,
            messages: [
              { role: 'user', content: prompt, timestamp: new Date(startTime).toISOString() },
              { role: 'assistant', content: execution.output, timestamp: new Date(endTime).toISOString() },
            ],
            metrics: {
              response_time_ms: endTime - startTime,
              tokens_used: execution.tokensUsed,
              cost: execution.cost,
            },
            status: 'completed',
            created_at: new Date().toISOString(),
          });
        } catch (error) {
          conversations.push({
            id: `test_${Date.now()}_${Math.random()}`,
            name: `Test: ${prompt.slice(0, 30)}... (Failed)`,
            messages: [
              { role: 'user', content: prompt, timestamp: new Date().toISOString() },
            ],
            metrics: {
              response_time_ms: 0,
              tokens_used: 0,
              cost: 0,
            },
            status: 'failed',
            created_at: new Date().toISOString(),
          });
        }
      }

      setTestConversations(conversations);
      
      // Calculate metrics
      const metrics: AgentTestMetrics = {
        total_tests: conversations.length,
        passed_tests: conversations.filter(c => c.status === 'completed').length,
        failed_tests: conversations.filter(c => c.status === 'failed').length,
        average_response_time: conversations.reduce((sum, c) => sum + c.metrics.response_time_ms, 0) / conversations.length,
        average_cost_per_interaction: conversations.reduce((sum, c) => sum + c.metrics.cost, 0) / conversations.length,
        total_tokens_used: conversations.reduce((sum, c) => sum + c.metrics.tokens_used, 0),
        success_rate: (conversations.filter(c => c.status === 'completed').length / conversations.length) * 100,
        common_failures: [],
      };

      setTestMetrics(metrics);

      // Clean up test agent
      await openaiAgentsComplete.deleteAgent(testAgent.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Agent testing failed:', error);
      Alert.alert('Test Failed', 'Failed to test agent. Please check your configuration.');
    } finally {
      setIsTesting(false);
    }
  };

  const deployAgent = async () => {
    try {
      setSaving(true);
      await saveCurrentStep();
      
      // Build final agent configuration using OpenAI SDK
      const finalConfig: OpenAIAgentConfig = {
        name: basicForm.name,
        description: basicForm.description,
        instructions: instructionsForm.system_prompt,
        model: basicForm.model,
        tools: [],
        tool_resources: {},
        temperature: advancedForm.temperature,
        top_p: advancedForm.top_p,
        max_tokens: advancedForm.max_tokens,
        max_completion_tokens: advancedForm.max_completion_tokens,
        max_prompt_tokens: advancedForm.max_prompt_tokens,
        response_format: advancedForm.response_format === 'text' ? 'text' : 'json_object',
        parallel_tool_calls: toolsForm.parallel_tool_calls,
        metadata: {
          category: basicForm.category,
          tags: basicForm.tags,
          personality: instructionsForm.personality,
          goals: instructionsForm.goals,
          constraints: instructionsForm.constraints,
          tool_choice: toolsForm.tool_choice,
          frequency_penalty: advancedForm.frequency_penalty,
          presence_penalty: advancedForm.presence_penalty,
          seed: advancedForm.seed,
          created_with: 'expo-atlas-agent-builder',
          created_at: new Date().toISOString(),
        },
      };

      // Add tools
      if (toolsForm.code_interpreter) {
        finalConfig.tools!.push({ type: 'code_interpreter' });
      }
      if (toolsForm.file_search) {
        finalConfig.tools!.push({ type: 'file_search' });
        if (filesForm.vector_store_ids.length > 0) {
          finalConfig.tool_resources!.file_search = {
            vector_store_ids: filesForm.vector_store_ids,
          };
        }
      }

      // Add custom functions
      toolsForm.functions.forEach(func => {
        finalConfig.tools!.push({
          type: 'function',
          function: {
            name: func.name,
            description: func.description,
            parameters: func.parameters,
          },
        });
      });

      // Create the agent via OpenAI
      const deployedAgent = await openaiAgentsComplete.createAgent(finalConfig);
      
      // Save via agent builder service if available
      if (builderId) {
        await agentBuilderService.deployAgent(builderId, 'production');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Agent Deployed Successfully!',
        `Your agent "${basicForm.name}" has been deployed and is ready to use.`,
        [
          { text: 'View Agent', onPress: () => navigation?.navigate('Agents') },
          { text: 'OK', style: 'default' }
        ]
      );
    } catch (error) {
      console.error('Error deploying agent:', error);
      Alert.alert('Deployment Failed', 'Failed to deploy agent. Please check your configuration.');
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'basic', label: 'Basic', icon: 'information-circle' },
      { key: 'instructions', label: 'Instructions', icon: 'document-text' },
      { key: 'tools', label: 'Tools', icon: 'build' },
      { key: 'files', label: 'Files', icon: 'folder' },
      { key: 'advanced', label: 'Advanced', icon: 'settings' },
      { key: 'test', label: 'Test', icon: 'flask' },
      { key: 'deploy', label: 'Deploy', icon: 'rocket' },
    ];

    return (
      <View style={styles.stepIndicator}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.stepsList}>
            {steps.map((step, index) => {
              const isActive = step.key === currentStep;
              const isCompleted = steps.findIndex(s => s.key === currentStep) > index;

              return (
                <TouchableOpacity
                  key={step.key}
                  style={[
                    styles.stepItem,
                    isActive && styles.stepItemActive,
                    isCompleted && styles.stepItemCompleted
                  ]}
                  onPress={() => navigateToStep(step.key as OpenAIAgentBuilderConfig['step'])}
                >
                  <View style={[
                    styles.stepIcon,
                    isActive && styles.stepIconActive,
                    isCompleted && styles.stepIconCompleted
                  ]}>
                    <Ionicons 
                      name={step.icon as any} 
                      size={16} 
                      color={isActive || isCompleted ? '#FFFFFF' : theme.colors.textSecondary} 
                    />
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive
                  ]}>
                    {step.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderBasicStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepDescription}>
        Define the fundamental properties of your AI agent
      </Text>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Agent Name *</Text>
        <TextInput
          style={styles.formInput}
          value={basicForm.name}
          onChangeText={(text) => setBasicForm(prev => ({ ...prev, name: text }))}
          placeholder="Enter a descriptive name for your agent"
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Description *</Text>
        <TextInput
          style={[styles.formInput, styles.formInputMultiline]}
          value={basicForm.description}
          onChangeText={(text) => setBasicForm(prev => ({ ...prev, description: text }))}
          placeholder="Describe what your agent does and its purpose"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Model *</Text>
        <Text style={styles.formHelp}>
          Choose the AI model that best fits your agent's requirements
        </Text>
        
        {modelCategories.length > 0 ? (
          // Render categorized models
          modelCategories.map((category) => (
            <View key={category.category} style={styles.modelCategory}>
              <Text style={styles.modelCategoryTitle}>{category.category}</Text>
              <Text style={styles.modelCategoryDescription}>{category.description}</Text>
              <View style={styles.modelGrid}>
                {category.models.map((model: any) => (
                  <TouchableOpacity
                    key={model.id}
                    style={[
                      styles.modelCard,
                      basicForm.model === model.id && styles.modelCardSelected
                    ]}
                    onPress={() => setBasicForm(prev => ({ ...prev, model: model.id }))}
                  >
                    <View style={styles.modelCardHeader}>
                      <Text style={[
                        styles.modelCardTitle,
                        basicForm.model === model.id && styles.modelCardTitleSelected
                      ]}>
                        {model.id}
                      </Text>
                      <View style={styles.modelCapabilities}>
                        {model.capabilities?.vision && (
                          <View style={styles.capabilityBadge}>
                            <Ionicons name="eye" size={12} color={theme.colors.primary} />
                            <Text style={styles.capabilityText}>Vision</Text>
                          </View>
                        )}
                        {model.capabilities?.reasoning && (
                          <View style={styles.capabilityBadge}>
                            <Ionicons name="bulb" size={12} color={theme.colors.secondary} />
                            <Text style={styles.capabilityText}>Reasoning</Text>
                          </View>
                        )}
                        {model.capabilities?.function_calling && (
                          <View style={styles.capabilityBadge}>
                            <Ionicons name="code" size={12} color={theme.colors.success} />
                            <Text style={styles.capabilityText}>Functions</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.modelCardDescription}>
                      {model.description}
                    </Text>
                    {model.pricing && (
                      <View style={styles.modelPricing}>
                        <Text style={styles.pricingText}>
                          ${model.pricing.input_tokens_per_1k}/1K in • ${model.pricing.output_tokens_per_1k}/1K out
                        </Text>
                        <Text style={styles.contextWindow}>
                          {model.context_window ? `${(model.context_window / 1000).toFixed(0)}K context` : ''}
                        </Text>
                      </View>
                    )}
                    {basicForm.model === model.id && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        ) : (
          // Fallback to simple model list
          <View style={styles.modelGrid}>
            {availableModels.slice(0, 6).map((model) => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelCard,
                  basicForm.model === model.id && styles.modelCardSelected
                ]}
                onPress={() => setBasicForm(prev => ({ ...prev, model: model.id }))}
              >
                <Text style={[
                  styles.modelCardTitle,
                  basicForm.model === model.id && styles.modelCardTitleSelected
                ]}>
                  {model.id}
                </Text>
                <Text style={styles.modelCardDescription}>
                  {model.description}
                </Text>
                {model.capabilities && (
                  <View style={styles.modelCapabilities}>
                    {model.capabilities.vision && (
                      <View style={styles.capabilityBadge}>
                        <Ionicons name="eye" size={12} color={theme.colors.primary} />
                        <Text style={styles.capabilityText}>Vision</Text>
                      </View>
                    )}
                    {model.capabilities.reasoning && (
                      <View style={styles.capabilityBadge}>
                        <Ionicons name="bulb" size={12} color={theme.colors.secondary} />
                        <Text style={styles.capabilityText}>Reasoning</Text>
                      </View>
                    )}
                  </View>
                )}
                {basicForm.model === model.id && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categorySelector}>
            {(['assistant', 'analyst', 'writer', 'coder', 'researcher', 'custom'] as const).map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryOption,
                  basicForm.category === category && styles.categoryOptionSelected
                ]}
                onPress={() => setBasicForm(prev => ({ ...prev, category }))}
              >
                <Ionicons 
                  name={getCategoryIcon(category)} 
                  size={20} 
                  color={basicForm.category === category ? '#FFFFFF' : theme.colors.text} 
                />
                <Text style={[
                  styles.categoryOptionText,
                  basicForm.category === category && styles.categoryOptionTextSelected
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Tags</Text>
        <View style={styles.tagInput}>
          <TextInput
            style={styles.tagInputField}
            value={newTag}
            onChangeText={setNewTag}
            placeholder="Add tags to categorize your agent"
            placeholderTextColor={theme.colors.textSecondary}
            onSubmitEditing={addTag}
          />
          <TouchableOpacity style={styles.tagAddButton} onPress={addTag}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.tagsList}>
          {basicForm.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(tag)}>
                <Ionicons name="close" size={16} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderInstructionsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Instructions & Behavior</Text>
      <Text style={styles.stepDescription}>
        Define how your agent should behave and respond
      </Text>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>System Prompt *</Text>
        <TextInput
          style={[styles.formInput, styles.formInputLarge]}
          value={instructionsForm.system_prompt}
          onChangeText={(text) => setInstructionsForm(prev => ({ ...prev, system_prompt: text }))}
          placeholder="Enter detailed instructions for your agent's behavior, role, and capabilities..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Personality</Text>
        <TextInput
          style={[styles.formInput, styles.formInputMultiline]}
          value={instructionsForm.personality}
          onChangeText={(text) => setInstructionsForm(prev => ({ ...prev, personality: text }))}
          placeholder="Describe the personality traits and communication style..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Goals</Text>
        <View style={styles.listInput}>
          <TextInput
            style={styles.listInputField}
            value={newGoal}
            onChangeText={setNewGoal}
            placeholder="Add a specific goal for your agent"
            placeholderTextColor={theme.colors.textSecondary}
            onSubmitEditing={addGoal}
          />
          <TouchableOpacity style={styles.listAddButton} onPress={addGoal}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.itemsList}>
          {instructionsForm.goals.map((goal, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.listItemText}>{goal}</Text>
              <TouchableOpacity onPress={() => removeGoal(index)}>
                <Ionicons name="close" size={16} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Constraints</Text>
        <View style={styles.listInput}>
          <TextInput
            style={styles.listInputField}
            value={newConstraint}
            onChangeText={setNewConstraint}
            placeholder="Add a constraint or limitation"
            placeholderTextColor={theme.colors.textSecondary}
            onSubmitEditing={addConstraint}
          />
          <TouchableOpacity style={styles.listAddButton} onPress={addConstraint}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.itemsList}>
          {instructionsForm.constraints.map((constraint, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.listItemText}>{constraint}</Text>
              <TouchableOpacity onPress={() => removeConstraint(index)}>
                <Ionicons name="close" size={16} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderToolsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tools & Capabilities</Text>
      <Text style={styles.stepDescription}>
        Configure the tools your agent can use
      </Text>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Built-in Tools</Text>
        
        <View style={styles.toolOption}>
          <View style={styles.toolInfo}>
            <Ionicons name="code-slash" size={24} color={theme.colors.primary} />
            <View style={styles.toolDetails}>
              <Text style={styles.toolName}>Code Interpreter</Text>
              <Text style={styles.toolDescription}>
                Execute Python code, analyze data, create charts
              </Text>
            </View>
          </View>
          <Switch
            value={toolsForm.code_interpreter}
            onValueChange={(value) => setToolsForm(prev => ({ ...prev, code_interpreter: value }))}
            thumbColor={toolsForm.code_interpreter ? theme.colors.primary : theme.colors.textSecondary}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '30' }}
          />
        </View>

        <View style={styles.toolOption}>
          <View style={styles.toolInfo}>
            <Ionicons name="search" size={24} color={theme.colors.secondary} />
            <View style={styles.toolDetails}>
              <Text style={styles.toolName}>File Search</Text>
              <Text style={styles.toolDescription}>
                Search through uploaded knowledge files
              </Text>
            </View>
          </View>
          <Switch
            value={toolsForm.file_search}
            onValueChange={(value) => setToolsForm(prev => ({ ...prev, file_search: value }))}
            thumbColor={toolsForm.file_search ? theme.colors.secondary : theme.colors.textSecondary}
            trackColor={{ false: theme.colors.border, true: theme.colors.secondary + '30' }}
          />
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Tool Configuration</Text>
        
        <View style={styles.toolConfigOption}>
          <View style={styles.toolInfo}>
            <Text style={styles.toolName}>Parallel Tool Calls</Text>
            <Text style={styles.toolDescription}>
              Allow the agent to call multiple tools simultaneously
            </Text>
          </View>
          <Switch
            value={toolsForm.parallel_tool_calls}
            onValueChange={(value) => setToolsForm(prev => ({ ...prev, parallel_tool_calls: value }))}
            thumbColor={toolsForm.parallel_tool_calls ? theme.colors.primary : theme.colors.textSecondary}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '30' }}
          />
        </View>

        <View style={styles.toolConfigSection}>
          <Text style={styles.toolConfigLabel}>Tool Choice Strategy</Text>
          <View style={styles.radioGroup}>
            {(['auto', 'none', 'required'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.radioOption}
                onPress={() => setToolsForm(prev => ({ ...prev, tool_choice: option }))}
              >
                <View style={[
                  styles.radioCircle,
                  toolsForm.tool_choice === option && styles.radioCircleSelected
                ]}>
                  {toolsForm.tool_choice === option && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <View style={styles.radioContent}>
                  <Text style={styles.radioLabel}>
                    {option === 'auto' ? 'Auto' : option === 'none' ? 'None' : 'Required'}
                  </Text>
                  <Text style={styles.radioDescription}>
                    {option === 'auto' ? 'Let the model decide when to use tools' :
                     option === 'none' ? 'Disable all tool usage' :
                     'Force the model to use at least one tool'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.formSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.formLabel}>Custom Functions</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Function</Text>
          </TouchableOpacity>
        </View>
        
        {toolsForm.functions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="build-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyStateText}>No custom functions yet</Text>
            <Text style={styles.emptyStateDescription}>
              Create custom functions to extend your agent's capabilities
            </Text>
          </View>
        ) : (
          <View style={styles.functionsList}>
            {toolsForm.functions.map((func, index) => (
              <Card key={func.id} style={styles.functionCard}>
                <View style={styles.functionHeader}>
                  <Text style={styles.functionName}>{func.name}</Text>
                  <View style={styles.functionActions}>
                    <TouchableOpacity style={styles.functionAction}>
                      <Ionicons name="pencil" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.functionAction}>
                      <Ionicons name="play" size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.functionAction}>
                      <Ionicons name="trash" size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.functionDescription}>{func.description}</Text>
                <View style={styles.functionMeta}>
                  <Text style={styles.functionType}>{func.implementation.type}</Text>
                  <Text style={styles.functionStatus}>
                    {func.enabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>

      {/* MCP Tools Section */}
      <View style={styles.formSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.formLabel}>MCP Tools & Integrations</Text>
          <Text style={styles.formHelp}>
            Connect to external services and tools via Model Context Protocol
          </Text>
        </View>
        
        <MCPToolsPanel 
          agentId={builderState?.config.id}
          onToolsChange={(tools) => {
            // Update agent configuration with MCP tools
            console.log('MCP tools updated:', tools);
          }}
        />
      </View>
    </View>
  );

  const renderFilesStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Knowledge Base & Files</Text>
      <Text style={styles.stepDescription}>
        Upload files to create a knowledge base for your agent
      </Text>

      <View style={styles.formSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.formLabel}>Files</Text>
          <Button
            title={isFileUploading ? "Uploading..." : "Upload File"}
            onPress={uploadFile}
            variant="outline"
            size="sm"
            disabled={isFileUploading}
            loading={isFileUploading}
            icon={<Ionicons name="cloud-upload" size={16} color={theme.colors.primary} />}
          />
        </View>
        
        {filesForm.knowledge_files.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyStateText}>No files uploaded yet</Text>
            <Text style={styles.emptyStateDescription}>
              Upload documents, PDFs, or text files to give your agent knowledge
            </Text>
          </View>
        ) : (
          <View style={styles.filesList}>
            {filesForm.knowledge_files.map((file) => (
              <View key={file.id} style={styles.fileItem}>
                <Ionicons name="document" size={24} color={theme.colors.primary} />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{file.name}</Text>
                  <Text style={styles.fileSize}>
                    {(file.size_bytes / 1024).toFixed(1)} KB • {file.type}
                  </Text>
                </View>
                <StatusBadge 
                  status={file.processing_status === 'completed' ? 'success' : 'pending'} 
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {filesForm.knowledge_files.length > 0 && (
        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.formLabel}>Vector Stores</Text>
            <Button
              title={isCreatingVectorStore ? "Creating..." : "Create Vector Store"}
              onPress={createVectorStore}
              variant="outline"
              size="sm"
              disabled={isCreatingVectorStore}
              loading={isCreatingVectorStore}
              icon={<Ionicons name="library" size={16} color={theme.colors.secondary} />}
            />
          </View>
          
          {vectorStores.length === 0 ? (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={theme.colors.info} />
              <Text style={styles.infoText}>
                Create a vector store to enable semantic search across your files
              </Text>
            </View>
          ) : (
            <View style={styles.vectorStoresList}>
              {vectorStores.map((store) => (
                <View key={store.id} style={styles.vectorStoreItem}>
                  <Ionicons name="library" size={24} color={theme.colors.success} />
                  <View style={styles.vectorStoreInfo}>
                    <Text style={styles.vectorStoreName}>{store.name}</Text>
                    <Text style={styles.vectorStoreStats}>
                      {store.file_counts.total} files • {(store.usage_bytes / 1024 / 1024).toFixed(1)} MB
                    </Text>
                  </View>
                  <StatusBadge 
                    status={store.status === 'completed' ? 'success' : 'pending'} 
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderTestStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Test Your Agent</Text>
      <Text style={styles.stepDescription}>
        Run tests to validate your agent's behavior and performance
      </Text>

      <View style={styles.formSection}>
        <View style={styles.testSection}>
          <Button
            title={isTesting ? "Running Tests..." : "Run Test Suite"}
            onPress={testAgent}
            variant="primary"
            disabled={isTesting || !basicForm.name || !instructionsForm.system_prompt}
            loading={isTesting}
            icon={<Ionicons name="play" size={20} color="#FFFFFF" />}
            style={styles.testButton}
          />
          
          {testMetrics && (
            <View style={styles.testResults}>
              <Text style={styles.testResultsTitle}>Test Results</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{testMetrics.success_rate.toFixed(1)}%</Text>
                  <Text style={styles.metricLabel}>Success Rate</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{testMetrics.average_response_time.toFixed(0)}ms</Text>
                  <Text style={styles.metricLabel}>Avg Response Time</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>${testMetrics.average_cost_per_interaction.toFixed(4)}</Text>
                  <Text style={styles.metricLabel}>Avg Cost</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{testMetrics.total_tokens_used}</Text>
                  <Text style={styles.metricLabel}>Total Tokens</Text>
                </View>
              </View>
            </View>
          )}
          
          {testConversations.length > 0 && (
            <View style={styles.conversationsSection}>
              <Text style={styles.conversationsTitle}>Test Conversations</Text>
              {testConversations.map((conversation) => (
                <Card key={conversation.id} style={styles.conversationCard}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.conversationTitle}>{conversation.name}</Text>
                    <StatusBadge 
                      status={conversation.status === 'completed' ? 'success' : 'error'} 
                    />
                  </View>
                  {conversation.messages.map((message, index) => (
                    <View key={index} style={[
                      styles.messageItem,
                      message.role === 'user' && styles.userMessage,
                      message.role === 'assistant' && styles.assistantMessage,
                    ]}>
                      <Text style={styles.messageRole}>{message.role}:</Text>
                      <Text style={styles.messageContent}>{message.content}</Text>
                    </View>
                  ))}
                  <View style={styles.conversationMetrics}>
                    <Text style={styles.metricText}>
                      Response: {conversation.metrics.response_time_ms}ms
                    </Text>
                    <Text style={styles.metricText}>
                      Tokens: {conversation.metrics.tokens_used}
                    </Text>
                    <Text style={styles.metricText}>
                      Cost: ${conversation.metrics.cost.toFixed(4)}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderAdvancedStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Advanced Configuration</Text>
      <Text style={styles.stepDescription}>
        Fine-tune your agent's performance parameters
      </Text>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Temperature: {advancedForm.temperature}</Text>
        <Text style={styles.formHelp}>
          Controls randomness in responses (0 = deterministic, 2 = very creative)
        </Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>0</Text>
          <View style={styles.sliderTrack}>
            <View 
              style={[
                styles.sliderFill, 
                { width: `${(advancedForm.temperature / 2) * 100}%` }
              ]} 
            />
            <TouchableOpacity 
              style={[
                styles.sliderThumb, 
                { left: `${(advancedForm.temperature / 2) * 100}%` }
              ]}
            />
          </View>
          <Text style={styles.sliderLabel}>2</Text>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Top-p: {advancedForm.top_p}</Text>
        <Text style={styles.formHelp}>
          Controls diversity via nucleus sampling (0.1 = focused, 1.0 = diverse)
        </Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>0</Text>
          <View style={styles.sliderTrack}>
            <View 
              style={[
                styles.sliderFill, 
                { width: `${advancedForm.top_p * 100}%` }
              ]} 
            />
            <TouchableOpacity 
              style={[
                styles.sliderThumb, 
                { left: `${advancedForm.top_p * 100}%` }
              ]}
            />
          </View>
          <Text style={styles.sliderLabel}>1</Text>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Max Tokens</Text>
        <TextInput
          style={styles.formInput}
          value={advancedForm.max_tokens.toString()}
          onChangeText={(text) => setAdvancedForm(prev => ({ 
            ...prev, 
            max_tokens: parseInt(text) || 4096 
          }))}
          placeholder="4096"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="numeric"
        />
        <Text style={styles.formHelp}>
          Maximum number of tokens in the response (1-128000)
        </Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Timeout (seconds)</Text>
        <TextInput
          style={styles.formInput}
          value={advancedForm.timeout_seconds.toString()}
          onChangeText={(text) => setAdvancedForm(prev => ({ 
            ...prev, 
            timeout_seconds: parseInt(text) || 60 
          }))}
          placeholder="60"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Response Format</Text>
        <Text style={styles.formHelp}>
          Control the format of the agent's responses
        </Text>
        <View style={styles.radioGroup}>
          {(['auto', 'text', 'json_object'] as const).map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.radioOption}
              onPress={() => setAdvancedForm(prev => ({ ...prev, response_format: option }))}
            >
              <View style={[
                styles.radioCircle,
                advancedForm.response_format === option && styles.radioCircleSelected
              ]}>
                {advancedForm.response_format === option && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <View style={styles.radioContent}>
                <Text style={styles.radioLabel}>
                  {option === 'auto' ? 'Auto' : option === 'text' ? 'Text Only' : 'JSON Object'}
                </Text>
                <Text style={styles.radioDescription}>
                  {option === 'auto' ? 'Let the model choose the best format' :
                   option === 'text' ? 'Always respond in plain text' :
                   'Always respond with valid JSON objects'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Token Limits</Text>
        <View style={styles.tokenLimitsGrid}>
          <View style={styles.tokenLimitItem}>
            <Text style={styles.tokenLimitLabel}>Max Completion Tokens</Text>
            <TextInput
              style={styles.tokenInput}
              value={advancedForm.max_completion_tokens.toString()}
              onChangeText={(text) => setAdvancedForm(prev => ({ 
                ...prev, 
                max_completion_tokens: parseInt(text) || 4096 
              }))}
              keyboardType="numeric"
              placeholder="4096"
            />
          </View>
          <View style={styles.tokenLimitItem}>
            <Text style={styles.tokenLimitLabel}>Max Prompt Tokens</Text>
            <TextInput
              style={styles.tokenInput}
              value={advancedForm.max_prompt_tokens.toString()}
              onChangeText={(text) => setAdvancedForm(prev => ({ 
                ...prev, 
                max_prompt_tokens: parseInt(text) || 32000 
              }))}
              keyboardType="numeric"
              placeholder="32000"
            />
          </View>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Penalty Settings</Text>
        <Text style={styles.formHelp}>
          Control repetition and topic diversity in responses
        </Text>
        
        <View style={styles.penaltySection}>
          <Text style={styles.penaltyLabel}>Frequency Penalty: {advancedForm.frequency_penalty.toFixed(1)}</Text>
          <Text style={styles.penaltyDescription}>
            Reduces repetition of tokens based on frequency (-2.0 to 2.0)
          </Text>
          <TextInput
            style={styles.numericInput}
            value={advancedForm.frequency_penalty.toString()}
            onChangeText={(text) => {
              const value = parseFloat(text);
              if (!isNaN(value) && value >= -2 && value <= 2) {
                setAdvancedForm(prev => ({ ...prev, frequency_penalty: value }));
              }
            }}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.penaltySection}>
          <Text style={styles.penaltyLabel}>Presence Penalty: {advancedForm.presence_penalty.toFixed(1)}</Text>
          <Text style={styles.penaltyDescription}>
            Encourages talking about new topics (-2.0 to 2.0)
          </Text>
          <TextInput
            style={styles.numericInput}
            value={advancedForm.presence_penalty.toString()}
            onChangeText={(text) => {
              const value = parseFloat(text);
              if (!isNaN(value) && value >= -2 && value <= 2) {
                setAdvancedForm(prev => ({ ...prev, presence_penalty: value }));
              }
            }}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Reproducibility</Text>
        <Text style={styles.formHelp}>
          Set a seed for deterministic outputs (optional)
        </Text>
        <TextInput
          style={styles.formInput}
          value={advancedForm.seed?.toString() || ''}
          onChangeText={(text) => {
            const value = parseInt(text);
            setAdvancedForm(prev => ({ 
              ...prev, 
              seed: isNaN(value) ? undefined : value 
            }));
          }}
          placeholder="Leave empty for random outputs"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Fallback Behavior</Text>
        <View style={styles.radioGroup}>
          {(['error', 'default_response', 'escalate'] as const).map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.radioOption}
              onPress={() => setAdvancedForm(prev => ({ ...prev, fallback_behavior: option }))}
            >
              <View style={[
                styles.radioCircle,
                advancedForm.fallback_behavior === option && styles.radioCircleSelected
              ]}>
                {advancedForm.fallback_behavior === option && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text style={styles.radioLabel}>
                {option.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderDeployStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Deploy Your Agent</Text>
      <Text style={styles.stepDescription}>
        Review your configuration and deploy your agent
      </Text>

      <Card style={styles.deploymentSummary}>
        <LinearGradient
          colors={[theme.colors.primary + '15', theme.colors.secondary + '10']}
          style={styles.summaryGradient}
        />
        
        <View style={styles.summaryHeader}>
          <View style={styles.agentIcon}>
            <Ionicons name="person" size={32} color={theme.colors.primary} />
          </View>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{basicForm.name}</Text>
            <Text style={styles.agentDescription}>{basicForm.description}</Text>
          </View>
        </View>

        <View style={styles.summaryDetails}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Model:</Text>
            <Text style={styles.summaryValue}>{basicForm.model}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Category:</Text>
            <Text style={styles.summaryValue}>{basicForm.category}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tools:</Text>
            <Text style={styles.summaryValue}>
              {[
                toolsForm.code_interpreter && 'Code Interpreter',
                toolsForm.file_search && 'File Search',
                toolsForm.functions.length > 0 && `${toolsForm.functions.length} Custom Functions`
              ].filter(Boolean).join(', ') || 'None'}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.validationSection}>
        <Text style={styles.validationTitle}>Pre-deployment Checks</Text>
        {builderState?.validation && (
          <View style={styles.validationItems}>
            <View style={styles.validationItem}>
              <Ionicons 
                name={builderState.validation.is_valid ? "checkmark-circle" : "close-circle"} 
                size={20} 
                color={builderState.validation.is_valid ? theme.colors.success : theme.colors.error} 
              />
              <Text style={styles.validationText}>
                Configuration {builderState.validation.is_valid ? 'Valid' : 'Invalid'}
              </Text>
            </View>
            {builderState.validation.warnings.map((warning, index) => (
              <View key={index} style={styles.validationItem}>
                <Ionicons name="warning" size={20} color={theme.colors.warning} />
                <Text style={styles.validationText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.deploymentActions}>
        <Button
          title="Test Agent First"
          onPress={() => navigateToStep('test')}
          variant="outline"
          style={styles.actionButton}
          icon={<Ionicons name="flask" size={20} color={theme.colors.text} />}
        />
        <Button
          title={saving ? 'Deploying...' : 'Deploy Agent'}
          onPress={deployAgent}
          variant="gradient"
          style={styles.actionButton}
          disabled={saving || !builderState?.validation.is_valid}
          loading={saving}
          icon={<Ionicons name="rocket" size={20} color="#FFFFFF" />}
        />
      </View>
    </View>
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'assistant': return 'person';
      case 'analyst': return 'analytics';
      case 'writer': return 'create';
      case 'coder': return 'code-slash';
      case 'researcher': return 'search';
      default: return 'apps';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Agent Builder...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Agent Builder</Text>
            <Text style={styles.headerSubtitle}>
              {basicForm.name || 'New Agent'} • {currentStep}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.headerAction}
            onPress={() => setShowTemplateModal(true)}
          >
            <Ionicons name="library" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {currentStep === 'basic' && renderBasicStep()}
        {currentStep === 'instructions' && renderInstructionsStep()}
        {currentStep === 'tools' && renderToolsStep()}
        {currentStep === 'files' && renderFilesStep()}
        {currentStep === 'advanced' && renderAdvancedStep()}
        {currentStep === 'test' && renderTestStep()}
        {currentStep === 'deploy' && renderDeployStep()}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Button
          title="Previous"
          onPress={() => {
            const steps = ['basic', 'instructions', 'tools', 'files', 'advanced', 'test', 'deploy'];
            const currentIndex = steps.indexOf(currentStep);
            if (currentIndex > 0) {
              navigateToStep(steps[currentIndex - 1] as OpenAIAgentBuilderConfig['step']);
            }
          }}
          variant="outline"
          style={styles.navButton}
          disabled={currentStep === 'basic'}
        />
        <Button
          title={currentStep === 'deploy' ? 'Deploy' : 'Next'}
          onPress={() => {
            const steps = ['basic', 'instructions', 'tools', 'files', 'advanced', 'test', 'deploy'];
            const currentIndex = steps.indexOf(currentStep);
            if (currentStep === 'deploy') {
              deployAgent();
            } else if (currentIndex < steps.length - 1) {
              navigateToStep(steps[currentIndex + 1] as OpenAIAgentBuilderConfig['step']);
            }
          }}
          variant="gradient"
          style={styles.navButton}
          loading={saving}
        />
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  stepsList: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  stepItem: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  stepItemActive: {},
  stepItemCompleted: {},
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconActive: {
    backgroundColor: theme.colors.primary,
  },
  stepIconCompleted: {
    backgroundColor: theme.colors.success,
  },
  stepLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 32,
    lineHeight: 24,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  formHelp: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  formInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  formInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  formInputLarge: {
    height: 160,
    textAlignVertical: 'top',
  },
  modelSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modelOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modelOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  modelOptionText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  modelOptionTextSelected: {
    color: '#FFFFFF',
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 8,
  },
  categoryOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  categoryOptionText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  categoryOptionTextSelected: {
    color: '#FFFFFF',
  },
  tagInput: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tagInputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  tagAddButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + '20',
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  listInput: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  listInputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  listAddButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsList: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginRight: 12,
  },
  toolOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  toolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  toolDetails: {
    flex: 1,
  },
  toolName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  toolDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  functionsList: {
    gap: 12,
  },
  functionCard: {
    padding: 16,
  },
  functionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  functionName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  functionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  functionAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  functionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  functionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  functionType: {
    fontSize: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  functionStatus: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '500',
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  radioLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  deploymentSummary: {
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 24,
  },
  summaryGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  agentIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  agentDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  summaryDetails: {
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  validationSection: {
    marginBottom: 24,
  },
  validationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  validationItems: {
    gap: 8,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  validationText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  deploymentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  navigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  navButton: {
    flex: 1,
  },
  // Enhanced Model Selection Styles
  radioContent: {
    flex: 1,
    marginLeft: 12,
  },
  radioDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  // Enhanced Files Step Styles
  filesList: {
    gap: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.info + '20',
    borderWidth: 1,
    borderColor: theme.colors.info + '50',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 20,
  },
  vectorStoresList: {
    gap: 12,
  },
  vectorStoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  vectorStoreInfo: {
    flex: 1,
  },
  vectorStoreName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  vectorStoreStats: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  // Enhanced Test Step Styles
  testSection: {
    gap: 16,
  },
  testButton: {
    marginBottom: 16,
  },
  testResults: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  testResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricItem: {
    alignItems: 'center',
    minWidth: '22%',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  conversationsSection: {
    marginTop: 24,
  },
  conversationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  conversationCard: {
    marginBottom: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  messageItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  userMessage: {
    backgroundColor: theme.colors.primary + '20',
    alignSelf: 'flex-end',
    maxWidth: '85%',
    marginLeft: '15%',
  },
  assistantMessage: {
    backgroundColor: theme.colors.border,
    alignSelf: 'flex-start',
    maxWidth: '85%',
    marginRight: '15%',
  },
  messageRole: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  messageContent: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  conversationMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  metricText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  
  modelCategory: {
    marginBottom: 24,
  },
  modelCategoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  modelCategoryDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  modelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modelCard: {
    width: (width - 60) / 2,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  modelCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  modelCardHeader: {
    marginBottom: 8,
  },
  modelCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  modelCardTitleSelected: {
    color: theme.colors.primary,
  },
  modelCardDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  modelCapabilities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  capabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  capabilityText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  modelPricing: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  pricingText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  contextWindow: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  
  // Enhanced Tool Configuration Styles
  toolConfigOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toolConfigSection: {
    marginTop: 16,
  },
  toolConfigLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  
  // Advanced Configuration Styles
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    width: 20,
    textAlign: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tokenLimitsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  tokenLimitItem: {
    flex: 1,
  },
  tokenLimitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  tokenInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
  },
  penaltySection: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  penaltyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  penaltyDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  numericInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
    width: 80,
  },
});

export default AgentBuilderScreen;