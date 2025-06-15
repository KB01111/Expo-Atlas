import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
  StatusBar,
  SafeAreaView,
  ActionSheetIOS,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { Card, Button } from '../ui';
import { OpenAIAgentConfig, OpenAIAgentTool, FunctionDefinition } from '../../types/openai';
import { openaiAgentsComplete } from '../../services/openaiAgentsComplete';
import { openaiModelsService } from '../../services/openaiModels';

const { width, height } = Dimensions.get('window');
const isIPad = width > 768;

interface IOSAgentCreationModalProps {
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
  badge?: string;
  color?: string;
  pricing?: {
    input_tokens_per_1k: number;
    output_tokens_per_1k: number;
  };
}

interface StepProps {
  isActive: boolean;
  isCompleted: boolean;
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}

const StepIndicator: React.FC<StepProps> = ({ isActive, isCompleted, title, description, icon, onPress }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  
  return (
    <TouchableOpacity 
      style={[styles.stepIndicatorItem, isActive && { backgroundColor: theme.colors.primary + '20' }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={[
        styles.stepIcon,
        { 
          backgroundColor: isCompleted ? theme.colors.success : isActive ? theme.colors.primary : theme.colors.border,
          borderColor: isActive ? theme.colors.primary : 'transparent'
        }
      ]}>
        <Ionicons 
          name={isCompleted ? 'checkmark' : icon as any} 
          size={16} 
          color={isCompleted || isActive ? '#FFFFFF' : theme.colors.textSecondary} 
        />
      </View>
      <View style={styles.stepContentInner}>
        <Text style={[
          styles.stepTitle,
          { color: isActive ? theme.colors.primary : theme.colors.text }
        ]}>
          {title}
        </Text>
        <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const IOSAgentCreationModal: React.FC<IOSAgentCreationModalProps> = ({
  visible,
  onClose,
  onSave,
  initialConfig,
  isEditing = false
}) => {
  const { theme, isDark } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  const styles = createStyles(theme);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Form state
  const [step, setStep] = useState<'basic' | 'instructions' | 'tools' | 'files' | 'advanced' | 'preview'>('basic');
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  
  // Basic settings
  const [name, setName] = useState(initialConfig?.name || '');
  const [description, setDescription] = useState(initialConfig?.description || '');
  const [model, setModel] = useState(initialConfig?.model || 'gpt-4o');
  const [category, setCategory] = useState<'assistant' | 'analyst' | 'writer' | 'coder' | 'researcher' | 'custom'>('assistant');
  const [avatar, setAvatar] = useState('🤖');

  // Instructions
  const [instructions, setInstructions] = useState(initialConfig?.instructions || '');
  const [personality, setPersonality] = useState('');
  const [tone, setTone] = useState<'professional' | 'friendly' | 'casual' | 'formal' | 'creative'>('friendly');
  const [expertise, setExpertise] = useState<string[]>(['general']);
  const [responseStyle, setResponseStyle] = useState<'concise' | 'detailed' | 'balanced'>('balanced');
  const [goals, setGoals] = useState<string[]>(['']);
  const [constraints, setConstraints] = useState<string[]>(['']);

  // Tools
  const [enableCodeInterpreter, setEnableCodeInterpreter] = useState(false);
  const [enableFileSearch, setEnableFileSearch] = useState(false);
  const [enableWebBrowsing, setEnableWebBrowsing] = useState(false);
  const [enableImageGeneration, setEnableImageGeneration] = useState(false);
  const [customFunctions, setCustomFunctions] = useState<FunctionDefinition[]>([]);
  const [showFunctionModal, setShowFunctionModal] = useState(false);

  // Files
  const [knowledgeFiles, setKnowledgeFiles] = useState<any[]>([]);
  const [codeFiles, setCodeFiles] = useState<any[]>([]);
  const [vectorStoreEnabled, setVectorStoreEnabled] = useState(false);

  // Advanced settings
  const [temperature, setTemperature] = useState(initialConfig?.temperature || 1.0);
  const [topP, setTopP] = useState(initialConfig?.top_p || 1.0);
  const [maxTokens, setMaxTokens] = useState(initialConfig?.max_tokens || 4096);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0.0);
  const [presencePenalty, setPresencePenalty] = useState(0.0);
  const [responseFormat, setResponseFormat] = useState<'text' | 'json'>('text');
  const [stopSequences, setStopSequences] = useState<string[]>([]);
  const [systemPromptTemplate, setSystemPromptTemplate] = useState('default');

  // Function creation modal state
  const [functionName, setFunctionName] = useState('');
  const [functionDescription, setFunctionDescription] = useState('');
  const [functionParameters, setFunctionParameters] = useState('{}');
  const [functionImplementation, setFunctionImplementation] = useState<'api' | 'javascript' | 'python'>('api');

  // Animation controls
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Pan responder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > height * 0.25) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      loadAvailableModels();
      if (Platform.OS === 'ios') {
        StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
      }
    }
  }, [visible]);

  const loadAvailableModels = async () => {
    try {
      const models = await openaiModelsService.fetchAllModels();
      const modelOptions: ModelOption[] = models
        .filter(m => m.id.includes('gpt') || m.id.includes('o3') || m.id.includes('o4'))
        .map(m => ({
          id: m.id,
          name: m.id,
          description: m.description || `${m.id} - Advanced AI model`,
          badge: m.id.includes('4o') ? 'Latest' : m.id.includes('mini') ? 'Fast' : undefined,
          color: m.id.includes('4o') ? theme.colors.primary : m.id.includes('mini') ? theme.colors.success : theme.colors.accent,
          pricing: m.pricing
        }));
      
      setAvailableModels(modelOptions);
    } catch (error) {
      console.error('Failed to load models:', error);
      setAvailableModels([
        { id: 'gpt-4o', name: 'GPT-4o', description: 'Most advanced multimodal model', badge: 'Latest', color: theme.colors.primary },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient model', badge: 'Fast', color: theme.colors.success },
        { id: 'gpt-4', name: 'GPT-4', description: 'High-quality reasoning model', color: theme.colors.accent },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Cost-effective option', color: theme.colors.info }
      ]);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleStepChange = (newStep: typeof step) => {
    if (validateCurrentStep()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(newStep);
    }
  };

  const validateCurrentStep = () => {
    switch (step) {
      case 'basic':
        if (!name.trim()) {
          showIOSAlert('Error', 'Agent name is required');
          return false;
        }
        break;
      case 'instructions':
        if (!instructions.trim()) {
          showIOSAlert('Error', 'Instructions are required');
          return false;
        }
        break;
    }
    return true;
  };

  const showIOSAlert = (title: string, message: string) => {
    if (Platform.OS === 'ios') {
      Alert.alert(title, message);
    } else {
      Alert.alert(title, message);
    }
  };

  const showModelPicker = () => {
    if (Platform.OS === 'ios') {
      const options = ['Cancel', ...availableModels.map(m => m.name)];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          title: 'Select Model',
          message: 'Choose the AI model for your agent'
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            setModel(availableModels[buttonIndex - 1].id);
            Haptics.selectionAsync();
          }
        }
      );
    }
  };

  const addExpertise = () => {
    if (Platform.OS === 'ios') {
      const options = [
        'Cancel',
        'Technology & Programming',
        'Business & Finance',
        'Science & Research',
        'Creative & Arts',
        'Education & Training',
        'Healthcare & Medicine',
        'Legal & Compliance',
        'Marketing & Sales',
        'Data & Analytics',
        'Customer Service'
      ];
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          title: 'Add Expertise Area'
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const newExpertise = options[buttonIndex].toLowerCase().replace(/ & /g, '_').replace(/ /g, '_');
            if (!expertise.includes(newExpertise)) {
              setExpertise([...expertise, newExpertise]);
              Haptics.selectionAsync();
            }
          }
        }
      );
    }
  };

  const handleSave = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const tools: OpenAIAgentTool[] = [];
      
      if (enableCodeInterpreter) tools.push({ type: 'code_interpreter' });
      if (enableFileSearch) tools.push({ type: 'file_search' });
      
      customFunctions.forEach(func => {
        tools.push({ type: 'function', function: func });
      });

      const config: OpenAIAgentConfig = {
        name: name.trim(),
        description: description.trim(),
        instructions: buildFinalInstructions(),
        model,
        tools,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        user_id: 'current_user',
        metadata: {
          category,
          avatar,
          personality: personality.trim(),
          tone,
          expertise,
          responseStyle,
          goals: goals.filter(g => g.trim()),
          constraints: constraints.filter(c => c.trim()),
          frequencyPenalty,
          presencePenalty,
          responseFormat,
          stopSequences,
          systemPromptTemplate,
          created_with: 'ios-agent-creator',
          version: '2.0'
        }
      };

      let result;
      if (isEditing && initialConfig) {
        result = await openaiAgentsComplete.updateAgent(initialConfig.name || '', config);
      } else {
        result = await openaiAgentsComplete.createAgent(config);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave(result);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving agent:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showIOSAlert('Error', `Failed to ${isEditing ? 'update' : 'create'} agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const buildFinalInstructions = () => {
    let finalInstructions = instructions;
    
    if (personality) {
      finalInstructions += `\n\nPersonality: ${personality}`;
    }
    
    finalInstructions += `\n\nTone: ${tone}`;
    finalInstructions += `\nResponse Style: ${responseStyle}`;
    
    if (expertise.length > 1 || expertise[0] !== 'general') {
      finalInstructions += `\nExpertise Areas: ${expertise.join(', ')}`;
    }

    if (goals.some(g => g.trim())) {
      finalInstructions += `\n\nGoals:\n${goals.filter(g => g.trim()).map(g => `- ${g}`).join('\n')}`;
    }

    if (constraints.some(c => c.trim())) {
      finalInstructions += `\n\nConstraints:\n${constraints.filter(c => c.trim()).map(c => `- ${c}`).join('\n')}`;
    }

    return finalInstructions;
  };

  const resetForm = () => {
    setStep('basic');
    setName('');
    setDescription('');
    setModel('gpt-4o');
    setCategory('assistant');
    setAvatar('🤖');
    setInstructions('');
    setPersonality('');
    setTone('friendly');
    setExpertise(['general']);
    setResponseStyle('balanced');
    setGoals(['']);
    setConstraints(['']);
    setEnableCodeInterpreter(false);
    setEnableFileSearch(false);
    setEnableWebBrowsing(false);
    setEnableImageGeneration(false);
    setCustomFunctions([]);
    setTemperature(1.0);
    setTopP(1.0);
    setMaxTokens(4096);
    setFrequencyPenalty(0.0);
    setPresencePenalty(0.0);
    setResponseFormat('text');
    setStopSequences([]);
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'basic', title: 'Basic Info', description: 'Name & model', icon: 'information-circle' },
      { key: 'instructions', title: 'Instructions', description: 'Behavior & personality', icon: 'document-text' },
      { key: 'tools', title: 'Tools', description: 'Capabilities', icon: 'construct' },
      { key: 'files', title: 'Files', description: 'Knowledge base', icon: 'folder' },
      { key: 'advanced', title: 'Advanced', description: 'Fine-tuning', icon: 'settings' },
      { key: 'preview', title: 'Preview', description: 'Review & save', icon: 'eye' }
    ];

    const currentIndex = steps.findIndex(s => s.key === step);

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.stepIndicatorContainer}
        contentContainerStyle={styles.stepIndicatorContent}
      >
        {steps.map((stepInfo, index) => (
          <StepIndicator
            key={stepInfo.key}
            isActive={stepInfo.key === step}
            isCompleted={index < currentIndex}
            title={stepInfo.title}
            description={stepInfo.description}
            icon={stepInfo.icon}
            onPress={() => handleStepChange(stepInfo.key as any)}
          />
        ))}
      </ScrollView>
    );
  };

  const renderBasicStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* Avatar Selection */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Agent Avatar</Text>
        <View style={styles.avatarContainer}>
          {['🤖', '👨‍💻', '👩‍💻', '🧠', '⚡', '🎯', '🚀', '💡', '🔬', '📊'].map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.avatarOption,
                { 
                  backgroundColor: avatar === emoji ? theme.colors.primary : theme.colors.surface,
                  borderColor: avatar === emoji ? theme.colors.primary : theme.colors.border
                }
              ]}
              onPress={() => {
                setAvatar(emoji);
                Haptics.selectionAsync();
              }}
            >
              <Text style={styles.avatarEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Basic Information */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Basic Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Agent Name *</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter agent name"
            placeholderTextColor={theme.colors.textSecondary}
            maxLength={50}
            returnKeyType="next"
          />
          <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
            {name.length}/50
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what this agent does"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
            {description.length}/200
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryRow}>
              {[
                { key: 'assistant', title: 'Assistant', icon: '🤖' },
                { key: 'analyst', title: 'Analyst', icon: '📊' },
                { key: 'writer', title: 'Writer', icon: '✍️' },
                { key: 'coder', title: 'Coder', icon: '👨‍💻' },
                { key: 'researcher', title: 'Researcher', icon: '🔬' },
                { key: 'custom', title: 'Custom', icon: '⚙️' }
              ].map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: category === cat.key ? theme.colors.primary : theme.colors.surface,
                      borderColor: category === cat.key ? theme.colors.primary : theme.colors.border
                    }
                  ]}
                  onPress={() => {
                    setCategory(cat.key as any);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                  <Text style={[
                    styles.categoryText,
                    { color: category === cat.key ? '#FFFFFF' : theme.colors.text }
                  ]}>
                    {cat.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Card>

      {/* Model Selection */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>AI Model</Text>
        {availableModels.map((modelOption) => (
          <TouchableOpacity
            key={modelOption.id}
            style={[
              styles.modelOption,
              { 
                backgroundColor: model === modelOption.id ? theme.colors.primary + '20' : theme.colors.surface,
                borderColor: model === modelOption.id ? theme.colors.primary : theme.colors.border
              }
            ]}
            onPress={() => {
              setModel(modelOption.id);
              Haptics.selectionAsync();
            }}
          >
            <View style={styles.modelInfo}>
              <View style={styles.modelHeader}>
                <Text style={[
                  styles.modelName,
                  { color: model === modelOption.id ? theme.colors.primary : theme.colors.text }
                ]}>
                  {modelOption.name}
                </Text>
                {modelOption.badge && (
                  <View style={[styles.modelBadge, { backgroundColor: modelOption.color }]}>
                    <Text style={styles.modelBadgeText}>{modelOption.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.modelDescription, { color: theme.colors.textSecondary }]}>
                {modelOption.description}
              </Text>
              {modelOption.pricing && (
                <Text style={[styles.modelPricing, { color: theme.colors.textSecondary }]}>
                  ${modelOption.pricing.input_tokens_per_1k}/1K input • ${modelOption.pricing.output_tokens_per_1k}/1K output
                </Text>
              )}
            </View>
            {model === modelOption.id && (
              <View style={[styles.checkmark, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </Card>
    </ScrollView>
  );

  const renderInstructionsStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* Core Instructions */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Core Instructions</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>System Instructions *</Text>
          <TextInput
            style={[styles.input, styles.largeTextArea, { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }]}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Define how the agent should behave, its role, and responsibilities..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={6}
            maxLength={2000}
            textAlignVertical="top"
          />
          <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
            {instructions.length}/2000
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Personality</Text>
          <TextInput
            style={[styles.input, styles.textArea, { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }]}
            value={personality}
            onChangeText={setPersonality}
            placeholder="Describe the agent's personality and communication style"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
            maxLength={500}
            textAlignVertical="top"
          />
        </View>
      </Card>

      {/* Communication Style */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Communication Style</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Tone</Text>
          <View style={styles.optionRow}>
            {[
              { key: 'professional', title: 'Professional', icon: '💼' },
              { key: 'friendly', title: 'Friendly', icon: '😊' },
              { key: 'casual', title: 'Casual', icon: '😎' },
              { key: 'formal', title: 'Formal', icon: '🎩' },
              { key: 'creative', title: 'Creative', icon: '🎨' }
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionChip,
                  { 
                    backgroundColor: tone === option.key ? theme.colors.primary : theme.colors.surface,
                    borderColor: tone === option.key ? theme.colors.primary : theme.colors.border
                  }
                ]}
                onPress={() => {
                  setTone(option.key as any);
                  Haptics.selectionAsync();
                }}
              >
                <Text style={styles.optionEmoji}>{option.icon}</Text>
                <Text style={[
                  styles.optionText,
                  { color: tone === option.key ? '#FFFFFF' : theme.colors.text }
                ]}>
                  {option.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Response Style</Text>
          <View style={styles.segmentedControl}>
            {[
              { key: 'concise', title: 'Concise' },
              { key: 'balanced', title: 'Balanced' },
              { key: 'detailed', title: 'Detailed' }
            ].map((option, index) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.segmentedOption,
                  { 
                    backgroundColor: responseStyle === option.key ? theme.colors.primary : 'transparent',
                    borderRightWidth: index < 2 ? 1 : 0,
                    borderColor: theme.colors.border
                  }
                ]}
                onPress={() => {
                  setResponseStyle(option.key as any);
                  Haptics.selectionAsync();
                }}
              >
                <Text style={[
                  styles.segmentedText,
                  { color: responseStyle === option.key ? '#FFFFFF' : theme.colors.text }
                ]}>
                  {option.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>

      {/* Expertise Areas */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Expertise Areas</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={addExpertise}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.tagContainer}>
          {expertise.map((exp, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.tagText, { color: theme.colors.primary }]}>
                {exp.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              {expertise.length > 1 && (
                <TouchableOpacity
                  onPress={() => {
                    setExpertise(expertise.filter((_, i) => i !== index));
                    Haptics.selectionAsync();
                  }}
                >
                  <Ionicons name="close" size={14} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </Card>

      {/* Goals and Constraints */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Goals & Constraints</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Goals</Text>
          {goals.map((goal, index) => (
            <View key={index} style={styles.listItem}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={goal}
                onChangeText={(text) => {
                  const newGoals = [...goals];
                  newGoals[index] = text;
                  setGoals(newGoals);
                }}
                placeholder={`Goal ${index + 1}`}
                placeholderTextColor={theme.colors.textSecondary}
                returnKeyType="next"
              />
              <TouchableOpacity
                style={styles.listItemAction}
                onPress={() => {
                  if (goals.length > 1) {
                    setGoals(goals.filter((_, i) => i !== index));
                    Haptics.selectionAsync();
                  }
                }}
              >
                <Ionicons name="remove-circle" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity 
            style={[styles.addItemButton, { borderColor: theme.colors.primary }]} 
            onPress={() => {
              setGoals([...goals, '']);
              Haptics.selectionAsync();
            }}
          >
            <Ionicons name="add" size={16} color={theme.colors.primary} />
            <Text style={[styles.addItemText, { color: theme.colors.primary }]}>Add Goal</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Constraints</Text>
          {constraints.map((constraint, index) => (
            <View key={index} style={styles.listItem}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={constraint}
                onChangeText={(text) => {
                  const newConstraints = [...constraints];
                  newConstraints[index] = text;
                  setConstraints(newConstraints);
                }}
                placeholder={`Constraint ${index + 1}`}
                placeholderTextColor={theme.colors.textSecondary}
                returnKeyType="next"
              />
              <TouchableOpacity
                style={styles.listItemAction}
                onPress={() => {
                  if (constraints.length > 1) {
                    setConstraints(constraints.filter((_, i) => i !== index));
                    Haptics.selectionAsync();
                  }
                }}
              >
                <Ionicons name="remove-circle" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity 
            style={[styles.addItemButton, { borderColor: theme.colors.primary }]} 
            onPress={() => {
              setConstraints([...constraints, '']);
              Haptics.selectionAsync();
            }}
          >
            <Ionicons name="add" size={16} color={theme.colors.primary} />
            <Text style={[styles.addItemText, { color: theme.colors.primary }]}>Add Constraint</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </ScrollView>
  );

  const renderToolsStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* Built-in Tools */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Built-in Tools</Text>
        
        {[
          {
            key: 'code_interpreter',
            title: 'Code Interpreter',
            description: 'Write and execute Python code, create visualizations',
            icon: 'code-slash',
            color: theme.colors.primary,
            enabled: enableCodeInterpreter,
            onToggle: setEnableCodeInterpreter
          },
          {
            key: 'file_search',
            title: 'File Search',
            description: 'Search and analyze uploaded documents and files',
            icon: 'search',
            color: theme.colors.success,
            enabled: enableFileSearch,
            onToggle: setEnableFileSearch
          },
          {
            key: 'web_browsing',
            title: 'Web Browsing',
            description: 'Browse the internet for real-time information',
            icon: 'globe',
            color: theme.colors.info,
            enabled: enableWebBrowsing,
            onToggle: setEnableWebBrowsing
          },
          {
            key: 'image_generation',
            title: 'Image Generation',
            description: 'Create images using DALL-E',
            icon: 'image',
            color: theme.colors.accent,
            enabled: enableImageGeneration,
            onToggle: setEnableImageGeneration
          }
        ].map((tool) => (
          <View key={tool.key} style={[styles.toolOption, { borderBottomColor: theme.colors.border }]}>
            <View style={[styles.toolIcon, { backgroundColor: tool.color }]}>
              <Ionicons name={tool.icon as any} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.toolInfo}>
              <Text style={[styles.toolName, { color: theme.colors.text }]}>{tool.title}</Text>
              <Text style={[styles.toolDescription, { color: theme.colors.textSecondary }]}>
                {tool.description}
              </Text>
            </View>
            <Switch
              value={tool.enabled}
              onValueChange={(value) => {
                tool.onToggle(value);
                Haptics.selectionAsync();
              }}
              trackColor={{ false: theme.colors.border, true: tool.color }}
              thumbColor={tool.enabled ? '#FFFFFF' : theme.colors.textSecondary}
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        ))}
      </Card>

      {/* Custom Functions */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Custom Functions</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              setShowFunctionModal(true);
              Haptics.selectionAsync();
            }}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {customFunctions.length === 0 ? (
          <View style={styles.emptyFunctions}>
            <Ionicons name="construct" size={32} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No custom functions added
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Add custom functions to extend agent capabilities
            </Text>
          </View>
        ) : (
          <View style={styles.functionsList}>
            {customFunctions.map((func, index) => (
              <View key={index} style={[styles.functionItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.functionHeader}>
                  <Text style={[styles.functionName, { color: theme.colors.text }]}>{func.name}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setCustomFunctions(customFunctions.filter((_, i) => i !== index));
                      Haptics.selectionAsync();
                    }}
                  >
                    <Ionicons name="trash" size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.functionDescription, { color: theme.colors.textSecondary }]}>
                  {func.description}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );

  const renderFilesStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* Vector Store Configuration */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Vector Store</Text>
          <Switch
            value={vectorStoreEnabled}
            onValueChange={(value) => {
              setVectorStoreEnabled(value);
              Haptics.selectionAsync();
            }}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={vectorStoreEnabled ? '#FFFFFF' : theme.colors.textSecondary}
            ios_backgroundColor={theme.colors.border}
          />
        </View>
        <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
          Enable vector store for semantic search across uploaded files
        </Text>
      </Card>

      {/* Knowledge Files */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Knowledge Files</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              // File picker would go here
              Haptics.selectionAsync();
            }}
          >
            <Ionicons name="document-attach" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        {knowledgeFiles.length === 0 ? (
          <View style={styles.emptyFiles}>
            <Ionicons name="folder-open" size={32} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No files uploaded
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Upload documents, PDFs, or text files for the agent to reference
            </Text>
          </View>
        ) : (
          <View style={styles.filesList}>
            {knowledgeFiles.map((file, index) => (
              <View key={index} style={[styles.fileItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.fileIcon}>
                  <Ionicons name="document" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={[styles.fileName, { color: theme.colors.text }]}>{file.name}</Text>
                  <Text style={[styles.fileSize, { color: theme.colors.textSecondary }]}>{file.size}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setKnowledgeFiles(knowledgeFiles.filter((_, i) => i !== index));
                    Haptics.selectionAsync();
                  }}
                >
                  <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Code Files */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Code Files</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => {
              // Code file picker would go here
              Haptics.selectionAsync();
            }}
          >
            <Ionicons name="code" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        {codeFiles.length === 0 ? (
          <View style={styles.emptyFiles}>
            <Ionicons name="code-slash" size={32} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No code files uploaded
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Upload code files for analysis and assistance
            </Text>
          </View>
        ) : (
          <View style={styles.filesList}>
            {codeFiles.map((file, index) => (
              <View key={index} style={[styles.fileItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.fileIcon}>
                  <Ionicons name="code-slash" size={20} color={theme.colors.accent} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={[styles.fileName, { color: theme.colors.text }]}>{file.name}</Text>
                  <Text style={[styles.fileSize, { color: theme.colors.textSecondary }]}>{file.size}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setCodeFiles(codeFiles.filter((_, i) => i !== index));
                    Haptics.selectionAsync();
                  }}
                >
                  <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );

  const renderAdvancedStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* Model Parameters */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Model Parameters</Text>
        
        <View style={styles.sliderGroup}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: theme.colors.text }]}>Temperature</Text>
            <Text style={[styles.sliderValue, { color: theme.colors.primary }]}>{temperature.toFixed(1)}</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Text style={[styles.sliderMin, { color: theme.colors.textSecondary }]}>0.0</Text>
            <View style={styles.slider}>
              <View style={[styles.sliderTrack, { backgroundColor: theme.colors.border }]} />
              <View style={[styles.sliderProgress, { backgroundColor: theme.colors.primary, width: `${temperature * 50}%` }]} />
              <TouchableOpacity
                style={[styles.sliderThumb, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  // Slider interaction would go here
                  Haptics.selectionAsync();
                }}
              />
            </View>
            <Text style={[styles.sliderMax, { color: theme.colors.textSecondary }]}>2.0</Text>
          </View>
          <Text style={[styles.sliderDescription, { color: theme.colors.textSecondary }]}>
            Controls randomness in responses. Higher values = more creative, lower = more focused.
          </Text>
        </View>

        <View style={styles.sliderGroup}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: theme.colors.text }]}>Top P</Text>
            <Text style={[styles.sliderValue, { color: theme.colors.primary }]}>{topP.toFixed(1)}</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Text style={[styles.sliderMin, { color: theme.colors.textSecondary }]}>0.0</Text>
            <View style={styles.slider}>
              <View style={[styles.sliderTrack, { backgroundColor: theme.colors.border }]} />
              <View style={[styles.sliderProgress, { backgroundColor: theme.colors.primary, width: `${topP * 100}%` }]} />
              <TouchableOpacity
                style={[styles.sliderThumb, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  Haptics.selectionAsync();
                }}
              />
            </View>
            <Text style={[styles.sliderMax, { color: theme.colors.textSecondary }]}>1.0</Text>
          </View>
          <Text style={[styles.sliderDescription, { color: theme.colors.textSecondary }]}>
            Controls diversity via nucleus sampling. Lower values = more focused.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Max Tokens</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }]}
            value={maxTokens.toString()}
            onChangeText={(text) => {
              const num = parseInt(text) || 4096;
              setMaxTokens(Math.min(Math.max(num, 1), 128000));
            }}
            placeholder="4096"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            returnKeyType="done"
          />
          <Text style={[styles.inputDescription, { color: theme.colors.textSecondary }]}>
            Maximum number of tokens in the response (1-128,000)
          </Text>
        </View>
      </Card>

      {/* Response Format */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Response Format</Text>
        
        <View style={styles.segmentedControl}>
          {[
            { key: 'text', title: 'Text' },
            { key: 'json', title: 'JSON' }
          ].map((option, index) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.segmentedOption,
                { 
                  backgroundColor: responseFormat === option.key ? theme.colors.primary : 'transparent',
                  borderRightWidth: index < 1 ? 1 : 0,
                  borderColor: theme.colors.border
                }
              ]}
              onPress={() => {
                setResponseFormat(option.key as any);
                Haptics.selectionAsync();
              }}
            >
              <Text style={[
                styles.segmentedText,
                { color: responseFormat === option.key ? '#FFFFFF' : theme.colors.text }
              ]}>
                {option.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* System Prompt Template */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>System Prompt Template</Text>
        
        <View style={styles.templateOptions}>
          {[
            { key: 'default', title: 'Default', icon: '⚙️' },
            { key: 'creative', title: 'Creative', icon: '🎨' },
            { key: 'analytical', title: 'Analytical', icon: '📊' },
            { key: 'conversational', title: 'Conversational', icon: '💬' }
          ].map((template) => (
            <TouchableOpacity
              key={template.key}
              style={[
                styles.templateOption,
                { 
                  backgroundColor: systemPromptTemplate === template.key ? theme.colors.primary + '20' : theme.colors.surface,
                  borderColor: systemPromptTemplate === template.key ? theme.colors.primary : theme.colors.border
                }
              ]}
              onPress={() => {
                setSystemPromptTemplate(template.key);
                Haptics.selectionAsync();
              }}
            >
              <Text style={styles.templateEmoji}>{template.icon}</Text>
              <Text style={[
                styles.templateTitle,
                { color: systemPromptTemplate === template.key ? theme.colors.primary : theme.colors.text }
              ]}>
                {template.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    </ScrollView>
  );

  const renderPreviewStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* Agent Preview */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <View style={styles.previewHeader}>
          <View style={[styles.previewAvatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.previewAvatarText}>{avatar}</Text>
          </View>
          <View style={styles.previewInfo}>
            <Text style={[styles.previewName, { color: theme.colors.text }]}>{name || 'Untitled Agent'}</Text>
            <Text style={[styles.previewDescription, { color: theme.colors.textSecondary }]}>
              {description || 'No description provided'}
            </Text>
            <View style={styles.previewMeta}>
              <View style={[styles.previewBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.previewBadgeText, { color: theme.colors.primary }]}>{model}</Text>
              </View>
              <View style={[styles.previewBadge, { backgroundColor: theme.colors.success + '20' }]}>
                <Text style={[styles.previewBadgeText, { color: theme.colors.success }]}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Card>

      {/* Configuration Summary */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Configuration Summary</Text>
        
        <View style={styles.summarySection}>
          <Text style={[styles.summaryLabel, { color: theme.colors.text }]}>Instructions</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.textSecondary }]} numberOfLines={3}>
            {instructions || 'No instructions provided'}
          </Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={[styles.summaryLabel, { color: theme.colors.text }]}>Tools & Capabilities</Text>
          <View style={styles.summaryTags}>
            {enableCodeInterpreter && <View style={[styles.summaryTag, { backgroundColor: theme.colors.primary + '20' }]}><Text style={[styles.summaryTagText, { color: theme.colors.primary }]}>Code Interpreter</Text></View>}
            {enableFileSearch && <View style={[styles.summaryTag, { backgroundColor: theme.colors.success + '20' }]}><Text style={[styles.summaryTagText, { color: theme.colors.success }]}>File Search</Text></View>}
            {enableWebBrowsing && <View style={[styles.summaryTag, { backgroundColor: theme.colors.info + '20' }]}><Text style={[styles.summaryTagText, { color: theme.colors.info }]}>Web Browsing</Text></View>}
            {enableImageGeneration && <View style={[styles.summaryTag, { backgroundColor: theme.colors.accent + '20' }]}><Text style={[styles.summaryTagText, { color: theme.colors.accent }]}>Image Generation</Text></View>}
            {customFunctions.length > 0 && <View style={[styles.summaryTag, { backgroundColor: theme.colors.warning + '20' }]}><Text style={[styles.summaryTagText, { color: theme.colors.warning }]}>{customFunctions.length} Custom Functions</Text></View>}
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={[styles.summaryLabel, { color: theme.colors.text }]}>Model Parameters</Text>
          <View style={styles.parameterRow}>
            <Text style={[styles.parameterLabel, { color: theme.colors.textSecondary }]}>Temperature:</Text>
            <Text style={[styles.parameterValue, { color: theme.colors.text }]}>{temperature}</Text>
          </View>
          <View style={styles.parameterRow}>
            <Text style={[styles.parameterLabel, { color: theme.colors.textSecondary }]}>Max Tokens:</Text>
            <Text style={[styles.parameterValue, { color: theme.colors.text }]}>{maxTokens}</Text>
          </View>
          <View style={styles.parameterRow}>
            <Text style={[styles.parameterLabel, { color: theme.colors.textSecondary }]}>Response Format:</Text>
            <Text style={[styles.parameterValue, { color: theme.colors.text }]}>{responseFormat.toUpperCase()}</Text>
          </View>
        </View>
      </Card>

      {/* Test Agent */}
      <Card variant="elevated" size="md" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Test Your Agent</Text>
        <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
          Send a test message to see how your agent responds
        </Text>
        
        <View style={styles.testContainer}>
          <TextInput
            style={[styles.input, styles.testInput, { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }]}
            placeholder="Hello! How can you help me?"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // Test functionality would go here
            }}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
            <Text style={styles.testButtonText}>Test</Text>
          </TouchableOpacity>
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
      case 'files':
        return renderFilesStep();
      case 'advanced':
        return renderAdvancedStep();
      case 'preview':
        return renderPreviewStep();
      default:
        return renderBasicStep();
    }
  };

  const canGoNext = () => {
    switch (step) {
      case 'basic':
        return name.trim().length > 0;
      case 'instructions':
        return instructions.trim().length > 0;
      default:
        return true;
    }
  };

  const getNextStep = () => {
    const steps = ['basic', 'instructions', 'tools', 'files', 'advanced', 'preview'];
    const currentIndex = steps.indexOf(step);
    return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
  };

  const getPreviousStep = () => {
    const steps = ['basic', 'instructions', 'tools', 'files', 'advanced', 'preview'];
    const currentIndex = steps.indexOf(step);
    return currentIndex > 0 ? steps[currentIndex - 1] : null;
  };

  if (!visible) return null;

  return (
    <RNModal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={handleClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFillObject} 
          activeOpacity={1} 
          onPress={handleClose}
        />
      </Animated.View>

      <Animated.View 
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
            backgroundColor: theme.colors.background
          }
        ]}
        {...panResponder.panHandlers}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Handle Bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                {isEditing ? 'Edit Agent' : 'Create Agent'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                Step {['basic', 'instructions', 'tools', 'files', 'advanced', 'preview'].indexOf(step) + 1} of 6
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.actionButton, { opacity: step === 'preview' ? 1 : 0.5 }]}
              onPress={step === 'preview' ? handleSave : undefined}
              disabled={step !== 'preview' || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={[styles.actionButtonText, { color: step === 'preview' ? theme.colors.primary : theme.colors.textSecondary }]}>
                  {isEditing ? 'Update' : 'Create'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Content */}
          <KeyboardAvoidingView 
            style={styles.content}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {renderCurrentStep()}
          </KeyboardAvoidingView>

          {/* Navigation */}
          <BlurView
            intensity={isIPad ? 80 : 60}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.navigation, { borderTopColor: theme.colors.border }]}
          >
            <SafeAreaView>
              <View style={styles.navigationContent}>
                <TouchableOpacity
                  style={[
                    styles.navButton,
                    { 
                      backgroundColor: getPreviousStep() ? theme.colors.surface : 'transparent',
                      borderColor: theme.colors.border,
                      opacity: getPreviousStep() ? 1 : 0.5
                    }
                  ]}
                  onPress={() => {
                    const prevStep = getPreviousStep();
                    if (prevStep) {
                      setStep(prevStep as any);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  disabled={!getPreviousStep()}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                  <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Back</Text>
                </TouchableOpacity>

                <View style={styles.progressIndicator}>
                  {['basic', 'instructions', 'tools', 'files', 'advanced', 'preview'].map((stepName, index) => {
                    const currentIndex = ['basic', 'instructions', 'tools', 'files', 'advanced', 'preview'].indexOf(step);
                    return (
                      <View
                        key={stepName}
                        style={[
                          styles.progressDot,
                          {
                            backgroundColor: index <= currentIndex ? theme.colors.primary : theme.colors.border
                          }
                        ]}
                      />
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[
                    styles.navButton,
                    styles.nextButton,
                    { 
                      backgroundColor: canGoNext() ? theme.colors.primary : theme.colors.border,
                      opacity: canGoNext() ? 1 : 0.5
                    }
                  ]}
                  onPress={() => {
                    if (canGoNext()) {
                      const nextStep = getNextStep();
                      if (nextStep) {
                        setStep(nextStep as any);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }
                  }}
                  disabled={!canGoNext() || !getNextStep()}
                >
                  <Text style={[styles.navButtonText, { color: canGoNext() ? '#FFFFFF' : theme.colors.textSecondary }]}>
                    {step === 'preview' ? 'Ready' : 'Next'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={canGoNext() ? '#FFFFFF' : theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </BlurView>
        </SafeAreaView>
      </Animated.View>

      {/* Function Creation Modal */}
      <RNModal
        visible={showFunctionModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.functionModalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowFunctionModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Add Custom Function
            </Text>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (functionName.trim() && functionDescription.trim()) {
                  const newFunction: FunctionDefinition = {
                    name: functionName.trim(),
                    description: functionDescription.trim(),
                    parameters: JSON.parse(functionParameters || '{}')
                  };
                  setCustomFunctions([...customFunctions, newFunction]);
                  setFunctionName('');
                  setFunctionDescription('');
                  setFunctionParameters('{}');
                  setShowFunctionModal(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              }}
            >
              <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.functionModalContent}>
            <Card variant="elevated" size="md" style={styles.sectionCard}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Function Name</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  value={functionName}
                  onChangeText={setFunctionName}
                  placeholder="get_weather"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  value={functionDescription}
                  onChangeText={setFunctionDescription}
                  placeholder="Get current weather information for a location"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Parameters (JSON)</Text>
                <TextInput
                  style={[styles.input, styles.codeArea, { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
                  }]}
                  value={functionParameters}
                  onChangeText={setFunctionParameters}
                  placeholder='{"type": "object", "properties": {"location": {"type": "string"}}}'
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            </Card>
          </ScrollView>
        </SafeAreaView>
      </RNModal>
    </RNModal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  // Main container styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  safeArea: {
    flex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  actionButton: {
    width: 60,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  stepContentInner: {
    marginLeft: 42,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  
  codeArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  inputDescription: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  
  // File styles
  emptyFiles: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  filesList: {
    gap: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  fileIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
  },
  
  // Slider styles
  sliderGroup: {
    marginBottom: 24,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderMin: {
    fontSize: 12,
    marginRight: 12,
  },
  slider: {
    flex: 1,
    height: 32,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  sliderProgress: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderMax: {
    fontSize: 12,
    marginLeft: 12,
  },
  sliderDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  
  // Template styles
  templateOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateOption: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: (width - 80) / 2,
  },
  templateEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Preview styles
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  previewAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  previewAvatarText: {
    fontSize: 32,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  previewMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  previewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Summary styles
  summarySection: {
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  summaryTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  parameterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  parameterLabel: {
    fontSize: 14,
  },
  parameterValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Test styles
  testContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  testInput: {
    flex: 1,
    minHeight: 48,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Navigation styles
  navigation: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navigationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // Function modal styles
  functionModalContainer: {
    flex: 1,
  },
  functionModalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  container: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerButton: {
    minWidth: 60,
    alignItems: 'center',
    paddingVertical: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  stepIndicatorContainer: {
    maxHeight: 100,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  stepIndicatorContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 140,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },
  sectionCard: {
    marginBottom: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 50,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  largeTextArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  modelInfo: {
    flex: 1,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  modelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  modelBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modelDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  modelPricing: {
    fontSize: 12,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  optionEmoji: {
    fontSize: 14,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentedOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagContainer: {
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
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  listItemAction: {
    padding: 4,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 8,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toolOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolInfo: {
    flex: 1,
  },
  toolName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyFunctions: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  functionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  functionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  functionInfo: {
    flex: 1,
  },
  functionName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  functionDescription: {
    fontSize: 12,
  },
  removeFunctionButton: {
    padding: 8,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  backButton: {
    borderWidth: 1,
  },
  nextButton: {
    // backgroundColor set dynamically
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  functionsList: {
    gap: 12,
  },
  functionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
});

export default IOSAgentCreationModal;