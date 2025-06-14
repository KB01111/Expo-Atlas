import { supabase } from './supabase';
import { openAIAgentsService } from './openaiAgentsSimple';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ChatMessage, ChatSession } from '../types';
import { OpenAIAgent } from '../types/openai';

export interface MessageAttachment {
  id: string;
  type: 'file' | 'image' | 'voice';
  name: string;
  url: string;
  size: number;
  mime_type: string;
}

export interface StreamingMessage {
  id: string;
  session_id: string;
  content: string;
  is_streaming: boolean;
  created_at: string;
}

export interface ChatParticipant {
  id: string;
  user_id?: string;
  agent_id?: string;
  session_id: string;
  role: 'user' | 'agent' | 'assistant';
  status: 'online' | 'offline' | 'typing';
  last_seen: string;
}

class RealtimeChatService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private messageSubscriptions: Map<string, (message: ChatMessage) => void> = new Map();
  private typingSubscriptions: Map<string, (participants: ChatParticipant[]) => void> = new Map();

  // ========================================
  // SESSION MANAGEMENT
  // ========================================

  /**
   * Join a chat session with real-time subscriptions
   */
  async joinSession(
    sessionId: string,
    userId: string,
    onMessage: (message: ChatMessage) => void,
    onTyping: (participants: ChatParticipant[]) => void,
    onParticipantUpdate: (participants: ChatParticipant[]) => void
  ): Promise<void> {
    try {
      // Create or get channel
      const channelName = `chat:${sessionId}`;
      let channel = this.channels.get(channelName);
      
      if (!channel) {
        channel = supabase.channel(channelName, {
          config: {
            broadcast: { self: true },
            presence: { key: userId }
          }
        });
        this.channels.set(channelName, channel);
      }

      // Store subscriptions
      this.messageSubscriptions.set(sessionId, onMessage);
      this.typingSubscriptions.set(sessionId, onTyping);

      // Subscribe to new messages
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const message = payload.new as ChatMessage;
          onMessage(message);
        }
      );

      // Subscribe to message updates (for streaming)
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const message = payload.new as ChatMessage;
          onMessage(message);
        }
      );

      // Subscribe to typing indicators
      channel.on('broadcast', { event: 'typing' }, (payload) => {
        const typingData = payload.payload;
        onTyping(typingData.participants);
      });

      // Subscribe to presence (online/offline status)
      channel.on('presence', { event: 'sync' }, () => {
        const presenceState = channel?.presenceState() || {};
        const participants = Object.keys(presenceState).map(key => ({
          id: key,
          user_id: key,
          session_id: sessionId,
          role: 'user' as const,
          status: 'online' as const,
          last_seen: new Date().toISOString()
        }));
        onParticipantUpdate(participants);
      });

      // Track presence
      await channel.track({
        user_id: userId,
        online_at: new Date().toISOString()
      });

      await channel.subscribe();

      // Add user as participant
      await this.addParticipant(sessionId, userId, 'user');
    } catch (error) {
      console.error('Error joining chat session:', error);
      throw error;
    }
  }

  /**
   * Leave a chat session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    try {
      const channelName = `chat:${sessionId}`;
      const channel = this.channels.get(channelName);
      
      if (channel) {
        await channel.untrack();
        await channel.unsubscribe();
        this.channels.delete(channelName);
      }

      // Clean up subscriptions
      this.messageSubscriptions.delete(sessionId);
      this.typingSubscriptions.delete(sessionId);

      // Update participant status
      await this.updateParticipantStatus(sessionId, userId, 'offline');
    } catch (error) {
      console.error('Error leaving chat session:', error);
    }
  }

  // ========================================
  // MESSAGE HANDLING
  // ========================================

  /**
   * Send a message with real-time delivery
   */
  async sendMessage(
    sessionId: string,
    userId: string,
    content: string,
    attachments: MessageAttachment[] = [],
    replyToId?: string
  ): Promise<ChatMessage> {
    try {
      // Create message
      const message: Omit<ChatMessage, 'id' | 'timestamp'> = {
        session_id: sessionId,
        role: 'user',
        content,
        metadata: {
          user_id: userId,
          attachments,
          reply_to_id: replyToId,
          sent_at: new Date().toISOString(),
          delivery_status: 'sent'
        }
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(message)
        .select()
        .single();

      if (error) throw error;

      // Stop typing indicator
      await this.stopTyping(sessionId, userId);

      // Trigger agent response if needed
      const session = await this.getChatSession(sessionId);
      if (session?.metadata?.agentId) {
        await this.triggerAgentResponse(sessionId, session.metadata.agentId, content);
      }

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send streaming message (for agent responses)
   */
  async sendStreamingMessage(
    sessionId: string,
    agentId: string,
    contentStream: AsyncIterableIterator<string>
  ): Promise<ChatMessage> {
    try {
      // Create initial message
      const initialMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
        session_id: sessionId,
        role: 'agent',
        content: '',
        agent_id: agentId,
        metadata: {
          is_streaming: true,
          started_at: new Date().toISOString()
        }
      };

      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert(initialMessage)
        .select()
        .single();

      if (error) throw error;

      // Stream content
      let fullContent = '';
      for await (const chunk of contentStream) {
        fullContent += chunk;
        
        // Update message with new content
        await supabase
          .from('chat_messages')
          .update({ 
            content: fullContent,
            metadata: {
              ...message.metadata,
              is_streaming: true,
              last_updated: new Date().toISOString()
            }
          })
          .eq('id', message.id);
      }

      // Mark as complete
      const { data: finalMessage, error: updateError } = await supabase
        .from('chat_messages')
        .update({ 
          content: fullContent,
          metadata: {
            ...message.metadata,
            is_streaming: false,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', message.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return finalMessage;
    } catch (error) {
      console.error('Error sending streaming message:', error);
      throw error;
    }
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, newContent: string): Promise<ChatMessage> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .update({ 
          content: newContent,
          metadata: {
            edited: true,
            edited_at: new Date().toISOString()
          }
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          content: '[Message deleted]',
          metadata: {
            deleted: true,
            deleted_at: new Date().toISOString()
          }
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // ========================================
  // TYPING INDICATORS
  // ========================================

  /**
   * Start typing indicator
   */
  async startTyping(sessionId: string, userId: string): Promise<void> {
    try {
      const channelName = `chat:${sessionId}`;
      const channel = this.channels.get(channelName);
      
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_id: userId,
            is_typing: true,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Auto-stop typing after 3 seconds
      const existingTimeout = this.typingTimeouts.get(`${sessionId}:${userId}`);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        this.stopTyping(sessionId, userId);
      }, 3000);

      this.typingTimeouts.set(`${sessionId}:${userId}`, timeout);
    } catch (error) {
      console.error('Error starting typing indicator:', error);
    }
  }

  /**
   * Stop typing indicator
   */
  async stopTyping(sessionId: string, userId: string): Promise<void> {
    try {
      const channelName = `chat:${sessionId}`;
      const channel = this.channels.get(channelName);
      
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_id: userId,
            is_typing: false,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Clear timeout
      const timeoutKey = `${sessionId}:${userId}`;
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.typingTimeouts.delete(timeoutKey);
      }
    } catch (error) {
      console.error('Error stopping typing indicator:', error);
    }
  }

  // ========================================
  // AGENT INTEGRATION
  // ========================================

  /**
   * Trigger agent response using OpenAI
   */
  private async triggerAgentResponse(
    sessionId: string,
    agentId: string,
    userMessage: string
  ): Promise<void> {
    try {
      // Get agent details
      const agent = await this.getAgent(agentId);
      if (!agent) return;

      // Get conversation history
      const messages = await this.getRecentMessages(sessionId, 10);
      
      // Start typing indicator for agent
      await this.broadcastAgentTyping(sessionId, agentId, true);

      // Execute with OpenAI
      const response = await openAIAgentsService.executeAgent(agentId, userMessage, {
        stream: true,
        conversationHistory: messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
      });

      // Send agent response
      const agentResponse = response.output || 'Agent response completed';
      await this.sendMessage(sessionId, agentId, agentResponse, [], undefined);

      // Stop typing indicator
      await this.broadcastAgentTyping(sessionId, agentId, false);
    } catch (error) {
      console.error('Error triggering agent response:', error);
      await this.broadcastAgentTyping(sessionId, agentId, false);
    }
  }

  /**
   * Broadcast agent typing status
   */
  private async broadcastAgentTyping(
    sessionId: string,
    agentId: string,
    isTyping: boolean
  ): Promise<void> {
    try {
      const channelName = `chat:${sessionId}`;
      const channel = this.channels.get(channelName);
      
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            agent_id: agentId,
            is_typing: isTyping,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('Error broadcasting agent typing:', error);
    }
  }

  /**
   * Create streaming iterator from OpenAI stream
   */
  private async* createStreamingIterator(stream: ReadableStream<string>): AsyncIterableIterator<string> {
    const reader = stream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get chat session
   */
  private async getChatSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting chat session:', error);
      return null;
    }
  }

  /**
   * Get agent details
   */
  private async getAgent(agentId: string): Promise<OpenAIAgent | null> {
    try {
      const { data, error } = await supabase
        .from('openai_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting agent:', error);
      return null;
    }
  }

  /**
   * Get recent messages
   */
  private async getRecentMessages(sessionId: string, limit: number): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data.reverse(); // Reverse to get chronological order
    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  /**
   * Add participant to session
   */
  private async addParticipant(
    sessionId: string,
    userId: string,
    role: 'user' | 'agent'
  ): Promise<void> {
    try {
      const participant: Omit<ChatParticipant, 'id'> = {
        user_id: role === 'user' ? userId : undefined,
        agent_id: role === 'agent' ? userId : undefined,
        session_id: sessionId,
        role,
        status: 'online',
        last_seen: new Date().toISOString()
      };

      await supabase
        .from('chat_participants')
        .upsert(participant, { onConflict: 'session_id,user_id' });
    } catch (error) {
      console.error('Error adding participant:', error);
    }
  }

  /**
   * Update participant status
   */
  private async updateParticipantStatus(
    sessionId: string,
    userId: string,
    status: 'online' | 'offline' | 'typing'
  ): Promise<void> {
    try {
      await supabase
        .from('chat_participants')
        .update({ 
          status,
          last_seen: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating participant status:', error);
    }
  }

  /**
   * Get session participants
   */
  async getParticipants(sessionId: string): Promise<ChatParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('session_id', sessionId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting participants:', error);
      return [];
    }
  }

  /**
   * Search messages
   */
  async searchMessages(
    sessionId: string,
    query: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .textSearch('content', query)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    // Clear all channels
    this.channels.forEach(async (channel) => {
      await channel.unsubscribe();
    });
    this.channels.clear();

    // Clear typing timeouts
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();

    // Clear subscriptions
    this.messageSubscriptions.clear();
    this.typingSubscriptions.clear();
  }
}

export const realtimeChatService = new RealtimeChatService();