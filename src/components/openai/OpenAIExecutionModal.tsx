import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Button, Modal, StatusBadge } from '../ui';
import { OpenAIAgent, OpenAIAgentExecution, OpenAIAgentMessage } from '../../types/openai';
import { AppTheme } from '../../types';
import openAIAgentsService from '../../services/openaiAgentsSimple';

interface OpenAIExecutionModalProps {
  visible: boolean;
  onClose: () => void;
  agent: OpenAIAgent;
  onExecutionComplete?: (execution: OpenAIAgentExecution) => void;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    padding: 20,
  },
  agentInfo: {
    marginBottom: 20,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  agentDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  executionSection: {
    marginTop: 20,
  },
  executionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  executionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  messagesContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  messageItem: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  messageRole: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
    textTransform: 'capitalize',
  },
  messageTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  messageContent: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  errorContainer: {
    backgroundColor: theme.colors.error + '10',
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
  },
  toolsInfo: {
    marginTop: 12,
  },
  toolsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  toolName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});

const OpenAIExecutionModal: React.FC<OpenAIExecutionModalProps> = ({
  visible,
  onClose,
  agent,
  onExecutionComplete
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [input, setInput] = useState('');
  const [execution, setExecution] = useState<OpenAIAgentExecution | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setInput('');
    setExecution(null);
    setIsExecuting(false);
    setError(null);
  };

  const handleExecute = async () => {
    if (!input.trim()) {
      Alert.alert('Error', 'Please enter some input for the agent');
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const result = await openAIAgentsService.executeAgent(agent.id, input.trim());
      setExecution(result);
      onExecutionComplete?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      Alert.alert('Execution Error', errorMessage);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStreamExecute = async () => {
    if (!input.trim()) {
      Alert.alert('Error', 'Please enter some input for the agent');
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const result = await openAIAgentsService.streamExecution(
        agent.id, 
        input.trim(),
        (message) => {
          // Handle streaming messages
          setExecution(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: [...prev.messages, message]
            };
          });
        }
      );
      setExecution(result);
      onExecutionComplete?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      Alert.alert('Execution Error', errorMessage);
    } finally {
      setIsExecuting(false);
    }
  };

  const formatDuration = (startTime: string, endTime: string | null): string => {
    if (!endTime) return 'Running...';
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const duration = (end - start) / 1000;
    return `${duration.toFixed(2)}s`;
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return theme.colors.success;
      case 'failed':
        return theme.colors.error;
      case 'running':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Execute OpenAI Agent"
      size="fullscreen"
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Agent Information */}
        <Card variant="elevated" style={styles.agentInfo}>
          <View style={styles.agentHeader}>
            <Ionicons name="hardware-chip" size={24} color={theme.colors.primary} />
            <Text style={styles.agentName}>{agent.name}</Text>
            <StatusBadge status={agent.status} variant="subtle" />
          </View>
          {agent.description && (
            <Text style={styles.agentDescription}>{agent.description}</Text>
          )}
          
          {agent.tools.length > 0 && (
            <View style={styles.toolsInfo}>
              <Text style={styles.toolsTitle}>Available Tools:</Text>
              {agent.tools.map((tool, index) => (
                <View key={index} style={styles.toolItem}>
                  <Ionicons 
                    name="hammer" 
                    size={12} 
                    color={theme.colors.secondary} 
                  />
                  <Text style={styles.toolName}>
                    {tool.type === 'function' && tool.function 
                      ? tool.function.name 
                      : tool.type.replace('_', ' ')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Message to Agent</Text>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Enter your message or task for the agent..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            editable={!isExecuting}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title={isExecuting ? 'Executing...' : 'Execute'}
            variant="outline"
            onPress={handleExecute}
            disabled={isExecuting || !input.trim()}
            style={styles.button}
          />
          <Button
            title="Stream Execute"
            variant="primary"
            onPress={handleStreamExecute}
            disabled={isExecuting || !input.trim()}
            style={styles.button}
          />
        </View>

        {/* Loading State */}
        {isExecuting && (
          <View style={styles.loadingContainer}>
            <Ionicons name="hourglass" size={32} color={theme.colors.primary} />
            <Text style={styles.loadingText}>Agent is processing your request...</Text>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Execution Results */}
        {execution && (
          <View style={styles.executionSection}>
            <View style={styles.executionHeader}>
              <Text style={styles.executionTitle}>Execution Results</Text>
              <StatusBadge 
                status={execution.status} 
                variant="filled"
                style={{ backgroundColor: getStatusColor(execution.status) }}
              />
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{execution.tokensUsed}</Text>
                <Text style={styles.statLabel}>Tokens Used</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${execution.cost.toFixed(4)}</Text>
                <Text style={styles.statLabel}>Cost</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatDuration(execution.startTime, execution.endTime)}
                </Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
            </View>

            {/* Messages */}
            <Text style={styles.label}>Conversation</Text>
            <ScrollView style={styles.messagesContainer} nestedScrollEnabled>
              {execution.messages.length > 0 ? (
                execution.messages.map((message, index) => (
                  <View key={index} style={styles.messageItem}>
                    <View style={styles.messageHeader}>
                      <Text style={styles.messageRole}>{message.role}</Text>
                      <Text style={styles.messageTime}>
                        {formatTime(message.timestamp)}
                      </Text>
                    </View>
                    <Text style={styles.messageContent}>{message.content}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles" size={32} color={theme.colors.textSecondary} />
                  <Text style={styles.emptyText}>No messages yet</Text>
                </View>
              )}
            </ScrollView>

            {/* Final Output */}
            {execution.output && (
              <Card variant="elevated" style={{ marginTop: 16 }}>
                <Text style={styles.label}>Final Output</Text>
                <Text style={styles.messageContent}>{execution.output}</Text>
              </Card>
            )}
          </View>
        )}

        {/* Close Button */}
        <Button
          title="Close"
          variant="outline"
          onPress={onClose}
          style={{ marginTop: 20 }}
        />
      </ScrollView>
    </Modal>
  );
};

export default OpenAIExecutionModal;