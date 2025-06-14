import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUser } from '@clerk/clerk-expo';
import { View, Text } from 'react-native';

import LandingScreen from '../screens/Auth/LandingScreen';
import TabNavigator from './TabNavigator';
import AgentBuilderScreen from '../screens/Agents/AgentBuilderScreen';
import AgentMarketplaceScreen from '../screens/Agents/AgentMarketplaceScreen';
import ChatScreen from '../screens/Chat/ChatScreen';
import { useTheme } from '../contexts/ThemeContext';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const { isSignedIn, isLoaded, user } = useUser();
  const { theme } = useTheme();

  // Debug logging
  console.log('AppNavigator Debug:', {
    isSignedIn,
    isLoaded,
    hasUser: !!user,
    userEmail: user?.primaryEmailAddress?.emailAddress
  });

  // Loading state
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.text }}>Loading authentication...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {isSignedIn ? (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen 
              name="AgentBuilder" 
              component={AgentBuilderScreen}
              options={{
                presentation: 'modal',
                gestureEnabled: true,
              }}
            />
            <Stack.Screen 
              name="AgentMarketplace" 
              component={AgentMarketplaceScreen}
              options={{
                presentation: 'modal',
                gestureEnabled: true,
              }}
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{
                presentation: 'card',
                gestureEnabled: true,
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Landing" component={LandingScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;