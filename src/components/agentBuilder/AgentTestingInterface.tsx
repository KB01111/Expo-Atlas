import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Button, Modal } from '../ui';
import { MotiView } from '../animations';
import { agentBuilderService } from '../../services/agentBuilder';
import { 
  AgentTestConversation, 
  AgentTestMetrics, 
  AgentBuilderState 
} from '../../types/openai';
import { AppTheme } from '../../types';

const { width, height } = Dimensions.get('window');

interface AgentTestingInterfaceProps {
  builderId: string;
  builderState: AgentBuilderState;
  onTestCompleted: (metrics: AgentTestMetrics) => void;
}

interface TestMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isLoading?: boolean;
  error?: string;
}

const AgentTestingInterface: React.FC<AgentTestingInterfaceProps> = ({
  builderId,
  builderState,
  onTestCompleted
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const scrollViewRef = useRef<ScrollView>(null);

  // Test State
  const [conversations, setConversations] = useState<AgentTestConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AgentTestConversation | null>(null);
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [testMetrics, setTestMetrics] = useState<AgentTestMetrics | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<'chat' | 'scenarios' | 'metrics'>('chat');
  const [showPresetMessages, setShowPresetMessages] = useState(false);
  const [testScenarios, setTestScenarios] = useState([
    {
      id: '1',
      name: 'Basic Greeting',
      messages: [
        { role: 'user' as const, content: 'Hello! How are you today?' }
      ],
      expected: 'Friendly greeting response',
    },
    {
      id: '2',
      name: 'Task Request',
      messages: [
        { role: 'user' as const, content: 'Can you help me with a specific task?' }
      ],
      expected: 'Helpful response offering assistance',
    },
    {
      id: '3',
      name: 'Complex Query',
      messages: [
        { role: 'user' as const, content: 'I need help understanding a complex topic. Can you break it down for me?' }
      ],
      expected: 'Structured, educational response',
    },
    {
      id: '4',
      name: 'Error Handling',
      messages: [
        { role: 'user' as const, content: 'This is an intentionally unclear and confusing request with no clear purpose.' }
      ],
      expected: 'Clarifying questions or appropriate error handling',
    },
  ]);

  const presetMessages = [
    "Hello! Can you introduce yourself?",
    "What are your main capabilities?",
    "How can you help me today?",
    "Can you explain how you work?",
    "What are your limitations?",
    "Test your knowledge on a specific topic",
    "Help me solve a problem step by step",
    "Show me an example of your best work",
  ];

  useEffect(() => {
    loadTestHistory();
    calculateTestMetrics();
  }, [builderId]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const loadTestHistory = async () => {
    try {
      const testConversations = builderState.preview.test_conversations || [];
      setConversations(testConversations);
    } catch (error) {
      console.error('Error loading test history:', error);
    }
  };

  const calculateTestMetrics = async () => {
    try {
      const metrics = await agentBuilderService.calculateTestMetrics(builderId);
      setTestMetrics(metrics);
      onTestCompleted(metrics);
    } catch (error) {
      console.error('Error calculating metrics:', error);
    }
  };

  const startNewConversation = () => {
    const newConversation: AgentTestConversation = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Test ${conversations.length + 1}`,
      messages: [],
      metrics: {
        response_time_ms: 0,
        tokens_used: 0,
        cost: 0,
      },
      status: 'running',
      created_at: new Date().toISOString(),
      error: undefined,
    };

    setCurrentConversation(newConversation);
    setMessages([]);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping) return;

    const userMessage: TestMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    const loadingMessage: TestMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Create test conversation with current messages
      const conversationMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: content.trim() }
      ];

      const testConversation = await agentBuilderService.createTestConversation(
        builderId,
        currentConversation?.name || `Test ${Date.now()}`,
        conversationMessages
      );

      // Get the assistant's response from the test conversation
      const assistantResponse = testConversation.messages.find(
        m => m.role === 'assistant' && m.timestamp > userMessage.timestamp
      );

      if (assistantResponse) {
        const responseMessage: TestMessage = {
          id: `msg_${Date.now()}_assistant_response`,
          role: 'assistant',
          content: assistantResponse.content,
          timestamp: assistantResponse.timestamp,
        };

        setMessages(prev => prev.map(m => 
          m.id === loadingMessage.id ? responseMessage : m
        ));

        // Update conversation metrics
        if (currentConversation) {
          setCurrentConversation({
            ...currentConversation,
            messages: testConversation.messages,
            metrics: testConversation.metrics,
            status: testConversation.status,
            error: testConversation.error,
          });
        }

        // Update conversations list
        setConversations(prev => {
          const existingIndex = prev.findIndex(c => c.id === testConversation.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = testConversation;
            return updated;
          }
          return [testConversation, ...prev];
        });

        // Recalculate metrics
        await calculateTestMetrics();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: TestMessage = {
        id: `msg_${Date.now()}_assistant_error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message.',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      setMessages(prev => prev.map(m => 
        m.id === loadingMessage.id ? errorMessage : m
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const runTestScenario = async (scenario: typeof testScenarios[0]) => {
    try {
      Alert.alert(
        'Run Test Scenario',
        `This will run the "${scenario.name}" test scenario. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Run Test',
            onPress: async () => {
              const testConversation = await agentBuilderService.createTestConversation(
                builderId,
                scenario.name,
                scenario.messages
              );

              setConversations(prev => [testConversation, ...prev]);
              await calculateTestMetrics();
              
              Alert.alert(
                'Test Completed',
                `Scenario "${scenario.name}" completed successfully.\nResponse time: ${testConversation.metrics.response_time_ms}ms\nCost: $${testConversation.metrics.cost.toFixed(4)}`
              );
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error running test scenario:', error);
      Alert.alert('Error', 'Failed to run test scenario');
    }
  };

  const clearConversation = () => {
    Alert.alert(
      'Clear Conversation',
      'This will clear the current conversation. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            setCurrentConversation(null);
          }
        }
      ]
    );
  };

  const renderMessage = (message: TestMessage, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <MotiView
        key={message.id}
        preset="slideUp"
        delay={index * 50}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer
        ] as any}
      >
        <View style={[
          styles.messageContent,
          isUser ? styles.userMessage : styles.assistantMessage
        ]}>
          {message.isLoading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.typingIndicator}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
              <Text style={styles.loadingText}>Thinking...</Text>
            </View>
          ) : (
            <>
              <Text style={[
                styles.messageText,
                isUser ? styles.userMessageText : styles.assistantMessageText
              ]}>
                {message.content}
              </Text>
              {message.error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="warning" size={16} color={theme.colors.error} />
                  <Text style={styles.errorText}>{message.error}</Text>
                </View>
              )}
            </>
          )}
        </View>
        <Text style={styles.messageTime}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </Text>
      </MotiView>
    );
  };

  const renderChatTab = () => (
    <View style={styles.chatContainer}>
      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyChatTitle}>Start Testing Your Agent</Text>
            <Text style={styles.emptyChatDescription}>
              Send a message to begin testing your agent's responses and behavior
            </Text>
            <Button
              title="Start New Test"
              onPress={startNewConversation}
              variant="gradient"
              style={styles.startTestButton}
            />
          </View>
        ) : (
          messages.map(renderMessage)
        )}
      </ScrollView>

      {/* Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => setShowPresetMessages(true)}
          >
            <Ionicons name="list" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.messageInput}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Type your test message..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={2000}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputMessage.trim() || isTyping) && styles.sendButtonDisabled
            ]}
            onPress={() => sendMessage(inputMessage)}
            disabled={!inputMessage.trim() || isTyping}
          >
            <Ionicons 
              name={isTyping ? "hourglass" : "send"} 
              size={20} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputActions}>
          <TouchableOpacity style={styles.inputAction} onPress={clearConversation}>
            <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
            <Text style={styles.inputActionText}>Clear</Text>
          </TouchableOpacity>
          
          <Text style={styles.characterCount}>
            {inputMessage.length}/2000
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* Preset Messages Modal */}
      <Modal
        visible={showPresetMessages}
        onClose={() => setShowPresetMessages(false)}
        title="Quick Test Messages"
        size="medium"
      >
        <ScrollView style={styles.presetMessagesContainer}>
          {presetMessages.map((message, index) => (
            <TouchableOpacity
              key={index}
              style={styles.presetMessageItem}
              onPress={() => {
                setInputMessage(message);
                setShowPresetMessages(false);
              }}
            >
              <Text style={styles.presetMessageText}>{message}</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Modal>
    </View>
  );

  const renderScenariosTab = () => (
    <ScrollView style={styles.scenariosContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.tabTitle}>Test Scenarios</Text>
      <Text style={styles.tabDescription}>
        Run predefined scenarios to test specific agent behaviors
      </Text>

      <View style={styles.scenariosList}>
        {testScenarios.map((scenario, index) => (
          <Card key={scenario.id} style={styles.scenarioCard}>
            <View style={styles.scenarioHeader}>
              <Text style={styles.scenarioName}>{scenario.name}</Text>
              <Button
                title="Run Test"
                onPress={() => runTestScenario(scenario)}
                variant="outline"
                size="sm"
              />
            </View>
            
            <Text style={styles.scenarioMessage}>
              "{scenario.messages[0].content}"
            </Text>
            
            <View style={styles.scenarioExpected}>
              <Text style={styles.expectedLabel}>Expected:</Text>
              <Text style={styles.expectedText}>{scenario.expected}</Text>
            </View>
          </Card>
        ))}
      </View>

      <Card style={styles.addScenarioCard}>
        <TouchableOpacity style={styles.addScenarioButton}>
          <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          <Text style={styles.addScenarioText}>Add Custom Scenario</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );

  const renderMetricsTab = () => (
    <ScrollView style={styles.metricsContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.tabTitle}>Test Metrics</Text>
      <Text style={styles.tabDescription}>
        Performance analytics from your agent testing sessions
      </Text>

      {testMetrics ? (
        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <LinearGradient
              colors={[theme.colors.primary + '20', theme.colors.primary + '10']}
              style={styles.metricGradient}
            />
            <Ionicons name="flash" size={24} color={theme.colors.primary} />
            <Text style={styles.metricValue}>{testMetrics.total_tests}</Text>
            <Text style={styles.metricLabel}>Total Tests</Text>
          </Card>

          <Card style={styles.metricCard}>
            <LinearGradient
              colors={[theme.colors.success + '20', theme.colors.success + '10']}
              style={styles.metricGradient}
            />
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            <Text style={styles.metricValue}>
              {Math.round(testMetrics.success_rate * 100)}%
            </Text>
            <Text style={styles.metricLabel}>Success Rate</Text>
          </Card>

          <Card style={styles.metricCard}>
            <LinearGradient
              colors={[theme.colors.secondary + '20', theme.colors.secondary + '10']}
              style={styles.metricGradient}
            />
            <Ionicons name="time" size={24} color={theme.colors.secondary} />
            <Text style={styles.metricValue}>
              {Math.round(testMetrics.average_response_time)}ms
            </Text>
            <Text style={styles.metricLabel}>Avg Response</Text>
          </Card>

          <Card style={styles.metricCard}>
            <LinearGradient
              colors={[theme.colors.warning + '20', theme.colors.warning + '10']}
              style={styles.metricGradient}
            />
            <Ionicons name="trending-up" size={24} color={theme.colors.warning} />
            <Text style={styles.metricValue}>
              ${testMetrics.average_cost_per_interaction.toFixed(4)}
            </Text>
            <Text style={styles.metricLabel}>Avg Cost</Text>
          </Card>

          <Card style={styles.metricCard}>
            <LinearGradient
              colors={[theme.colors.text + '20', theme.colors.text + '10']}
              style={styles.metricGradient}
            />
            <Ionicons name="analytics" size={24} color={theme.colors.text} />
            <Text style={styles.metricValue}>{testMetrics.total_tokens_used}</Text>
            <Text style={styles.metricLabel}>Total Tokens</Text>
          </Card>

        <Card style={styles.metricCard}>
          <LinearGradient
            colors={[theme.colors.error + '20', theme.colors.error + '10']}
            style={styles.metricGradient}
          />
          <Ionicons name="warning" size={24} color={theme.colors.error} />
          <Text style={styles.metricValue}>{testMetrics.failed_tests}</Text>
          <Text style={styles.metricLabel}>Failed Tests</Text>
        </Card>
      </View>

      {testMetrics.common_failures.length > 0 && (
        <View style={styles.failuresSection}>
          <Text style={styles.failureTitle}>Common Failures</Text>
          {testMetrics.common_failures.map((f, idx) => (
            <View key={idx} style={styles.failureItem}>
              <Ionicons name="close-circle" size={16} color={theme.colors.error} />
              <Text style={styles.failureText}>{f.message} ({f.count})</Text>
            </View>
          ))}
        </View>
      )}
    ) : (
      <View style={styles.noMetricsContainer}>
        <Ionicons name="analytics-outline" size={64} color={theme.colors.textSecondary} />
        <Text style={styles.noMetricsTitle}>No Metrics Yet</Text>
        <Text style={styles.noMetricsDescription}>
            Run some tests to see performance metrics
          </Text>
        </View>
      )}

      {/* Test History */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Test History</Text>
        {conversations.length > 0 ? (
          <View style={styles.historyList}>
            {conversations.slice(0, 5).map((conversation, index) => (
              <TouchableOpacity
                key={conversation.id}
                style={styles.historyItem}
                onPress={() => {
                  setCurrentConversation(conversation);
                  setMessages(conversation.messages.map(m => ({
                    id: `${m.timestamp}_${m.role}`,
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp,
                  })));
                  setActiveTab('chat');
                }}
              >
                <View style={styles.historyInfo}>
                  <Text style={styles.historyName}>{conversation.name}</Text>
                  <Text style={styles.historyTime}>
                    {new Date(conversation.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.historyMetrics}>
                  <Text style={styles.historyMetric}>
                    {Math.round(conversation.metrics.response_time_ms)}ms
                  </Text>
                  <Text style={styles.historyMetric}>
                    ${conversation.metrics.cost.toFixed(4)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.noHistoryText}>No test history available</Text>
        )}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
          onPress={() => setActiveTab('chat')}
        >
          <Ionicons 
            name="chatbubbles" 
            size={20} 
            color={activeTab === 'chat' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabLabel,
            activeTab === 'chat' && styles.activeTabLabel
          ]}>
            Chat Test
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'scenarios' && styles.activeTab]}
          onPress={() => setActiveTab('scenarios')}
        >
          <Ionicons 
            name="list" 
            size={20} 
            color={activeTab === 'scenarios' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabLabel,
            activeTab === 'scenarios' && styles.activeTabLabel
          ]}>
            Scenarios
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'metrics' && styles.activeTab]}
          onPress={() => setActiveTab('metrics')}
        >
          <Ionicons 
            name="analytics" 
            size={20} 
            color={activeTab === 'metrics' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabLabel,
            activeTab === 'metrics' && styles.activeTabLabel
          ]}>
            Metrics
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'chat' && renderChatTab()}
        {activeTab === 'scenarios' && renderScenariosTab()}
        {activeTab === 'metrics' && renderMetricsTab()}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  activeTabLabel: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  tabDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  
  // Chat Tab Styles
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 120,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyChatTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptyChatDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  startTestButton: {
    paddingHorizontal: 32,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageContent: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  userMessage: {
    backgroundColor: theme.colors.primary,
  },
  assistantMessage: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: theme.colors.text,
  },
  messageTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginHorizontal: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.textSecondary,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  presetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.textSecondary,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  inputAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputActionText: {
    fontSize: 12,
    color: theme.colors.error,
  },
  characterCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  presetMessagesContainer: {
    maxHeight: 400,
  },
  presetMessageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  presetMessageText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    marginRight: 12,
  },

  // Scenarios Tab Styles
  scenariosContainer: {
    flex: 1,
    padding: 20,
  },
  scenariosList: {
    gap: 16,
  },
  scenarioCard: {
    padding: 16,
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scenarioName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  scenarioMessage: {
    fontSize: 14,
    color: theme.colors.text,
    fontStyle: 'italic',
    marginBottom: 12,
    paddingLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  scenarioExpected: {
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
  },
  expectedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  expectedText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  addScenarioCard: {
    marginTop: 16,
  },
  addScenarioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  addScenarioText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.primary,
  },

  // Metrics Tab Styles
  metricsContainer: {
    flex: 1,
    padding: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  metricCard: {
    width: (width - 64) / 2,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  metricGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginVertical: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  noMetricsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  noMetricsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  noMetricsDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  failuresSection: {
    marginTop: 16,
    gap: 4,
  },
  failureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  failureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  failureText: {
    fontSize: 14,
    color: theme.colors.error,
  },
  historySection: {
    marginTop: 24,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  historyMetrics: {
    alignItems: 'flex-end',
    gap: 2,
  },
  historyMetric: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '500',
  },
  noHistoryText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
});

export default AgentTestingInterface;