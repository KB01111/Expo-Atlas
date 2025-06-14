import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { createSharedStyles } from '../../styles/shared';
import { Card, AnimatedView } from '../../components/ui';
import { supabaseService } from '../../services/supabase';
import { realtimeChatService, ChatParticipant } from '../../services/realtimeChat';
import { ChatMessage, ChatSession } from '../../types';

interface ChatScreenProps {
  sessionId?: string;
  agentId?: string;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ sessionId, agentId }) => {
  const { theme } = useTheme();
  const { userId } = useAuth();
  const sharedStyles = createSharedStyles(theme);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [typingUsers, setTypingUsers] = useState<ChatParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Real-time message handler
  const handleNewMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      // Update existing message if it's a streaming update
      const existingIndex = prev.findIndex(m => m.id === message.id);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = message;
        return updated;
      }
      // Add new message
      return [...prev, message];
    });
    
    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Typing indicator handler
  const handleTypingUpdate = useCallback((typingParticipants: ChatParticipant[]) => {
    setTypingUsers(typingParticipants.filter(p => p.status === 'typing'));
  }, []);

  // Participant update handler
  const handleParticipantUpdate = useCallback((updatedParticipants: ChatParticipant[]) => {
    setParticipants(updatedParticipants);
  }, []);

  useEffect(() => {
    if (sessionId && userId) {
      loadChatSession();
      loadMessages();
      joinRealtimeSession();
    } else if (userId) {
      createNewSession();
    }

    // Cleanup on unmount
    return () => {
      if (sessionId && userId) {
        realtimeChatService.leaveSession(sessionId, userId);
      }
    };
  }, [sessionId, agentId, userId]);

  // Join real-time session
  const joinRealtimeSession = async () => {
    if (!sessionId || !userId) return;

    try {
      await realtimeChatService.joinSession(
        sessionId,
        userId,
        handleNewMessage,
        handleTypingUpdate,
        handleParticipantUpdate
      );
      setIsConnected(true);
    } catch (error) {
      console.error('Error joining real-time session:', error);
      Alert.alert('Connection Error', 'Failed to connect to real-time chat');
    }
  };

  const createNewSession = async () => {
    if (!userId) return;
    
    try {
      const newSession: Omit<ChatSession, 'id' | 'created_at' | 'last_active'> = {
        name: `Chat with ${agentId ? 'Agent' : 'Assistant'}`,
        user_id: userId,
        status: 'active',
        metadata: { agentId }
      };

      const sessionData = await supabaseService.createChatSession(newSession);
      setSession(sessionData);
    } catch (error) {
      console.error('Error creating chat session:', error);
    }
  };

  const loadChatSession = async () => {
    // Load session details
  };

  const loadMessages = async () => {
    if (!sessionId) return;
    
    try {
      const messages = await supabaseService.getChatMessages(sessionId);
      setMessages(messages);
      
      // Add welcome message if no messages exist
      if (messages.length === 0) {
        const welcomeMessage = await supabaseService.createChatMessage({
          session_id: sessionId,
          role: 'system',
          content: 'Hello! How can I help you today?'
        });
        if (welcomeMessage) {
          setMessages([welcomeMessage]);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading || !session || !userId) return;

    const messageContent = inputText.trim();
    setInputText('');
    setLoading(true);

    try {
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      await realtimeChatService.stopTyping(session.id, userId);

      // Send message via real-time service
      await realtimeChatService.sendMessage(
        session.id,
        userId,
        messageContent
      );

      // Clear input and focus
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // Handle typing indicator
  const handleInputChange = async (text: string) => {
    setInputText(text);

    if (!session || !userId) return;

    // Start typing indicator
    await realtimeChatService.startTyping(session.id, userId);

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(async () => {
      await realtimeChatService.stopTyping(session.id, userId);
    }, 1000);
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    return (
      <AnimatedView animation="slideUp" delay={index * 50}>
        <View style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.agentMessageContainer
        ]}>
          {!isUser && !isSystem && (
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="person" size={16} color="#FFFFFF" />
            </View>
          )}
          
          <View style={[
            styles.messageBubble,
            isUser ? 
              { backgroundColor: theme.colors.primary } : 
              isSystem ? 
                { backgroundColor: theme.colors.warning } :
                { backgroundColor: theme.colors.surface }
          ]}>
            <Text style={[
              styles.messageText,
              { color: isUser || isSystem ? '#FFFFFF' : theme.colors.text }
            ]}>
              {item.content}
            </Text>
            <Text style={[
              styles.messageTime,
              { color: isUser || isSystem ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textSecondary }
            ]}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>

          {isUser && (
            <View style={[styles.avatar, { backgroundColor: theme.colors.secondary }]}>
              <Ionicons name="person-outline" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>
      </AnimatedView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={theme.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {session?.name || 'New Chat'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {agentId ? `Agent ${agentId.slice(0, 8)}` : 'Assistant'}
            </Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        showsVerticalScrollIndicator={false}
      />

      {(loading || typingUsers.length > 0) && (
        <View style={styles.typingIndicator}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="person" size={16} color="#FFFFFF" />
          </View>
          <View style={[styles.typingBubble, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.typingText, { color: theme.colors.textSecondary }]}>
              {loading ? 'Sending...' : 
               typingUsers.length > 0 ? `${typingUsers.length === 1 ? 'Someone is' : 'People are'} typing...` : 
               'Agent is typing...'}
            </Text>
          </View>
        </View>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <View style={[styles.connectionStatus, { backgroundColor: theme.colors.warning }]}>
          <Ionicons name="wifi-outline" size={16} color="#FFFFFF" />
          <Text style={styles.connectionText}>Reconnecting...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={[styles.inputRow, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: theme.colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() ? theme.colors.primary : theme.colors.textSecondary }
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#F1F5F9',
    opacity: 0.8,
  },
  messagesList: {
    padding: 16,
    gap: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  agentMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 12,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  typingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 12,
  },
  attachButton: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  connectionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ChatScreen;