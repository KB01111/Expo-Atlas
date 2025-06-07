import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUser } from '@clerk/clerk-expo';

import LandingScreen from '../screens/Auth/LandingScreen';
import TabNavigator from './TabNavigator';
import { useTheme } from '../contexts/ThemeContext';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const { isSignedIn } = useUser();
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {isSignedIn ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="Landing" component={LandingScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;