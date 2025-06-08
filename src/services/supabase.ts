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
};