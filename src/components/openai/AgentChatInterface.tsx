import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { Card, Button, StatusBadge } from '../ui';
import { 
  OpenAIAgent, 
  OpenAIAgentMessage, 
  OpenAIAgentExecution,
  OpenAIAgentConversation
} from '../../types/openai';
import { openaiAgentsComplete } from '../../services/openaiAgentsComplete';

interface AgentChatInterfaceProps {
  agent: OpenAIAgent;
  conversationId?: string;
  onConversationUpdate?: (conversation: OpenAIAgentConversation) => void;
  onClose?: () => void;
  style?: any;
}

interface MessageBubbleProps {
  message: OpenAIAgentMessage;
  isUser: boolean;
  theme: any;
}

const { width } = Dimensions.get('window');

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser, theme }) => {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[
      styles.messageBubble,
      isUser ? styles.userMessage : styles.agentMessage,
      { backgroundColor: isUser ? theme.colors.primary : theme.colors.surface }
    ]}>
      <Text style={[
        styles.messageText,
        { color: isUser ? theme.colors.surface : theme.colors.text }
      ]}>
        {message.content}
      </Text>
      <Text style={[
        styles.messageTime,
        { color: isUser ? theme.colors.primaryLight : theme.colors.textSecondary }
      ]}>
        {formatTimestamp(message.timestamp)}
      </Text>
      {message.tool_calls && message.tool_calls.length > 0 && (
        <View style={styles.toolCallsContainer}>
          <Text style={[styles.toolCallsTitle, { color: theme.colors.textSecondary }]}>
            Tool Calls:
          </Text>
          {message.tool_calls.map((toolCall, index) => (
            <View key={index} style={[styles.toolCall, { backgroundColor: theme.colors.border }]}>
              <Text style={[styles.toolCallName, { color: theme.colors.text }]}>
                {toolCall.function.name}
              </Text>
              <Text style={[styles.toolCallArgs, { color: theme.colors.textSecondary }]}>
                {toolCall.function.arguments}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const AgentChatInterface: React.FC<AgentChatInterfaceProps> = ({
  agent,
  conversationId,
  onConversationUpdate,
  onClose,
  style
}) => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  const scrollViewRef = useRef<ScrollView>(null);

  // State
  const [messages, setMessages] = useState<OpenAIAgentMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<OpenAIAgentConversation | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [executionStats, setExecutionStats] = useState<{
    tokensUsed: number;
    cost: number;
    responseTime: number;
  } | null>(null);

  // Load conversation on mount
  useEffect(() => {
    if (conversationId) {
      loadConversation();
    } else {
      // Create new conversation
      createNewConversation();
    }
  }, [conversationId, agent.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadConversation = async () => {
    if (!conversationId) return;

    try {
      const conversation = await openaiAgentsComplete.getConversation(conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
        setMessages(conversation.messages);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      Alert.alert('Error', 'Failed to load conversation');
    }
  };

  const createNewConversation = async () => {
    try {
      const conversation = await openaiAgentsComplete.createConversation(
        agent.id,
        `Chat with ${agent.name}`
      );
      setCurrentConversation(conversation);
      if (onConversationUpdate) {
        onConversationUpdate(conversation);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', 'Failed to create conversation');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || !currentConversation) return;

    const userMessage: OpenAIAgentMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
      thread_id: currentConversation.metadata?.thread_id,
      assistant_id: agent.metadata?.openai_assistant_id
    };

    const currentInput = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsTyping(true);

    const startTime = Date.now();

    try {
      await openaiAgentsComplete.executeAgent(
        agent.id,
        currentInput,
        {
          conversationId: currentConversation.id,
          metadata: {
            conversation_id: currentConversation.id,
            ui_source: 'chat_interface'
          },
          onMessage: (message: OpenAIAgentMessage) => {
            setIsTyping(false);
            setMessages(prev => {
              // Check if message already exists
              const exists = prev.some(m => m.id === message.id);
              if (exists) {
                return prev.map(m => m.id === message.id ? message : m);
              }
              return [...prev, message];
            });

            // Calculate stats for the execution
            const responseTime = Date.now() - startTime;
            if (message.role === 'assistant') {
              // We'll get token usage from the execution result
              setExecutionStats(prev => ({
                tokensUsed: prev?.tokensUsed || 0,
                cost: prev?.cost || 0,
                responseTime
              }));
            }
          }
        }
      );

      // Update conversation
      const updatedConversation: OpenAIAgentConversation = {
        ...currentConversation,
        messages: [...messages, userMessage],
        updated_at: new Date().toISOString()
      };

      setCurrentConversation(updatedConversation);
      
      if (onConversationUpdate) {
        onConversationUpdate(updatedConversation);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: OpenAIAgentMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        metadata: { error: true }
      };

      setMessages(prev => [...prev, errorMessage]);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const clearConversation = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            createNewConversation();
          }
        }
      ]
    );
  };

  const exportConversation = () => {
    if (messages.length === 0) {
      Alert.alert('No Messages', 'There are no messages to export.');
      return;
    }

    // Create a simple text export
    const exportText = messages.map(msg => 
      `[${new Date(msg.timestamp).toLocaleString()}] ${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n\n');

    // In a real app, you might use react-native-share or similar
    console.log('Export conversation:', exportText);
    Alert.alert('Export Ready', 'Conversation has been prepared for export. Check console for details.');
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
      <View style={styles.headerLeft}>
        <View style={[styles.agentAvatar, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="hardware-chip" size={24} color={theme.colors.surface} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.agentName, { color: theme.colors.text }]}>
            {agent.name}
          </Text>
          <View style={styles.agentMeta}>
            <StatusBadge status={agent.status} variant="subtle" />
            <Text style={[styles.agentModel, { color: theme.colors.textSecondary }]}>
              {agent.model}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerButton} onPress={exportConversation}>
          <Ionicons name="download" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} onPress={clearConversation}>
          <Ionicons name="trash" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderMessages = () => (
    <ScrollView
      ref={scrollViewRef}
      style={styles.messagesContainer}
      contentContainerStyle={styles.messagesContent}
      showsVerticalScrollIndicator={false}
    >
      {messages.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
            Start a conversation
          </Text>
          <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
            Send a message to {agent.name} to begin chatting
          </Text>
        </View>
      )}

      {messages.map((message, index) => (
        <View key={message.id || index} style={styles.messageContainer}>
          <MessageBubble
            message={message}
            isUser={message.role === 'user'}
            theme={theme}
          />
        </View>
      ))}

      {isTyping && (
        <View style={styles.messageContainer}>
          <View style={[
            styles.messageBubble,
            styles.agentMessage,
            styles.typingBubble,
            { backgroundColor: theme.colors.surface }
          ]}>
            <View style={styles.typingIndicator}>
              <View style={[styles.typingDot, { backgroundColor: theme.colors.textSecondary }]} />
              <View style={[styles.typingDot, { backgroundColor: theme.colors.textSecondary }]} />
              <View style={[styles.typingDot, { backgroundColor: theme.colors.textSecondary }]} />
            </View>
            <Text style={[styles.typingText, { color: theme.colors.textSecondary }]}>
              {agent.name} is typing...
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderStats = () => {
    if (!executionStats) return null;

    return (
      <View style={[styles.statsContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {executionStats.tokensUsed}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Tokens
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            ${executionStats.cost.toFixed(4)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Cost
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {(executionStats.responseTime / 1000).toFixed(1)}s
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Response
          </Text>
        </View>
      </View>
    );
  };

  const renderInput = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}
    >
      {renderStats()}
      
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.textInput,
            { 
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={`Message ${agent.name}...`}
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          maxLength={4000}
          editable={!isLoading}
        />
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            { 
              backgroundColor: inputText.trim() && !isLoading ? theme.colors.primary : theme.colors.border,
              opacity: inputText.trim() && !isLoading ? 1 : 0.5
            }
          ]}
          onPress={() => {
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            sendMessage();
          }}
          disabled={!inputText.trim() || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.surface} />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? theme.colors.surface : theme.colors.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputFooter}>
        <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
          {inputText.length}/4000
        </Text>
        <Text style={[styles.powerText, { color: theme.colors.textSecondary }]}>
          Powered by OpenAI
        </Text>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }, style]}>
      {renderHeader()}
      {renderMessages()}
      {renderInput()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  agentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agentModel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageBubble: {
    maxWidth: width * 0.8,
    padding: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  agentMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  typingBubble: {
    paddingVertical: 16,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 6,
    opacity: 0.8,
  },
  toolCallsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  toolCallsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  toolCall: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  toolCallName: {
    fontSize: 12,
    fontWeight: '600',
  },
  toolCallArgs: {
    fontSize: 11,
    marginTop: 2,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  typingText: {
    fontSize: 12,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  inputContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  characterCount: {
    fontSize: 12,
  },
  powerText: {
    fontSize: 12,
  },
});

export default AgentChatInterface;