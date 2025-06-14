import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider } from '@clerk/clerk-expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';

import { ThemeProvider } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

export default function App() {
  console.log('App.tsx: Starting full app with Clerk authentication');
  console.log('Clerk key configured:', !!publishableKey && publishableKey.length > 0);

  if (!publishableKey) {
    throw new Error('Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env');
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey}>
        <SafeAreaProvider>
          <ActionSheetProvider>
            <ThemeProvider>
              <AuthProvider>
                <AppNavigator />
                <StatusBar 
                  style="auto" 
                  backgroundColor="transparent"
                  translucent={Platform.OS === 'android'}
                />
              </AuthProvider>
            </ThemeProvider>
          </ActionSheetProvider>
        </SafeAreaProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
