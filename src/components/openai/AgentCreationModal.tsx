import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Modal as RNModal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { Card, Button, Modal } from '../ui';
import { OpenAIAgentConfig, OpenAIAgentTool, FunctionDefinition } from '../../types/openai';
import { openaiAgentsComplete } from '../../services/openaiAgentsComplete';
import { openaiModelsService } from '../../services/openaiModels';

interface AgentCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (agent: any) => void;
  initialConfig?: Partial<OpenAIAgentConfig>;
  isEditing?: boolean;
}

interface ModelOption {
  id: string;
  name: string;
  description: string;
  pricing?: {
    input_tokens_per_1k: number;
    output_tokens_per_1k: number;
  };
}

const AgentCreationModal: React.FC<AgentCreationModalProps> = ({
  visible,
  onClose,
  onSave,
  initialConfig,
  isEditing = false
}) => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  const styles = createStyles(theme);

  // Form state
  const [step, setStep] = useState<'basic' | 'instructions' | 'tools' | 'advanced'>('basic');
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  
  // Basic settings
  const [name, setName] = useState(initialConfig?.name || '');
  const [description, setDescription] = useState(initialConfig?.description || '');
  const [model, setModel] = useState(initialConfig?.model || 'gpt-4o');
  const [category, setCategory] = useState<'assistant' | 'analyst' | 'writer' | 'coder' | 'researcher' | 'custom'>('assistant');

  // Instructions
  const [instructions, setInstructions] = useState(initialConfig?.instructions || '');
  const [personality, setPersonality] = useState('');
  const [goals, setGoals] = useState<string[]>(['']);
  const [constraints, setConstraints] = useState<string[]>(['']);

  // Tools
  const [enableCodeInterpreter, setEnableCodeInterpreter] = useState(false);
  const [enableFileSearch, setEnableFileSearch] = useState(false);
  const [customFunctions, setCustomFunctions] = useState<FunctionDefinition[]>([]);
  const [showFunctionModal, setShowFunctionModal] = useState(false);

  // Advanced settings
  const [temperature, setTemperature] = useState(initialConfig?.temperature || 1.0);
  const [topP, setTopP] = useState(initialConfig?.top_p || 1.0);
  const [maxTokens, setMaxTokens] = useState(initialConfig?.max_tokens || 4096);

  // Function creation modal state
  const [functionName, setFunctionName] = useState('');
  const [functionDescription, setFunctionDescription] = useState('');
  const [functionParameters, setFunctionParameters] = useState('{}');

  useEffect(() => {
    if (visible) {
      loadAvailableModels();
    }
  }, [visible]);

  useEffect(() => {
    if (initialConfig && isEditing) {
      setName(initialConfig.name || '');
      setDescription(initialConfig.description || '');
      setModel(initialConfig.model || 'gpt-4o');
      setInstructions(initialConfig.instructions || '');
      setTemperature(initialConfig.temperature || 1.0);
      setTopP(initialConfig.top_p || 1.0);
      setMaxTokens(initialConfig.max_tokens || 4096);
      
      // Load tools
      if (initialConfig.tools) {
        setEnableCodeInterpreter(initialConfig.tools.some(t => t.type === 'code_interpreter'));
        setEnableFileSearch(initialConfig.tools.some(t => t.type === 'file_search'));
        setCustomFunctions(
          initialConfig.tools
            .filter(t => t.type === 'function' && t.function)
            .map(t => t.function!)
        );
      }
    }
  }, [initialConfig, isEditing]);

  const loadAvailableModels = async () => {
    try {
      const models = await openaiModelsService.fetchAllModels();
      const modelOptions: ModelOption[] = models
        .filter(m => m.id.includes('gpt') || m.id.includes('o3') || m.id.includes('o4'))
        .map(m => ({
          id: m.id,
          name: m.id,
          description: m.description || `${m.id} - Advanced AI model`,
          pricing: m.pricing
        }));
      
      setAvailableModels(modelOptions);
    } catch (error) {
      console.error('Failed to load models:', error);
      // Fallback models
      setAvailableModels([
        { id: 'gpt-4o', name: 'GPT-4o', description: 'Most advanced multimodal model' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient model' },
        { id: 'gpt-4', name: 'GPT-4', description: 'High-quality reasoning model' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' }
      ]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Agent name is required');
      return;
    }

    if (!instructions.trim()) {
      Alert.alert('Error', 'Instructions are required');
      return;
    }

    setLoading(true);

    try {
      const tools: OpenAIAgentTool[] = [];
      
      if (enableCodeInterpreter) {
        tools.push({ type: 'code_interpreter' });
      }
      
      if (enableFileSearch) {
        tools.push({ type: 'file_search' });
      }
      
      customFunctions.forEach(func => {
        tools.push({
          type: 'function',
          function: func
        });
      });

      const config: OpenAIAgentConfig = {
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        model,
        tools,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        user_id: 'current_user', // This should come from auth context
        metadata: {
          category,
          personality: personality.trim(),
          goals: goals.filter(g => g.trim()),
          constraints: constraints.filter(c => c.trim()),
          created_with: 'expo-atlas-agent-creator'
        }
      };

      let result;
      if (isEditing && initialConfig) {
        // Update existing agent
        result = await openaiAgentsComplete.updateAgent(initialConfig.name || '', config);
      } else {
        // Create new agent
        result = await openaiAgentsComplete.createAgent(config);
      }

      onSave(result);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving agent:', error);
      Alert.alert(
        'Error',
        `Failed to ${isEditing ? 'update' : 'create'} agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('basic');
    setName('');
    setDescription('');
    setModel('gpt-4o');
    setCategory('assistant');
    setInstructions('');
    setPersonality('');
    setGoals(['']);
    setConstraints(['']);
    setEnableCodeInterpreter(false);
    setEnableFileSearch(false);
    setCustomFunctions([]);
    setTemperature(1.0);
    setTopP(1.0);
    setMaxTokens(4096);
  };

  const addGoal = () => {
    setGoals([...goals, '']);
  };

  const updateGoal = (index: number, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
  };

  const removeGoal = (index: number) => {
    if (goals.length > 1) {
      setGoals(goals.filter((_, i) => i !== index));
    }
  };

  const addConstraint = () => {
    setConstraints([...constraints, '']);
  };

  const updateConstraint = (index: number, value: string) => {
    const newConstraints = [...constraints];
    newConstraints[index] = value;
    setConstraints(newConstraints);
  };

  const removeConstraint = (index: number) => {
    if (constraints.length > 1) {
      setConstraints(constraints.filter((_, i) => i !== index));
    }
  };

  const addCustomFunction = () => {
    if (!functionName.trim() || !functionDescription.trim()) {
      Alert.alert('Error', 'Function name and description are required');
      return;
    }

    try {
      const parameters = JSON.parse(functionParameters);
      
      const newFunction: FunctionDefinition = {
        name: functionName.trim(),
        description: functionDescription.trim(),
        parameters
      };

      setCustomFunctions([...customFunctions, newFunction]);
      setFunctionName('');
      setFunctionDescription('');
      setFunctionParameters('{}');
      setShowFunctionModal(false);
    } catch (error) {
      Alert.alert('Error', 'Invalid JSON in function parameters');
    }
  };

  const removeCustomFunction = (index: number) => {
    setCustomFunctions(customFunctions.filter((_, i) => i !== index));
  };

  const getStepIcon = (stepName: string) => {
    const currentIndex = ['basic', 'instructions', 'tools', 'advanced'].indexOf(step);
    const stepIndex = ['basic', 'instructions', 'tools', 'advanced'].indexOf(stepName);
    
    if (stepIndex < currentIndex) {
      return 'checkmark-circle';
    } else if (stepIndex === currentIndex) {
      return 'ellipse';
    } else {
      return 'ellipse-outline';
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {['basic', 'instructions', 'tools', 'advanced'].map((stepName, index) => (
        <TouchableOpacity
          key={stepName}
          style={[
            styles.stepItem,
            step === stepName && styles.activeStep
          ]}
          onPress={() => setStep(stepName as any)}
        >
          <Ionicons
            name={getStepIcon(stepName)}
            size={24}
            color={step === stepName ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[
            styles.stepLabel,
            step === stepName && styles.activeStepLabel
          ]}>
            {stepName.charAt(0).toUpperCase() + stepName.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderBasicStep = () => (
    <ScrollView style={styles.stepContent}>
      <Card variant="elevated" size="md">
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Agent Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter agent name"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what this agent does"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryRow}>
              {['assistant', 'analyst', 'writer', 'coder', 'researcher', 'custom'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.activeCategoryChip
                  ]}
                  onPress={() => setCategory(cat as any)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    category === cat && styles.activeCategoryChipText
                  ]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Model</Text>
          {availableModels.map((modelOption) => (
            <TouchableOpacity
              key={modelOption.id}
              style={[
                styles.modelOption,
                model === modelOption.id && styles.activeModelOption
              ]}
              onPress={() => setModel(modelOption.id)}
            >
              <View style={styles.modelInfo}>
                <Text style={[
                  styles.modelName,
                  model === modelOption.id && styles.activeModelName
                ]}>
                  {modelOption.name}
                </Text>
                <Text style={styles.modelDescription}>
                  {modelOption.description}
                </Text>
                {modelOption.pricing && (
                  <Text style={styles.modelPricing}>
                    ${modelOption.pricing.input_tokens_per_1k}/1K input, ${modelOption.pricing.output_tokens_per_1k}/1K output
                  </Text>
                )}
              </View>
              {model === modelOption.id && (
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    </ScrollView>
  );

  const renderInstructionsStep = () => (
    <ScrollView style={styles.stepContent}>
      <Card variant="elevated" size="md">
        <Text style={styles.sectionTitle}>Instructions & Behavior</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>System Instructions *</Text>
          <TextInput
            style={[styles.input, styles.largeTextArea]}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Define how the agent should behave, its role, and responsibilities..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={6}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Personality</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={personality}
            onChangeText={setPersonality}
            placeholder="Describe the agent's personality and communication style"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Goals</Text>
          {goals.map((goal, index) => (
            <View key={index} style={styles.listItem}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={goal}
                onChangeText={(text) => updateGoal(index, text)}
                placeholder={`Goal ${index + 1}`}
                placeholderTextColor={theme.colors.textSecondary}
              />
              <TouchableOpacity
                style={styles.listItemAction}
                onPress={() => removeGoal(index)}
              >
                <Ionicons name="remove-circle" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addGoal}>
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.addButtonText}>Add Goal</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Constraints</Text>
          {constraints.map((constraint, index) => (
            <View key={index} style={styles.listItem}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={constraint}
                onChangeText={(text) => updateConstraint(index, text)}
                placeholder={`Constraint ${index + 1}`}
                placeholderTextColor={theme.colors.textSecondary}
              />
              <TouchableOpacity
                style={styles.listItemAction}
                onPress={() => removeConstraint(index)}
              >
                <Ionicons name="remove-circle" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addConstraint}>
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.addButtonText}>Add Constraint</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </ScrollView>
  );

  const renderToolsStep = () => (
    <ScrollView style={styles.stepContent}>
      <Card variant="elevated" size="md">
        <Text style={styles.sectionTitle}>Tools & Capabilities</Text>
        
        <View style={styles.toolOption}>
          <View style={styles.toolInfo}>
            <Text style={styles.toolName}>Code Interpreter</Text>
            <Text style={styles.toolDescription}>
              Allows the agent to write and execute Python code
            </Text>
          </View>
          <Switch
            value={enableCodeInterpreter}
            onValueChange={setEnableCodeInterpreter}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={enableCodeInterpreter ? theme.colors.surface : theme.colors.textSecondary}
          />
        </View>

        <View style={styles.toolOption}>
          <View style={styles.toolInfo}>
            <Text style={styles.toolName}>File Search</Text>
            <Text style={styles.toolDescription}>
              Enables searching and analyzing uploaded files
            </Text>
          </View>
          <Switch
            value={enableFileSearch}
            onValueChange={setEnableFileSearch}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={enableFileSearch ? theme.colors.surface : theme.colors.textSecondary}
          />
        </View>

        <View style={styles.customFunctionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Custom Functions</Text>
            <TouchableOpacity
              style={styles.addFunctionButton}
              onPress={() => setShowFunctionModal(true)}
            >
              <Ionicons name="add" size={20} color={theme.colors.primary} />
              <Text style={styles.addFunctionText}>Add Function</Text>
            </TouchableOpacity>
          </View>

          {customFunctions.map((func, index) => (
            <View key={index} style={styles.functionItem}>
              <View style={styles.functionInfo}>
                <Text style={styles.functionName}>{func.name}</Text>
                <Text style={styles.functionDescription}>{func.description}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeFunctionButton}
                onPress={() => removeCustomFunction(index)}
              >
                <Ionicons name="trash" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );

  const renderAdvancedStep = () => (
    <ScrollView style={styles.stepContent}>
      <Card variant="elevated" size="md">
        <Text style={styles.sectionTitle}>Advanced Settings</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Temperature: {temperature.toFixed(1)}</Text>
          <Text style={styles.sliderDescription}>
            Controls randomness (0 = focused, 2 = creative)
          </Text>
          <View style={styles.sliderContainer}>
            <Text>0</Text>
            <View style={styles.slider}>
              {/* Custom slider implementation would go here */}
              <TextInput
                style={styles.numericInput}
                value={temperature.toString()}
                onChangeText={(text) => {
                  const value = parseFloat(text);
                  if (!isNaN(value) && value >= 0 && value <= 2) {
                    setTemperature(value);
                  }
                }}
                keyboardType="numeric"
              />
            </View>
            <Text>2</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Top P: {topP.toFixed(1)}</Text>
          <Text style={styles.sliderDescription}>
            Controls diversity via nucleus sampling
          </Text>
          <View style={styles.sliderContainer}>
            <Text>0</Text>
            <View style={styles.slider}>
              <TextInput
                style={styles.numericInput}
                value={topP.toString()}
                onChangeText={(text) => {
                  const value = parseFloat(text);
                  if (!isNaN(value) && value >= 0 && value <= 1) {
                    setTopP(value);
                  }
                }}
                keyboardType="numeric"
              />
            </View>
            <Text>1</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Max Tokens</Text>
          <TextInput
            style={styles.input}
            value={maxTokens.toString()}
            onChangeText={(text) => {
              const value = parseInt(text);
              if (!isNaN(value) && value > 0) {
                setMaxTokens(value);
              }
            }}
            keyboardType="numeric"
            placeholder="4096"
          />
          <Text style={styles.helperText}>
            Maximum tokens in the response (1-8192 for most models)
          </Text>
        </View>
      </Card>
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 'basic':
        return renderBasicStep();
      case 'instructions':
        return renderInstructionsStep();
      case 'tools':
        return renderToolsStep();
      case 'advanced':
        return renderAdvancedStep();
      default:
        return renderBasicStep();
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'basic':
        return name.trim().length > 0;
      case 'instructions':
        return instructions.trim().length > 0;
      case 'tools':
      case 'advanced':
        return true;
      default:
        return false;
    }
  };

  const isLastStep = step === 'advanced';
  const isFirstStep = step === 'basic';

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Edit Agent' : 'Create New Agent'}
      size="large"
    >
      <View style={styles.container}>
        {renderStepIndicator()}
        
        <View style={styles.content}>
          {renderCurrentStep()}
        </View>

        <View style={styles.footer}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            style={{ flex: 1, marginRight: 8 }}
          />
          
          {!isFirstStep && (
            <Button
              title="Back"
              variant="outline"
              onPress={() => {
                const steps = ['basic', 'instructions', 'tools', 'advanced'];
                const currentIndex = steps.indexOf(step);
                if (currentIndex > 0) {
                  setStep(steps[currentIndex - 1] as any);
                }
              }}
              style={{ marginRight: 8 }}
            />
          )}
          
          <Button
            title={isLastStep ? (isEditing ? 'Update Agent' : 'Create Agent') : 'Next'}
            variant="primary"
            onPress={isLastStep ? handleSave : () => {
              const steps = ['basic', 'instructions', 'tools', 'advanced'];
              const currentIndex = steps.indexOf(step);
              if (currentIndex < steps.length - 1) {
                setStep(steps[currentIndex + 1] as any);
              }
            }}
            disabled={!canProceed() || loading}
            loading={loading}
            style={{ flex: 1 }}
          />
        </View>

        {/* Function Creation Modal */}
        <RNModal
          visible={showFunctionModal}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.functionModal}>
              <Text style={styles.modalTitle}>Add Custom Function</Text>
              
              <TextInput
                style={styles.input}
                value={functionName}
                onChangeText={setFunctionName}
                placeholder="Function name"
                placeholderTextColor={theme.colors.textSecondary}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                value={functionDescription}
                onChangeText={setFunctionDescription}
                placeholder="Function description"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
              />
              
              <Text style={styles.label}>Parameters (JSON Schema)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={functionParameters}
                onChangeText={setFunctionParameters}
                placeholder='{"type": "object", "properties": {}, "required": []}'
                placeholderTextColor={theme.colors.textSecondary}
                multiline
              />
              
              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowFunctionModal(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Add Function"
                  variant="primary"
                  onPress={addCustomFunction}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </RNModal>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  activeStep: {
    // Add active step styling
  },
  stepLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  activeStepLabel: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  largeTextArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  activeCategoryChip: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  activeCategoryChipText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
  },
  activeModelOption: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  activeModelName: {
    color: theme.colors.primary,
  },
  modelDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modelPricing: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  listItemAction: {
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    marginLeft: 8,
  },
  toolOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  toolInfo: {
    flex: 1,
  },
  toolName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  toolDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  customFunctionsSection: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addFunctionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addFunctionText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginLeft: 4,
  },
  functionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
  },
  functionInfo: {
    flex: 1,
  },
  functionName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  functionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  removeFunctionButton: {
    padding: 4,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slider: {
    flex: 1,
  },
  sliderDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  numericInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 8,
    textAlign: 'center',
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  functionModal: {
    width: '90%',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
});

export default AgentCreationModal;