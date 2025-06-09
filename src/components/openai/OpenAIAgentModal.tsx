import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Button, Modal } from '../ui';
import { OpenAIAgent, OpenAIAgentConfig, OpenAIAgentTool } from '../../types/openai';
import { AppTheme } from '../../types';

interface OpenAIAgentModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (agent: OpenAIAgent) => void;
  agent?: OpenAIAgent | null;
  isEditing?: boolean;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 44,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modelSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  modelOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modelOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  modelOptionText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  modelOptionTextSelected: {
    color: '#FFFFFF',
  },
  toolSection: {
    marginTop: 16,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    marginTop: 2,
  },
  advancedSection: {
    marginTop: 8,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
  },
  templateSection: {
    marginBottom: 20,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateCard: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  templateCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  templateName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

const AVAILABLE_MODELS = [
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'gpt-4o',
  'gpt-4o-mini'
];

const AVAILABLE_TOOLS: OpenAIAgentTool[] = [
  {
    type: 'code_interpreter'
  },
  {
    type: 'file_search'
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Perform mathematical calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Mathematical expression' }
        },
        required: ['expression']
      }
    }
  }
];

const AGENT_TEMPLATES = [
  {
    id: 'assistant',
    name: 'General Assistant',
    description: 'Helpful AI assistant for general tasks',
    instructions: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user queries.',
    tools: []
  },
  {
    id: 'coder',
    name: 'Code Assistant',
    description: 'Specialized in programming and development',
    instructions: 'You are a skilled programming assistant. Help with coding, debugging, and software development tasks.',
    tools: [{ type: 'code_interpreter' as const }]
  },
  {
    id: 'researcher',
    name: 'Research Assistant',
    description: 'Helps with research and information gathering',
    instructions: 'You are a research assistant. Help gather, analyze, and summarize information on various topics.',
    tools: [{ type: 'file_search' as const }]
  },
  {
    id: 'analyst',
    name: 'Data Analyst',
    description: 'Specialized in data analysis and insights',
    instructions: 'You are a data analyst. Help analyze data, create insights, and provide recommendations.',
    tools: [{ type: 'code_interpreter' as const }, { type: 'file_search' as const }]
  }
];

const OpenAIAgentModal: React.FC<OpenAIAgentModalProps> = ({
  visible,
  onClose,
  onSave,
  agent,
  isEditing = false
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [config, setConfig] = useState<OpenAIAgentConfig>({
    name: '',
    description: '',
    model: 'gpt-4',
    instructions: '',
    tools: [],
    metadata: {},
    temperature: 0.7,
    top_p: 1.0,
    max_tokens: 1000
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (agent && isEditing) {
      setConfig({
        name: agent.name,
        description: agent.description || '',
        model: agent.model,
        instructions: agent.instructions,
        tools: agent.tools,
        metadata: agent.metadata,
        temperature: agent.temperature || 0.7,
        top_p: agent.top_p || 1.0,
        max_tokens: agent.max_tokens || 1000
      });
      
      const toolSet = new Set<string>();
      agent.tools.forEach(tool => {
        if (tool.type === 'function' && tool.function) {
          toolSet.add(tool.function.name);
        } else {
          toolSet.add(tool.type);
        }
      });
      setEnabledTools(toolSet);
    } else {
      resetForm();
    }
  }, [agent, isEditing, visible]);

  const resetForm = () => {
    setConfig({
      name: '',
      description: '',
      model: 'gpt-4',
      instructions: '',
      tools: [],
      metadata: {},
      temperature: 0.7,
      top_p: 1.0,
      max_tokens: 1000
    });
    setSelectedTemplate('');
    setEnabledTools(new Set());
    setShowAdvanced(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = AGENT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setConfig(prev => ({
        ...prev,
        name: template.name,
        description: template.description,
        instructions: template.instructions,
        tools: template.tools
      }));
      
      const toolSet = new Set<string>();
      template.tools.forEach(tool => {
        if (tool.type === 'function' && 'function' in tool && tool.function) {
          toolSet.add(tool.function.name);
        } else {
          toolSet.add(tool.type);
        }
      });
      setEnabledTools(toolSet);
    }
  };

  const handleToolToggle = (toolIdentifier: string) => {
    const newEnabledTools = new Set(enabledTools);
    if (newEnabledTools.has(toolIdentifier)) {
      newEnabledTools.delete(toolIdentifier);
    } else {
      newEnabledTools.add(toolIdentifier);
    }
    setEnabledTools(newEnabledTools);

    // Update config tools
    const selectedTools = AVAILABLE_TOOLS.filter(tool => {
      const identifier = tool.type === 'function' && tool.function 
        ? tool.function.name 
        : tool.type;
      return newEnabledTools.has(identifier);
    });
    
    setConfig(prev => ({ ...prev, tools: selectedTools }));
  };

  const handleSave = () => {
    if (!config.name.trim()) {
      Alert.alert('Error', 'Please enter a name for the agent');
      return;
    }

    if (!config.instructions.trim()) {
      Alert.alert('Error', 'Please enter instructions for the agent');
      return;
    }

    const newAgent: OpenAIAgent = {
      id: agent?.id || `openai_agent_${Date.now()}`,
      name: config.name,
      description: config.description || '',
      model: config.model,
      instructions: config.instructions,
      tools: config.tools || [],
      metadata: config.metadata || {},
      status: 'active',
      created_at: agent?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      provider: 'openai-agents',
      executions: agent?.executions || 0,
      successRate: agent?.successRate || 0,
      temperature: config.temperature,
      top_p: config.top_p,
      max_tokens: config.max_tokens
    };

    onSave(newAgent);
    onClose();
  };

  const getToolDisplayName = (tool: OpenAIAgentTool): string => {
    switch (tool.type) {
      case 'code_interpreter':
        return 'Code Interpreter';
      case 'file_search':
        return 'File Search';
      case 'function':
        return tool.function?.name || 'Custom Function';
      default:
        return tool.type;
    }
  };

  const getToolDescription = (tool: OpenAIAgentTool): string => {
    switch (tool.type) {
      case 'code_interpreter':
        return 'Execute Python code and analyze data';
      case 'file_search':
        return 'Search and retrieve information from files';
      case 'function':
        return tool.function?.description || 'Custom function capability';
      default:
        return 'Tool capability';
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Edit OpenAI Agent' : 'Create OpenAI Agent'}
      size="fullscreen"
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {!isEditing && (
          <View style={styles.templateSection}>
            <Text style={styles.sectionTitle}>Templates</Text>
            <View style={styles.templateGrid}>
              {AGENT_TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={[
                    styles.templateCard,
                    selectedTemplate === template.id && styles.templateCardSelected
                  ]}
                  onPress={() => handleTemplateSelect(template.id)}
                >
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateDescription}>{template.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={config.name}
              onChangeText={(text) => setConfig(prev => ({ ...prev, name: text }))}
              placeholder="Enter agent name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={config.description}
              onChangeText={(text) => setConfig(prev => ({ ...prev, description: text }))}
              placeholder="Describe what this agent does"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Instructions *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={config.instructions}
              onChangeText={(text) => setConfig(prev => ({ ...prev, instructions: text }))}
              placeholder="Enter detailed instructions for the agent"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model Selection</Text>
          <View style={styles.modelSelector}>
            {AVAILABLE_MODELS.map((model) => (
              <TouchableOpacity
                key={model}
                style={[
                  styles.modelOption,
                  config.model === model && styles.modelOptionSelected
                ]}
                onPress={() => setConfig(prev => ({ ...prev, model }))}
              >
                <Text style={[
                  styles.modelOptionText,
                  config.model === model && styles.modelOptionTextSelected
                ]}>
                  {model}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tools & Capabilities</Text>
          {AVAILABLE_TOOLS.map((tool, index) => {
            const identifier = tool.type === 'function' && tool.function 
              ? tool.function.name 
              : tool.type;
            
            return (
              <View key={index} style={styles.toolItem}>
                <View style={styles.toolInfo}>
                  <Text style={styles.toolName}>{getToolDisplayName(tool)}</Text>
                  <Text style={styles.toolDescription}>{getToolDescription(tool)}</Text>
                </View>
                <Switch
                  value={enabledTools.has(identifier)}
                  onValueChange={() => handleToolToggle(identifier)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={enabledTools.has(identifier) ? '#FFFFFF' : theme.colors.textSecondary}
                />
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.toolItem}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.sectionTitle}>Advanced Settings</Text>
          <Ionicons
            name={showAdvanced ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedSection}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Max Tokens</Text>
              <TextInput
                style={styles.input}
                value={config.max_tokens?.toString()}
                onChangeText={(text) => setConfig(prev => ({ 
                  ...prev, 
                  max_tokens: parseInt(text) || 1000 
                }))}
                placeholder="1000"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            style={styles.button}
          />
          <Button
            title={isEditing ? 'Update Agent' : 'Create Agent'}
            variant="primary"
            onPress={handleSave}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

export default OpenAIAgentModal;