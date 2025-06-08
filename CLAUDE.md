# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator  
- `npm run android` - Run on Android emulator
- `npm run web` - Run on web browser

**Building:**
- `npx expo build:ios` - Build for iOS
- `npx expo build:android` - Build for Android
- `npx expo prebuild` - Generate native code

## Architecture

This is an Expo React Native app that mirrors KB-Atlas web features for mobile. The app follows a feature-based architecture with clear separation of concerns:

**Navigation Structure:**
- Stack navigator with authentication flow (LandingScreen → TabNavigator)
- Bottom tab navigation with 7 main sections (Dashboard, Agents, Workflows, Financial, Analytics, Users, Settings)
- Authentication handled by Clerk with conditional rendering based on sign-in status

**Theme System:**
- Centralized theme context (`ThemeContext`) supporting light, dark, and system themes
- Gradient-based design with consistent color schemes
- Theme switching affects entire app through context provider

**Data Layer:**
- Supabase client configured in `src/services/supabase.ts` using KB01111's Project (dgqhxtrvoebwhjsllcck)
- Real data services implemented with actual Supabase queries for all screens
- Service pattern with async methods covering agents, executions, users, workflows, teams, and analytics
- Database schema includes comprehensive tables: agents, executions, users, workflows, teams, chat_sessions, documents, and more

**Key Dependencies:**
- Authentication: `@clerk/clerk-expo` with Google OAuth
- Database: `@supabase/supabase-js`
- Navigation: `@react-navigation/*` (stack, bottom-tabs, drawer)
- Charts: `react-native-chart-kit`, `victory-native`
- UI: `@expo/vector-icons`, `react-native-vector-icons`

**Environment Variables Required:**
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL  
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

**Screen Organization:**
Each main feature has its own screen directory under `src/screens/` with components following the pattern `FeatureScreen.tsx`. Components are organized by domain (Auth, Dashboard, Agents, etc.) rather than by technical concerns.

**Type Safety:**
TypeScript is configured with strict mode. Types are centralized in `src/types/index.ts` and should be extended when adding new features.