import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { useUser } from '@clerk/clerk-expo';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LandingScreen from '../screens/Auth/LandingScreen';
import TabNavigator from './TabNavigator';
import AgentBuilderScreen from '../screens/Agents/AgentBuilderScreen';
import AgentMarketplaceScreen from '../screens/Agents/AgentMarketplaceScreen';
import ChatScreen from '../screens/Chat/ChatScreen';
import { useTheme } from '../contexts/ThemeContext';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const { isSignedIn, isLoaded, user } = useUser();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

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
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          cardStyleInterpolator: Platform.OS === 'ios' 
            ? CardStyleInterpolators.forHorizontalIOS 
            : CardStyleInterpolators.forRevealFromBottomAndroid,
        }}
      >
        {isSignedIn ? (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen 
              name="AgentBuilder" 
              component={AgentBuilderScreen}
              options={{
                presentation: Platform.OS === 'ios' ? 'modal' : 'card',
                gestureEnabled: true,
                cardStyleInterpolator: Platform.OS === 'ios' 
                  ? CardStyleInterpolators.forVerticalIOS 
                  : CardStyleInterpolators.forRevealFromBottomAndroid,
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="AgentMarketplace" 
              component={AgentMarketplaceScreen}
              options={{
                presentation: Platform.OS === 'ios' ? 'modal' : 'card',
                gestureEnabled: true,
                cardStyleInterpolator: Platform.OS === 'ios' 
                  ? CardStyleInterpolators.forVerticalIOS 
                  : CardStyleInterpolators.forRevealFromBottomAndroid,
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{
                presentation: 'card',
                gestureEnabled: true,
                cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                headerShown: false,
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