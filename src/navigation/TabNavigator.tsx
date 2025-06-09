import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import AgentsScreen from '../screens/Agents/AgentsScreen';
import WorkflowsScreen from '../screens/Workflows/WorkflowsScreen';
import AnalyticsScreen from '../screens/Analytics/AnalyticsScreen';
import FinancialScreen from '../screens/Financial/FinancialScreen';
import UsersScreen from '../screens/Users/UsersScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';

const Tab = createBottomTabNavigator();

const TabNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Agents':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Workflows':
              iconName = focused ? 'git-network' : 'git-network-outline';
              break;
            case 'Analytics':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'Financial':
              iconName = focused ? 'card' : 'card-outline';
              break;
            case 'Users':
              iconName = focused ? 'person' : 'person-outline';
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
        name="Workflows" 
        component={WorkflowsScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Financial" 
        component={FinancialScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Users" 
        component={UsersScreen} 
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