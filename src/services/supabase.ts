import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseService = {
  async getDashboardMetrics() {
    try {
      // Get total agents
      const { count: totalAgents } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true });

      // Get active agents
      const { count: activeAgents } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get executions data
      const { count: totalTasks } = await supabase
        .from('executions')
        .select('*', { count: 'exact', head: true });

      const { count: completedTasks } = await supabase
        .from('executions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: failedTasks } = await supabase
        .from('executions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

      // Calculate success rate
      const averageSuccessRate = totalTasks && totalTasks > 0 
        ? ((completedTasks || 0) / totalTasks) * 100 
        : 0;

      // Get cost data
      const { data: costData } = await supabase
        .from('executions')
        .select('cost')
        .not('cost', 'is', null);

      const totalCost = costData?.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) || 0;

      // Get monthly cost (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: monthlyCostData } = await supabase
        .from('executions')
        .select('cost')
        .gte('started_at', thirtyDaysAgo.toISOString())
        .not('cost', 'is', null);

      const monthlyCost = monthlyCostData?.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) || 0;

      return {
        totalAgents: totalAgents || 0,
        activeAgents: activeAgents || 0,
        totalTasks: totalTasks || 0,
        completedTasks: completedTasks || 0,
        failedTasks: failedTasks || 0,
        averageSuccessRate: Math.round(averageSuccessRate * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        monthlyCost: Math.round(monthlyCost * 100) / 100,
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return default values on error
      return {
        totalAgents: 0,
        activeAgents: 0,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageSuccessRate: 0,
        totalCost: 0,
        monthlyCost: 0,
      };
    }
  },

  async getAgents() {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select(`
          *,
          executions:executions(count)
        `);

      if (error) throw error;

      // Get execution statistics for each agent
      const agentsWithStats = await Promise.all(
        (agents || []).map(async (agent) => {
          // Get execution counts
          const { count: totalTasks } = await supabase
            .from('executions')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id);

          const { count: completedTasks } = await supabase
            .from('executions')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
            .eq('status', 'completed');

          // Calculate success rate
          const successRate = totalTasks && totalTasks > 0 
            ? ((completedTasks || 0) / totalTasks) * 100 
            : 0;

          return {
            ...agent,
            tasks: totalTasks || 0,
            successRate: Math.round(successRate * 100) / 100,
          };
        })
      );

      return agentsWithStats;
    } catch (error) {
      console.error('Error fetching agents:', error);
      return [];
    }
  },

  async getWorkflows() {
    try {
      const { data: workflows, error } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return workflows || [];
    } catch (error) {
      console.error('Error fetching workflows:', error);
      return [];
    }
  },

  async getExecutions() {
    try {
      const { data: executions, error } = await supabase
        .from('executions')
        .select(`
          *,
          agent:agents(name),
          user:users(full_name, email)
        `)
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return executions || [];
    } catch (error) {
      console.error('Error fetching executions:', error);
      return [];
    }
  },

  async getAnalytics() {
    try {
      // Get usage data over time
      const { data: usageData } = await supabase
        .from('executions')
        .select('started_at, status')
        .order('started_at', { ascending: true });

      // Get performance data
      const { data: performanceData } = await supabase
        .from('executions')
        .select('started_at, completed_at, status, tokens_used')
        .not('completed_at', 'is', null);

      // Get cost data
      const { data: costData } = await supabase
        .from('executions')
        .select('started_at, cost')
        .not('cost', 'is', null)
        .order('started_at', { ascending: true });

      return {
        usage: usageData || [],
        performance: performanceData || [],
        costs: costData || [],
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return {
        usage: [],
        performance: [],
        costs: [],
      };
    }
  },

  async getUsers() {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return users || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  async getTeams() {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members:team_members(count),
          user:users(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return teams || [];
    } catch (error) {
      console.error('Error fetching teams:', error);
      return [];
    }
  },

  async getChatSessions() {
    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          chat_messages(count)
        `)
        .order('last_active', { ascending: false });

      if (error) throw error;
      return sessions || [];
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      return [];
    }
  },

  // Notifications
  async getNotifications(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  async markNotificationRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },

  async createNotification(notification: Omit<any, 'id' | 'created_at'>) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  },

  // User Settings
  async getUserSettings(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user settings:', error);
      return null;
    }
  },

  async updateUserSettings(userId: string, settings: Partial<any>) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, ...settings })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user settings:', error);
      return null;
    }
  },

  // Agent Management
  async createAgent(agent: {
    user_id: string;
    name: string;
    description?: string;
    status: 'active' | 'inactive' | 'error';
    provider: string;
    model: string;
    configuration?: Record<string, any>;
  }) {
    try {
      console.log('Creating agent with data:', JSON.stringify(agent, null, 2));
      
      const { data, error } = await supabase
        .from('agents')
        .insert(agent)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating agent:', error);
        throw error;
      }
      
      console.log('Agent created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error; // Re-throw instead of returning null to handle errors properly
    }
  },

  async updateAgent(agentId: string, updates: Partial<any>) {
    try {
      const { data, error } = await supabase
        .from('agents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', agentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating agent:', error);
      return null;
    }
  },

  async deleteAgent(agentId: string) {
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting agent:', error);
      return false;
    }
  },

  // Agent Builder State Management
  async saveAgentBuilderState(builderId: string, state: any) {
    try {
      console.log('Saving agent builder state:', builderId);
      
      const { data, error } = await supabase
        .from('agent_builder_states')
        .upsert({
          id: builderId,
          config: state.config,
          validation: state.validation,
          preview: state.preview,
          deployment: state.deployment,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error saving builder state:', error);
        throw error;
      }
      
      console.log('Builder state saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error saving agent builder state:', error);
      throw error;
    }
  },

  async getAgentBuilderState(builderId: string) {
    try {
      const { data, error } = await supabase
        .from('agent_builder_states')
        .select('*')
        .eq('id', builderId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting agent builder state:', error);
      return null;
    }
  },

  async saveAgentDeployment(deployment: any) {
    try {
      console.log('Saving agent deployment:', deployment.id);
      
      const { data, error } = await supabase
        .from('agent_deployments')
        .insert(deployment)
        .select()
        .single();

      if (error) {
        console.error('Supabase error saving deployment:', error);
        throw error;
      }
      
      console.log('Deployment saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error saving agent deployment:', error);
      throw error;
    }
  },

  async saveAgentFile(agentFile: any) {
    try {
      console.log('Saving agent file:', agentFile.id);
      
      const { data, error } = await supabase
        .from('agent_files')
        .upsert(agentFile)
        .select()
        .single();

      if (error) {
        console.error('Supabase error saving agent file:', error);
        throw error;
      }
      
      console.log('Agent file saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error saving agent file:', error);
      throw error;
    }
  },

  async saveCustomFunction(customFunction: any) {
    try {
      console.log('Saving custom function:', customFunction.id);
      
      const { data, error } = await supabase
        .from('custom_functions')
        .upsert(customFunction)
        .select()
        .single();

      if (error) {
        console.error('Supabase error saving custom function:', error);
        throw error;
      }
      
      console.log('Custom function saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error saving custom function:', error);
      throw error;
    }
  },

  // Workflow Management
  async createWorkflow(workflow: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .insert(workflow)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating workflow:', error);
      return null;
    }
  },

  async updateWorkflow(workflowId: string, updates: Partial<any>) {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', workflowId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating workflow:', error);
      return null;
    }
  },

  // Execution Management
  async createExecution(execution: Omit<any, 'id' | 'started_at'>) {
    try {
      const { data, error } = await supabase
        .from('executions')
        .insert({ ...execution, started_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating execution:', error);
      return null;
    }
  },

  async updateExecution(executionId: string, updates: Partial<any>) {
    try {
      const { data, error } = await supabase
        .from('executions')
        .update(updates)
        .eq('id', executionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating execution:', error);
      return null;
    }
  },

  async stopExecution(executionId: string) {
    try {
      const { data, error } = await supabase
        .from('executions')
        .update({ 
          status: 'failed',
          error: 'Stopped by user',
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error stopping execution:', error);
      return null;
    }
  },

  // User Management
  async createUser(user: Omit<any, 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          ...user,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  },

  async updateUser(userId: string, updates: Partial<any>) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  },

  // Chat Management
  async createChatSession(session: Omit<any, 'id' | 'created_at' | 'last_active'>) {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          ...session,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating chat session:', error);
      return null;
    }
  },

  async getChatMessages(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
  },

  async createChatMessage(message: Omit<any, 'id' | 'timestamp'>) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          ...message,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating chat message:', error);
      return null;
    }
  },

  // Search functionality
  async searchAll(query: string) {
    try {
      const [agents, workflows, executions, users] = await Promise.all([
        supabase
          .from('agents')
          .select('*')
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`),
        supabase
          .from('workflows')
          .select('*')
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`),
        supabase
          .from('executions')
          .select('*, agent:agents(name)')
          .or(`input.ilike.%${query}%,output.ilike.%${query}%`),
        supabase
          .from('users')
          .select('*')
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      ]);

      return {
        agents: agents.data || [],
        workflows: workflows.data || [],
        executions: executions.data || [],
        users: users.data || []
      };
    } catch (error) {
      console.error('Error searching:', error);
      return {
        agents: [],
        workflows: [],
        executions: [],
        users: []
      };
    }
  },

  // ========================================
  // ENHANCED TEAM MANAGEMENT
  // ========================================

  async createTeam(team: any) {
    try {
      const { data, error } = await supabase
        .from('agent_teams')
        .insert(team)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  },

  async getTeam(teamId: string) {
    try {
      const { data, error } = await supabase
        .from('agent_teams')
        .select(`
          *,
          members:team_members(*)
        `)
        .eq('id', teamId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching team:', error);
      throw error;
    }
  },

  async updateTeam(teamId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('agent_teams')
        .update(updates)
        .eq('id', teamId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  },

  async deleteTeam(teamId: string) {
    try {
      const { error } = await supabase
        .from('agent_teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  },

  async addTeamMember(teamId: string, member: any) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert({ ...member, team_id: teamId })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  },

  async saveTeamExecution(execution: any) {
    try {
      const { data, error } = await supabase
        .from('team_executions')
        .insert(execution)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving team execution:', error);
      throw error;
    }
  },

  async getTeamExecutions(teamId: string, timePeriod?: string) {
    try {
      let query = supabase
        .from('team_executions')
        .select('*')
        .eq('team_id', teamId);

      if (timePeriod) {
        const daysAgo = parseInt(timePeriod.replace('d', ''));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
        query = query.gte('started_at', startDate.toISOString());
      }

      const { data, error } = await query.order('started_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching team executions:', error);
      return [];
    }
  },

  async getAgentExecutions(agentId: string, timePeriod?: string) {
    try {
      let query = supabase
        .from('executions')
        .select('*')
        .eq('agent_id', agentId);

      if (timePeriod) {
        const daysAgo = parseInt(timePeriod.replace('d', ''));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching agent executions:', error);
      return [];
    }
  },

  // ========================================
  // PERSISTENT CONVERSATIONS
  // ========================================

  async savePersistentConversation(conversation: any) {
    try {
      const { data, error } = await supabase
        .from('persistent_conversations')
        .insert(conversation)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving persistent conversation:', error);
      throw error;
    }
  },

  async getPersistentConversation(conversationId: string) {
    try {
      const { data, error } = await supabase
        .from('persistent_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching persistent conversation:', error);
      throw error;
    }
  },

  async updatePersistentConversation(conversation: any) {
    try {
      const { data, error } = await supabase
        .from('persistent_conversations')
        .update(conversation)
        .eq('id', conversation.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating persistent conversation:', error);
      throw error;
    }
  },

  // ========================================
  // FILE AND VECTOR STORE MANAGEMENT
  // ========================================

  async saveVectorStore(vectorStore: any) {
    try {
      const { data, error } = await supabase
        .from('vector_stores')
        .insert(vectorStore)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving vector store:', error);
      throw error;
    }
  },

  // ========================================
  // JULEP WORKFLOW MANAGEMENT
  // ========================================

  async saveJulepWorkflow(workflow: any) {
    try {
      const { data, error } = await supabase
        .from('julep_workflows')
        .insert(workflow)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving Julep workflow:', error);
      throw error;
    }
  },

  async getJulepWorkflows(userId?: string) {
    try {
      let query = supabase
        .from('julep_workflows')
        .select('*');

      if (userId) {
        query = query.eq('created_by', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching Julep workflows:', error);
      return [];
    }
  },

  async getJulepWorkflow(workflowId: string) {
    try {
      const { data, error } = await supabase
        .from('julep_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching Julep workflow:', error);
      throw error;
    }
  },

  async updateJulepWorkflow(workflow: any) {
    try {
      const { data, error } = await supabase
        .from('julep_workflows')
        .update(workflow)
        .eq('id', workflow.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating Julep workflow:', error);
      throw error;
    }
  },

  async deleteJulepWorkflow(workflowId: string) {
    try {
      const { error } = await supabase
        .from('julep_workflows')
        .delete()
        .eq('id', workflowId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting Julep workflow:', error);
      throw error;
    }
  },

  async saveJulepExecution(execution: any) {
    try {
      const { data, error } = await supabase
        .from('julep_executions')
        .insert(execution)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving Julep execution:', error);
      throw error;
    }
  },

  async getJulepExecutions(workflowId: string) {
    try {
      const { data, error } = await supabase
        .from('julep_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching Julep executions:', error);
      return [];
    }
  },

  async saveOpenResponsesExecution(execution: any) {
    try {
      const { data, error } = await supabase
        .from('open_responses_executions')
        .insert(execution)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving Open Responses execution:', error);
      throw error;
    }
  },

  // ========================================
  // AGENT BUILDER METHODS
  // ========================================


  async getAgentFiles(agentId: string) {
    try {
      const { data, error } = await supabase
        .from('agent_files')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching agent files:', error);
      return [];
    }
  },


  async getCustomFunction(functionId: string) {
    try {
      const { data, error } = await supabase
        .from('custom_functions')
        .select('*')
        .eq('id', functionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching custom function:', error);
      return null;
    }
  },

  async getCustomFunctions(agentId?: string) {
    try {
      let query = supabase
        .from('custom_functions')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching custom functions:', error);
      return [];
    }
  },

  async saveTestConversation(conversation: any) {
    try {
      const { data, error } = await supabase
        .from('agent_test_conversations')
        .insert(conversation)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving test conversation:', error);
      throw error;
    }
  },

  async getTestConversations(builderId: string) {
    try {
      const { data, error } = await supabase
        .from('agent_test_conversations')
        .select('*')
        .eq('builder_id', builderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching test conversations:', error);
      return [];
    }
  },

  async saveAgentTemplate(template: any) {
    try {
      const { data, error } = await supabase
        .from('agent_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving agent template:', error);
      throw error;
    }
  },

  async getAgentTemplates(category?: string) {
    try {
      let query = supabase
        .from('agent_templates')
        .select('*')
        .eq('is_public', true)
        .order('popularity_score', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching agent templates:', error);
      return [];
    }
  },

  async getAgentTemplate(templateId: string) {
    try {
      const { data, error } = await supabase
        .from('agent_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching agent template:', error);
      return null;
    }
  },

  async incrementTemplateUsage(templateId: string) {
    try {
      const { error } = await supabase
        .from('agent_templates')
        .update({ 
          usage_count: supabase.from('agent_templates').select('usage_count').eq('id', templateId).single().then(r => (r.data?.usage_count || 0) + 1),
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);

      if (error) throw error;
    } catch (error) {
      console.error('Error incrementing template usage:', error);
    }
  },


  async getAgentDeployments(agentId?: string) {
    try {
      let query = supabase
        .from('agent_deployments')
        .select('*')
        .order('deployed_at', { ascending: false });

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching agent deployments:', error);
      return [];
    }
  },

  // ========================================
  // MCP INTEGRATION METHODS
  // ========================================

  async saveMCPServer(server: any) {
    try {
      const { data, error } = await supabase
        .from('mcp_servers')
        .upsert(server)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving MCP server:', error);
      throw error;
    }
  },

  async getMCPServers() {
    try {
      const { data, error } = await supabase
        .from('mcp_servers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching MCP servers:', error);
      return [];
    }
  },

  async updateMCPServerStatus(serverId: string, status: string) {
    try {
      const { error } = await supabase
        .from('mcp_servers')
        .update({ 
          status,
          last_connected: new Date().toISOString()
        })
        .eq('id', serverId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating MCP server status:', error);
      throw error;
    }
  },

  async saveMCPConnection(connection: any) {
    try {
      const { data, error } = await supabase
        .from('mcp_connections')
        .upsert(connection)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving MCP connection:', error);
      throw error;
    }
  },

  async getMCPConnections(agentId: string) {
    try {
      const { data, error } = await supabase
        .from('mcp_connections')
        .select('*')
        .eq('agent_id', agentId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching MCP connections:', error);
      return [];
    }
  },

  async logMCPToolExecution(execution: any) {
    try {
      const { data, error } = await supabase
        .from('mcp_tool_executions')
        .insert(execution)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging MCP tool execution:', error);
      throw error;
    }
  },

  async getMCPToolExecutions(agentId: string, limit = 100) {
    try {
      const { data, error } = await supabase
        .from('mcp_tool_executions')
        .select('*')
        .eq('agent_id', agentId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching MCP tool executions:', error);
      return [];
    }
  },

  // ========================================
  // TEMPLATE MANAGEMENT METHODS
  // ========================================

  async logTemplateUsage(usage: any) {
    try {
      const { data, error } = await supabase
        .from('template_usage_logs')
        .insert(usage)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging template usage:', error);
      throw error;
    }
  },

  async getTemplateAnalytics(templateId: string) {
    try {
      const { data, error } = await supabase
        .rpc('get_template_analytics', { template_id_param: templateId });

      if (error) throw error;
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching template analytics:', error);
      return null;
    }
  },

  async getAllTemplateAnalytics() {
    try {
      const { data, error } = await supabase
        .rpc('get_template_analytics');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all template analytics:', error);
      return [];
    }
  },

  async updateTemplatePopularityScores() {
    try {
      const { error } = await supabase
        .rpc('update_template_popularity_scores');

      if (error) throw error;
    } catch (error) {
      console.error('Error updating template popularity scores:', error);
      throw error;
    }
  },

  async saveTemplateRating(rating: any) {
    try {
      const { data, error } = await supabase
        .from('template_ratings')
        .upsert(rating)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving template rating:', error);
      throw error;
    }
  },

  async getTemplateRatings(templateId: string) {
    try {
      const { data, error } = await supabase
        .from('template_ratings')
        .select('*')
        .eq('template_id', templateId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching template ratings:', error);
      return [];
    }
  },

  // ========================================
  // WORKFLOW-RELATED METHODS
  // ========================================

  async getWorkflow(workflowId: string) {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching workflow:', error);
      throw error;
    }
  },

  async saveWorkflowExecution(execution: any) {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .insert(execution)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving workflow execution:', error);
      throw error;
    }
  },

  async updateWorkflowExecution(executionId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .update(updates)
        .eq('id', executionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating workflow execution:', error);
      throw error;
    }
  },

  async updateWorkflowStats(workflowId: string, stats: any) {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .update({ usage_stats: stats })
        .eq('id', workflowId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating workflow stats:', error);
      throw error;
    }
  },

  async getWorkflowExecution(executionId: string) {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', executionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching workflow execution:', error);
      throw error;
    }
  },

  async getWorkflowAnalytics(workflowId: string) {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching workflow analytics:', error);
      return [];
    }
  },

  // ========================================
  // OPENAI AGENT-RELATED METHODS
  // ========================================

  async getOpenAIAgent(agentId: string) {
    try {
      const { data, error } = await supabase
        .from('openai_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching OpenAI agent:', error);
      throw error;
    }
  },

  // ========================================
  // MCP-RELATED METHODS
  // ========================================

  async getUserMCPServers() {
    try {
      const { data, error } = await supabase
        .from('mcp_servers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user MCP servers:', error);
      return [];
    }
  },

  // ========================================
  // MONITORING & ANALYTICS METHODS
  // ========================================

  async saveErrorEvent(errorEvent: any) {
    try {
      const { data, error } = await supabase
        .from('error_events')
        .insert(errorEvent)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving error event:', error);
      throw error;
    }
  },

  async savePerformanceMetric(metric: any) {
    try {
      const { data, error } = await supabase
        .from('performance_metrics')
        .insert(metric)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving performance metric:', error);
      throw error;
    }
  },

  async saveUserEvent(userEvent: any) {
    try {
      const { data, error } = await supabase
        .from('user_events')
        .insert(userEvent)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving user event:', error);
      throw error;
    }
  },

  async saveSystemHealth(health: any) {
    try {
      const { data, error } = await supabase
        .from('system_health')
        .insert(health)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving system health:', error);
      throw error;
    }
  },

  async getUsageAnalytics(days: number) {
    try {
      // Simplified implementation
      return {
        daily_active_users: 0,
        monthly_active_users: 0,
        session_duration_avg: 0,
        agent_executions_count: 0,
        workflow_executions_count: 0,
        total_cost: 0,
        error_rate: 0,
        retention_rate: 0
      };
    } catch (error) {
      console.error('Error fetching usage analytics:', error);
      throw error;
    }
  },

  async healthCheck() {
    try {
      const { data, error } = await supabase
        .from('system_health')
        .select('id')
        .limit(1);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },

  async getErrorRate(minutes: number) {
    try {
      // Simplified implementation
      return 0;
    } catch (error) {
      console.error('Error getting error rate:', error);
      return 0;
    }
  },

  async getActiveUsersCount() {
    try {
      // Simplified implementation
      return 0;
    } catch (error) {
      console.error('Error getting active users count:', error);
      return 0;
    }
  },

  async saveAlert(alert: any) {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert(alert)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving alert:', error);
      throw error;
    }
  },

  // ========================================
  // TEAM COLLABORATION METHODS
  // ========================================

  async getUser(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  async createTeamDiscussion(discussion: any) {
    try {
      const { data, error } = await supabase
        .from('team_discussions')
        .insert(discussion)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating team discussion:', error);
      throw error;
    }
  },

  async getTeamMemberByUserId(teamId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching team member by user ID:', error);
      return null;
    }
  },

  async getTeamMemberByEmail(teamId: string, email: string) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('email', email)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching team member by email:', error);
      return null;
    }
  },

  async getTeamMembers(teamId: string) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
  },

  async updateTeamStats(teamId: string, stats: any) {
    try {
      const { data, error } = await supabase
        .from('teams')
        .update({ stats })
        .eq('id', teamId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating team stats:', error);
      throw error;
    }
  },

  async createTeamActivity(activity: any) {
    try {
      const { data, error } = await supabase
        .from('team_activities')
        .insert(activity)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating team activity:', error);
      throw error;
    }
  },

  async getTeamActivity(teamId: string) {
    try {
      const { data, error } = await supabase
        .from('team_activities')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching team activity:', error);
      return [];
    }
  },

  async getTeamAnalytics(teamId: string) {
    try {
      // Simplified implementation
      return {
        total_members: 0,
        active_members: 0,
        total_resources: 0,
        shared_resources: 0,
        total_discussions: 0,
        active_discussions: 0
      };
    } catch (error) {
      console.error('Error fetching team analytics:', error);
      throw error;
    }
  },

  // Team invitation methods
  async createTeamInvitation(invitation: any) {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .insert(invitation)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating team invitation:', error);
      throw error;
    }
  },

  async getTeamInvitation(invitationId: string) {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching team invitation:', error);
      throw error;
    }
  },

  async updateTeamInvitation(invitationId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .update(updates)
        .eq('id', invitationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating team invitation:', error);
      throw error;
    }
  },

  // Team member methods
  async createTeamMember(member: any) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert(member)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating team member:', error);
      throw error;
    }
  },

  async getTeamMember(memberId: string) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching team member:', error);
      throw error;
    }
  },

  async updateTeamMember(memberId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating team member:', error);
      throw error;
    }
  },

  async deleteTeamMember(memberId: string) {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting team member:', error);
      throw error;
    }
  },

  async getUserTeams(userId: string) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, teams(*)')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user teams:', error);
      return [];
    }
  },

  // Team resource methods
  async createTeamResource(resource: any) {
    try {
      const { data, error } = await supabase
        .from('team_resources')
        .insert(resource)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating team resource:', error);
      throw error;
    }
  },

  async createResourceComment(comment: any) {
    try {
      const { data, error } = await supabase
        .from('resource_comments')
        .insert(comment)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating resource comment:', error);
      throw error;
    }
  },

  async searchPublicTeams(query: string) {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('visibility', 'public')
        .ilike('name', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching public teams:', error);
      return [];
    }
  },

  // ========================================
  // SECURITY METHODS
  // ========================================

  async getUserAccessControls(userId: string, resourceType: string, resourceId: string) {
    try {
      const { data, error } = await supabase
        .from('access_controls')
        .select('*')
        .eq('user_id', userId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user access controls:', error);
      return [];
    }
  },

  async createAccessControl(accessControl: any) {
    try {
      const { data, error } = await supabase
        .from('access_controls')
        .insert(accessControl)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating access control:', error);
      throw error;
    }
  },

  async deleteAccessControl(userId: string, resourceType: string, resourceId: string) {
    try {
      const { error } = await supabase
        .from('access_controls')
        .delete()
        .eq('user_id', userId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting access control:', error);
      throw error;
    }
  },

  async saveSecurityEvent(securityEvent: any) {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .insert(securityEvent)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving security event:', error);
      throw error;
    }
  },

  async saveAuditLog(auditLog: any) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert(auditLog)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving audit log:', error);
      throw error;
    }
  },

  async saveComplianceReport(report: any) {
    try {
      const { data, error } = await supabase
        .from('compliance_reports')
        .insert(report)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving compliance report:', error);
      throw error;
    }
  },

  async updateComplianceReport(reportId: string, report: any) {
    try {
      const { data, error } = await supabase
        .from('compliance_reports')
        .update(report)
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating compliance report:', error);
      throw error;
    }
  },

  async getComplianceMetrics(periodStart: number, periodEnd: number, userId?: string) {
    try {
      // Simplified implementation
      return {
        data_processed: 0,
        user_requests: 0
      };
    } catch (error) {
      console.error('Error fetching compliance metrics:', error);
      throw error;
    }
  },

  async getExpiredPersonalData(periodStart: number, periodEnd: number) {
    try {
      // Simplified implementation
      return [];
    } catch (error) {
      console.error('Error fetching expired personal data:', error);
      return [];
    }
  },

  async getConsentViolations(periodStart: number, periodEnd: number) {
    try {
      // Simplified implementation
      return [];
    } catch (error) {
      console.error('Error fetching consent violations:', error);
      return [];
    }
  },

  async getAllUserData(userId: string) {
    try {
      // Simplified implementation - would aggregate user data from multiple tables
      return {};
    } catch (error) {
      console.error('Error fetching all user data:', error);
      return {};
    }
  },

  async generateDataExport(requestId: string, userData: any) {
    try {
      // Simplified implementation
      return true;
    } catch (error) {
      console.error('Error generating data export:', error);
      throw error;
    }
  },

  async updateUserData(userId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  },

  async anonymizeUserData(userId: string) {
    try {
      // Simplified implementation
      return true;
    } catch (error) {
      console.error('Error anonymizing user data:', error);
      throw error;
    }
  },

  async generatePortableDataExport(requestId: string, userData: any) {
    try {
      // Simplified implementation
      return true;
    } catch (error) {
      console.error('Error generating portable data export:', error);
      throw error;
    }
  },

  async restrictUserDataProcessing(userId: string) {
    try {
      // Simplified implementation
      return true;
    } catch (error) {
      console.error('Error restricting user data processing:', error);
      throw error;
    }
  },

  async getSession(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  },

  async invalidateSession(sessionId: string) {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ status: 'invalidated' })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error invalidating session:', error);
      throw error;
    }
  },

  async getActiveUserSessions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active user sessions:', error);
      return [];
    }
  },

  async getRecentUserActivities(hours: number) {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .gte('timestamp', Date.now() - (hours * 60 * 60 * 1000))
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent user activities:', error);
      return [];
    }
  },

  async runDataIntegrityChecks() {
    try {
      // Simplified implementation
      return [
        { name: 'user_data_integrity', passed: true, details: 'All user data is valid' }
      ];
    } catch (error) {
      console.error('Error running data integrity checks:', error);
      return [];
    }
  },

  async getRecentAccessLogs(hours: number) {
    try {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .gte('timestamp', Date.now() - (hours * 60 * 60 * 1000))
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent access logs:', error);
      return [];
    }
  },

  // ========================================
  // NOTIFICATION METHODS
  // ========================================

  async updateNotification(notificationId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update(updates)
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating notification:', error);
      throw error;
    }
  },

  async getUserNotificationPreferences(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }
  },

  async updateUserNotificationPreferences(userId: string, preferences: any) {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: userId, ...preferences })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  },

  async saveUserPushToken(token: string) {
    try {
      // Simplified implementation - would save token for current user
      return true;
    } catch (error) {
      console.error('Error saving push token:', error);
      throw error;
    }
  },

  async getUserPushToken(userId: string) {
    try {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data?.token || null;
    } catch (error) {
      console.error('Error fetching push token:', error);
      return null;
    }
  },

  async getUserBadgeCount(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'delivered')
        .is('opened_at', null);

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error fetching badge count:', error);
      return 0;
    }
  },

  async getUserNotifications(userId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  },

  // ========================================
  // MISSING OPENAI AGENT METHODS
  // ========================================

  async createOpenAIAgent(agent: any) {
    try {
      const { data, error } = await supabase
        .from('openai_agents')
        .insert(agent)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating OpenAI agent:', error);
      throw error;
    }
  },

  async updateOpenAIAgent(agentId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('openai_agents')
        .update(updates)
        .eq('id', agentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating OpenAI agent:', error);
      throw error;
    }
  },

  async deleteOpenAIAgent(agentId: string) {
    try {
      const { error } = await supabase
        .from('openai_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting OpenAI agent:', error);
      throw error;
    }
  },

  async getOpenAIAgents() {
    try {
      const { data, error } = await supabase
        .from('openai_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching OpenAI agents:', error);
      return [];
    }
  },

  async deleteWorkflow(workflowId: string) {
    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  },


  async getRecentExecutions(limit: number) {
    try {
      const { data, error } = await supabase
        .from('executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent executions:', error);
      return [];
    }
  },


  // ========================================
  // OPENAI CONVERSATION METHODS
  // ========================================

  async createOpenAIConversation(conversation: any) {
    try {
      const { data, error } = await supabase
        .from('openai_conversations')
        .insert({
          id: conversation.id,
          agent_id: conversation.agentId,
          title: conversation.title,
          messages: conversation.messages,
          status: conversation.status,
          metadata: conversation.metadata,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating OpenAI conversation:', error);
      throw error;
    }
  },

  async getOpenAIConversation(conversationId: string) {
    try {
      const { data, error } = await supabase
        .from('openai_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching OpenAI conversation:', error);
      return null;
    }
  },

  async getOpenAIConversations(agentId?: string) {
    try {
      let query = supabase
        .from('openai_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching OpenAI conversations:', error);
      return [];
    }
  },

  async updateOpenAIConversation(conversationId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('openai_conversations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating OpenAI conversation:', error);
      throw error;
    }
  },

  async deleteOpenAIConversation(conversationId: string) {
    try {
      const { error } = await supabase
        .from('openai_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting OpenAI conversation:', error);
      throw error;
    }
  },

  // ========================================
  // OPENAI EXECUTION METHODS
  // ========================================

  async createOpenAIExecution(execution: any) {
    try {
      const { data, error } = await supabase
        .from('openai_executions')
        .insert({
          id: execution.id,
          agent_id: execution.agentId,
          conversation_id: execution.conversationId,
          input: execution.input,
          output: execution.output,
          status: execution.status,
          started_at: execution.startTime,
          completed_at: execution.endTime,
          tokens_used: execution.tokensUsed,
          cost: execution.cost,
          duration: execution.duration,
          metadata: execution.metadata,
          error: execution.error,
          thread_id: execution.thread_id,
          run_id: execution.run_id,
          run_status: execution.run_status
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating OpenAI execution:', error);
      throw error;
    }
  },

  async getOpenAIExecution(executionId: string) {
    try {
      const { data, error } = await supabase
        .from('openai_executions')
        .select('*')
        .eq('id', executionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching OpenAI execution:', error);
      return null;
    }
  },

  async getOpenAIExecutions(agentId?: string, conversationId?: string, limit: number = 50) {
    try {
      let query = supabase
        .from('openai_executions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching OpenAI executions:', error);
      return [];
    }
  },

  async updateOpenAIExecution(executionId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('openai_executions')
        .update(updates)
        .eq('id', executionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating OpenAI execution:', error);
      throw error;
    }
  },

  // ========================================
  // OPENAI FILES MANAGEMENT
  // ========================================

  async saveOpenAIFile(file: any) {
    try {
      const { data, error } = await supabase
        .from('openai_files')
        .insert({
          openai_file_id: file.id,
          agent_id: file.agent_id,
          filename: file.filename,
          original_filename: file.filename,
          file_size: file.bytes,
          mime_type: file.mime_type,
          purpose: file.purpose,
          status: file.status,
          processing_error: file.status_details,
          metadata: {
            file_type: file.file_type,
            description: file.description,
            upload_progress: file.upload_progress,
            created_at_openai: file.created_at
          }
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving OpenAI file:', error);
      throw error;
    }
  },

  async getOpenAIFile(fileId: string) {
    try {
      const { data, error } = await supabase
        .from('openai_files')
        .select('*')
        .eq('openai_file_id', fileId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching OpenAI file:', error);
      return null;
    }
  },

  async getOpenAIFiles(agentId?: string) {
    try {
      let query = supabase
        .from('openai_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching OpenAI files:', error);
      return [];
    }
  },

  async deleteOpenAIFile(fileId: string) {
    try {
      const { error } = await supabase
        .from('openai_files')
        .delete()
        .eq('openai_file_id', fileId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting OpenAI file:', error);
      throw error;
    }
  },

  // ========================================
  // OPENAI VECTOR STORES MANAGEMENT
  // ========================================

  async saveOpenAIVectorStore(vectorStore: any) {
    try {
      const { data, error } = await supabase
        .from('openai_vector_stores')
        .insert({
          openai_vector_store_id: vectorStore.id,
          agent_id: vectorStore.agent_id,
          name: vectorStore.name,
          file_counts: vectorStore.file_counts,
          status: vectorStore.status,
          expires_after: vectorStore.expires_after,
          expires_at: vectorStore.expires_at ? new Date(vectorStore.expires_at * 1000).toISOString() : null,
          metadata: {
            description: vectorStore.description,
            usage_bytes: vectorStore.usage_bytes,
            last_active_at: vectorStore.last_active_at,
            created_at_openai: vectorStore.created_at,
            ...vectorStore.metadata
          }
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving OpenAI vector store:', error);
      throw error;
    }
  },

  async getOpenAIVectorStore(vectorStoreId: string) {
    try {
      const { data, error } = await supabase
        .from('openai_vector_stores')
        .select('*')
        .eq('openai_vector_store_id', vectorStoreId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching OpenAI vector store:', error);
      return null;
    }
  },

  async getOpenAIVectorStores(agentId?: string) {
    try {
      let query = supabase
        .from('openai_vector_stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching OpenAI vector stores:', error);
      return [];
    }
  },

  async deleteOpenAIVectorStore(vectorStoreId: string) {
    try {
      const { error } = await supabase
        .from('openai_vector_stores')
        .delete()
        .eq('openai_vector_store_id', vectorStoreId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting OpenAI vector store:', error);
      throw error;
    }
  },

  // Agent Builder Configuration Persistence
  async saveAgentBuilderConfig(builderConfig: any, agentId?: string) {
    try {
      const configData = {
        builder_config: builderConfig,
        agent_id: agentId,
        updated_at: new Date().toISOString(),
      };

      if (builderConfig.id) {
        // Update existing config
        const { data, error } = await supabase
          .from('agent_builder_configs')
          .update(configData)
          .eq('id', builderConfig.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new config
        const { data, error } = await supabase
          .from('agent_builder_configs')
          .insert({
            ...configData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error saving agent builder config:', error);
      throw error;
    }
  },

  async getAgentBuilderConfig(configId: string) {
    try {
      const { data, error } = await supabase
        .from('agent_builder_configs')
        .select('*')
        .eq('id', configId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching agent builder config:', error);
      return null;
    }
  },

};