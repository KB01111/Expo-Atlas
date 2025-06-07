import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider } from '@clerk/clerk-expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </ThemeProvider>
        </SafeAreaProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
