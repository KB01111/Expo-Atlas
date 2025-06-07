export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  type: string;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  tasks: number;
  successRate: number;
}

export interface Task {
  id: string;
  agentId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  duration?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'agent' | 'condition' | 'action';
  x: number;
  y: number;
  data: any;
}

export interface WorkflowConnection {
  id: string;
  sourceId: string;
  targetId: string;
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