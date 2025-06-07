import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseService = {
  async getDashboardMetrics() {
    // Mock data for now - replace with actual Supabase queries
    return {
      totalAgents: 12,
      activeAgents: 8,
      totalTasks: 245,
      completedTasks: 198,
      failedTasks: 12,
      averageSuccessRate: 88.5,
      totalCost: 1234.56,
      monthlyCost: 234.56,
    };
  },

  async getAgents() {
    // Mock data - replace with actual query
    return [
      {
        id: '1',
        name: 'Content Generator',
        description: 'Generates marketing content',
        status: 'active' as const,
        type: 'content',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        lastActive: '2024-01-02T00:00:00Z',
        tasks: 45,
        successRate: 92.3,
      },
    ];
  },

  async getWorkflows() {
    return [];
  },

  async getTransactions() {
    return [];
  },

  async getAnalytics() {
    return {
      usage: [],
      performance: [],
      costs: [],
    };
  },
};