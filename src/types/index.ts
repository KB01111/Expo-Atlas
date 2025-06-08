export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'error';
  provider: string;
  model: string;
  configuration?: any;
  created_at: string;
  updated_at: string;
  tasks?: number;
  successRate?: number;
}

export interface Execution {
  id: string;
  user_id?: string;
  agent_id?: string;
  team_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input?: string;
  output?: string;
  error?: string;
  metadata?: any;
  started_at: string;
  completed_at?: string;
  tokens_used?: number;
  cost?: number;
}

export interface Workflow {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  nodes?: any[];
  edges?: any[];
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  last_active: string;
  status: 'active' | 'closed';
  metadata?: any;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'agent' | 'system';
  agent_id?: string;
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  basCategory?: string;
  confidence: number;
  reviewed: boolean;
}

export interface DashboardMetrics {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageSuccessRate: number;
  totalCost: number;
  monthlyCost: number;
}

export interface ChartData {
  label: string;
  value: number;
  color?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
  gradients: {
    primary: readonly [string, string, ...string[]];
    hero: readonly [string, string, ...string[]];
  };
}