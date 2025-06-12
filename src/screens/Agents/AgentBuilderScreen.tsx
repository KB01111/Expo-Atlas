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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Button, Modal } from '../../components/ui';
import { MotiView } from '../../components/animations';
import { createSharedStyles } from '../../styles/shared';
import { agentBuilderService } from '../../services/agentBuilder';
import { openaiModelsService } from '../../services/openaiModels';
import { 
  OpenAIAgentBuilderConfig, 
  AgentBuilderState, 
  CustomFunction,
  AgentFile,
  AgentTemplate 
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
    timeout_seconds: 60,
    max_retries: 3,
    fallback_behavior: 'error' as 'error' | 'default_response' | 'escalate',
  });

  // UI State
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [newConstraint, setNewConstraint] = useState('');
  const [newTag, setNewTag] = useState('');

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
      const models = await openaiModelsService.getAvailableModelIds();
      setAvailableModels(models);
    } catch (error) {
      console.error('Error loading models:', error);
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

  const deployAgent = async () => {
    if (!builderId) return;

    try {
      setSaving(true);
      await saveCurrentStep();
      
      const deployment = await agentBuilderService.deployAgent(builderId, 'production');
      
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.modelSelector}>
            {availableModels.map((model) => (
              <TouchableOpacity
                key={model}
                style={[
                  styles.modelOption,
                  basicForm.model === model && styles.modelOptionSelected
                ]}
                onPress={() => setBasicForm(prev => ({ ...prev, model }))}
              >
                <Text style={[
                  styles.modelOptionText,
                  basicForm.model === model && styles.modelOptionTextSelected
                ]}>
                  {model}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
        {currentStep === 'advanced' && renderAdvancedStep()}
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
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
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
    marginLeft: -8,
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
});

export default AgentBuilderScreen;