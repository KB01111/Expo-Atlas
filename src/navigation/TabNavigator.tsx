import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Card } from '../components/ui';

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

// More screen navigator
const MoreStack = createStackNavigator();

const MoreHomeScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const menuItems = [
    { 
      title: 'Teams', 
      description: 'Manage team collaboration', 
      icon: 'people', 
      screen: 'Teams',
      color: theme.colors.primary 
    },
    { 
      title: 'Financial', 
      description: 'Cost tracking and billing', 
      icon: 'card', 
      screen: 'Financial',
      color: theme.colors.success 
    },
    { 
      title: 'Users', 
      description: 'User management', 
      icon: 'person-add', 
      screen: 'Users',
      color: theme.colors.secondary 
    },
    { 
      title: 'Julep Workflows', 
      description: 'Advanced workflow engine', 
      icon: 'git-branch', 
      screen: 'Julep',
      color: theme.colors.accent 
    },
    { 
      title: 'Settings', 
      description: 'App preferences and account', 
      icon: 'settings', 
      screen: 'Settings',
      color: theme.colors.textSecondary 
    },
  ];

  return (
    <ScrollView 
      style={{ 
        flex: 1, 
        backgroundColor: theme.colors.background,
        paddingTop: insets.top + 20
      }}
      contentContainerStyle={{ padding: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 8
      }}>
        More
      </Text>
      <Text style={{
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: 32
      }}>
        Additional features and settings
      </Text>
      
      <View style={{ gap: 16 }}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.screen}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <Card 
              variant="elevated" 
              size="md"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.surface,
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: `${item.color}15`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16
              }}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: theme.colors.text,
                  marginBottom: 4
                }}>
                  {item.title}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.colors.textSecondary
                }}>
                  {item.description}
                </Text>
              </View>
              
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={theme.colors.textTertiary} 
              />
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const MoreNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <MoreStack.Navigator
      screenOptions={{
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
        },
        headerBackTitleVisible: false,
        gestureEnabled: true,
      }}
    >
      <MoreStack.Screen 
        name="MoreHome" 
        component={MoreHomeScreen} 
        options={{ headerShown: false }}
      />
      <MoreStack.Screen 
        name="Teams" 
        component={TeamsScreen} 
        options={{ title: 'Teams' }}
      />
      <MoreStack.Screen 
        name="Financial" 
        component={FinancialScreen} 
        options={{ title: 'Financial' }}
      />
      <MoreStack.Screen 
        name="Users" 
        component={UsersScreen} 
        options={{ title: 'Users' }}
      />
      <MoreStack.Screen 
        name="Julep" 
        component={JulepWorkflowScreen} 
        options={{ title: 'Julep Workflows' }}
      />
      <MoreStack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: 'Settings' }}
      />
    </MoreStack.Navigator>
  );
};

const TabNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  console.log('TabNavigator: Rendering enhanced tab navigation');

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: any }) => ({
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Agents':
              iconName = focused ? 'person-circle' : 'person-circle-outline';
              break;
            case 'Workflows':
              iconName = focused ? 'git-network' : 'git-network-outline';
              break;
            case 'Analytics':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'More':
              iconName = focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline';
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
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: Platform.OS === 'ios' ? 0 : 1,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          height: Platform.OS === 'ios' ? 84 + insets.bottom : 84,
          position: 'absolute',
          ...theme.shadows.lg,
        },
        tabBarBackground: Platform.OS === 'ios' ? () => (
          <BlurView 
            intensity={95} 
            tint={isDark ? 'dark' : 'light'} 
            style={{ 
              flex: 1, 
              backgroundColor: isDark ? 'rgba(22, 27, 34, 0.8)' : 'rgba(255, 255, 255, 0.8)' 
            }} 
          />
        ) : undefined,
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
          fontSize: Platform.OS === 'ios' ? 10 : 11,
          fontWeight: Platform.OS === 'ios' ? '600' : '500',
          letterSpacing: 0.2,
          marginTop: Platform.OS === 'ios' ? 2 : 4,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 2 : 4,
        },
        tabBarHideOnKeyboard: Platform.OS !== 'ios',
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ 
          headerShown: false,
          title: 'Home'
        }}
      />
      <Tab.Screen 
        name="Agents" 
        component={AgentsScreen} 
        options={{ 
          headerShown: false,
          title: 'Agents'
        }}
      />
      <Tab.Screen 
        name="Workflows" 
        component={WorkflowsScreen} 
        options={{ 
          headerShown: false,
          title: 'Workflows'
        }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen} 
        options={{ 
          headerShown: false,
          title: 'Analytics'
        }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreNavigator} 
        options={{ 
          headerShown: false,
          title: 'More'
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;