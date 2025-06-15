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
    primaryDark: string;
    secondary: string;
    secondaryDark: string;
    background: string;
    surface: string;
    surfaceElevated: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    borderLight: string;
    error: string;
    success: string;
    warning: string;
    accent: string;
    info: string;
    surfaceHover: string;
    overlay: string;
    backgroundSecondary: string;
    surfaceDisabled: string;
    textDisabled: string;
    shadowColor: string;
  };
  gradients: {
    primary: readonly [string, string, ...string[]];
    secondary: readonly [string, string, ...string[]];
    hero: readonly [string, string, ...string[]];
    card: readonly [string, string, ...string[]];
    subtle: readonly [string, string, ...string[]];
    accent: readonly [string, string, ...string[]];
    warm: readonly [string, string, ...string[]];
    cool: readonly [string, string, ...string[]];
    success: readonly [string, string, ...string[]];
    glass: readonly [string, string, ...string[]];
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
    xxxxl: number;
  };
  typography: {
    // Display typography
    displayLarge: { fontSize: number; fontWeight: '900'; lineHeight: number; letterSpacing: number };
    displayMedium: { fontSize: number; fontWeight: '900'; lineHeight: number; letterSpacing: number };
    displaySmall: { fontSize: number; fontWeight: '900'; lineHeight: number; letterSpacing: number };
    
    // Headline typography
    headlineLarge: { fontSize: number; fontWeight: '700'; lineHeight: number; letterSpacing: number };
    headlineMedium: { fontSize: number; fontWeight: '700'; lineHeight: number; letterSpacing: number };
    headlineSmall: { fontSize: number; fontWeight: '700'; lineHeight: number; letterSpacing: number };
    
    // Title typography
    titleLarge: { fontSize: number; fontWeight: '600'; lineHeight: number; letterSpacing: number };
    titleMedium: { fontSize: number; fontWeight: '600'; lineHeight: number; letterSpacing: number };
    titleSmall: { fontSize: number; fontWeight: '600'; lineHeight: number; letterSpacing: number };
    
    // Body typography
    bodyLarge: { fontSize: number; fontWeight: '400'; lineHeight: number; letterSpacing: number };
    bodyMedium: { fontSize: number; fontWeight: '400'; lineHeight: number; letterSpacing: number };
    bodySmall: { fontSize: number; fontWeight: '400'; lineHeight: number; letterSpacing: number };
    
    // Label typography
    labelLarge: { fontSize: number; fontWeight: '500'; lineHeight: number; letterSpacing: number };
    labelMedium: { fontSize: number; fontWeight: '500'; lineHeight: number; letterSpacing: number };
    labelSmall: { fontSize: number; fontWeight: '500'; lineHeight: number; letterSpacing: number };
  };
  layout: {
    // Consistent layout spacing
    screenPadding: number;
    screenPaddingSmall: number;
    cardPadding: number;
    cardPaddingSmall: number;
    listItemPadding: number;
    sectionSpacing: number;
    itemSpacing: number;
    
    // Component sizes
    buttonHeight: number;
    buttonHeightSmall: number;
    buttonHeightLarge: number;
    inputHeight: number;
    headerHeight: number;
    tabBarHeight: number;
    
    // Grid system
    gridGutter: number;
    gridMargin: number;
    maxContentWidth: number;
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
    none: any;
    xs: any;
    sm: any;
    md: any;
    lg: any;
    xl: any;
    colored: any;
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