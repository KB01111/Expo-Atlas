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

  async getAgentById(agentId: string, provider?: string) {
    try {
      let query = supabase.from('agents').select('*').eq('id', agentId);
      if (provider) {
        query = query.eq('provider', provider);
      }
      const { data: agent, error } = await query.single();

      if (error) throw error;

      const { count: totalTasks } = await supabase
        .from('executions')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      const { count: completedTasks } = await supabase
        .from('executions')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('status', 'completed');

      const successRate = totalTasks && totalTasks > 0
        ? ((completedTasks || 0) / totalTasks) * 100
        : 0;

      return {
        ...agent,
        tasks: totalTasks || 0,
        successRate: Math.round(successRate * 100) / 100,
      };
    } catch (error) {
      console.error('Error fetching agent:', error);
      return null;
    }
  },

  async getAgentCount() {
    try {
      const { count } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    } catch (error) {
      console.error('Error fetching agent count:', error);
      return 0;
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

      const { data: toolRows } = await supabase
        .from('executions')
        .select('metadata')
        .order('started_at', { ascending: true });

      const toolCounts: Record<string, number> = {};
      (toolRows || []).forEach(row => {
        const tools = (row.metadata as any)?.tools_used as string[] | undefined;
        if (Array.isArray(tools)) {
          tools.forEach(t => {
            toolCounts[t] = (toolCounts[t] || 0) + 1;
          });
        }
      });

      const toolUsage = Object.entries(toolCounts)
        .map(([tool, count]) => ({ tool, count }))
        .sort((a, b) => b.count - a.count);

      return {
        usage: usageData || [],
        performance: performanceData || [],
        costs: costData || [],
        toolUsage,
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return {
        usage: [],
        performance: [],
        costs: [],
        toolUsage: [],
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
  async createAgent(agent: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabase
        .from('agents')
        .insert(agent)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating agent:', error);
      return null;
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

  async getAgentExecutions(agentId: string, timePeriod = '7d') {
    try {
      const since = new Date();
      const days = parseInt(timePeriod.replace('d', ''), 10);
      since.setDate(since.getDate() - (isNaN(days) ? 7 : days));

      const { data, error } = await supabase
        .from('executions')
        .select('*')
        .eq('agent_id', agentId)
        .gte('started_at', since.toISOString());

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching agent executions:', error);
      return [];
    }
  },

  async getTeamExecutions(teamId: string, timePeriod = '7d') {
    try {
      const since = new Date();
      const days = parseInt(timePeriod.replace('d', ''), 10);
      since.setDate(since.getDate() - (isNaN(days) ? 7 : days));

      const { data, error } = await supabase
        .from('executions')
        .select('*')
        .eq('team_id', teamId)
        .gte('started_at', since.toISOString());

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching team executions:', error);
      return [];
    }
  },

  async saveTeamExecution(execution: any) {
    try {
      const { data, error } = await supabase
        .from('executions')
        .insert(execution)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving team execution:', error);
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
};