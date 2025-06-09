export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'pending';
  last_active?: string;
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

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'push' | 'email' | 'in_app';
  title: string;
  message: string;
  read: boolean;
  data?: any;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme_mode: ThemeMode;
  notifications_enabled: boolean;
  email_notifications: boolean;
  auto_sync: boolean;
  offline_mode: boolean;
  biometric_lock: boolean;
  language: string;
  updated_at: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface Document {
  id: string;
  user_id: string;
  name: string;
  content: string;
  type: string;
  size: number;
  created_at: string;
  updated_at: string;
}

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
    accent: string;
    info: string;
    surfaceHover: string;
    overlay: string;
  };
  gradients: {
    primary: readonly [string, string, ...string[]];
    hero: readonly [string, string, ...string[]];
    card: readonly [string, string, ...string[]];
    subtle: readonly [string, string, ...string[]];
    accent: readonly [string, string, ...string[]];
    warm: readonly [string, string, ...string[]];
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
  };
  borderRadius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    full: number;
  };
  shadows: {
    sm: any;
    md: any;
    lg: any;
    xl: any;
  };
}

export interface Typography {
  fontSizes: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
  };
  fontWeights: {
    normal: '400';
    medium: '500';
    semibold: '600';
    bold: '700';
    extrabold: '800';
  };
  lineHeights: {
    tight: number;
    snug: number;
    normal: number;
    relaxed: number;
  };
}