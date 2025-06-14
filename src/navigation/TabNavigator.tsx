import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import AgentsScreen from '../screens/Agents/AgentsScreen';
import TeamsScreen from '../screens/Teams/TeamsScreen';
import WorkflowsScreen from '../screens/Workflows/WorkflowsScreen';
import JulepWorkflowScreen from '../screens/Workflows/JulepWorkflowScreen';
import AnalyticsScreen from '../screens/Analytics/AnalyticsScreen';
import FinancialScreen from '../screens/Financial/FinancialScreen';
import UsersScreen from '../screens/Users/UsersScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';

const Tab = createBottomTabNavigator();

// Simple test component
const TestDashboard = () => {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.text, fontSize: 18 }}>🎉 Navigation Working!</Text>
      <Text style={{ color: theme.colors.text, marginTop: 10 }}>Dashboard Screen Loaded</Text>
    </View>
  );
};

const TabNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();

  console.log('TabNavigator: Rendering main tab navigation');

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: any }) => ({
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Agents':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Teams':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Workflows':
              iconName = focused ? 'git-network' : 'git-network-outline';
              break;
            case 'Julep':
              iconName = focused ? 'git-branch' : 'git-branch-outline';
              break;
            case 'Analytics':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'ellipse';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 88,
          ...theme.shadows.sm,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          ...theme.shadows.sm,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.2,
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Agents" 
        component={AgentsScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Teams" 
        component={TeamsScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Workflows" 
        component={WorkflowsScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Julep" 
        component={JulepWorkflowScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;