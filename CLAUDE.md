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
- Enhanced theme context with modern Indigo/Pink gradient palette
- Sophisticated light/dark themes with improved contrast and accessibility
- Comprehensive design system with spacing, border radius, shadows, and animations
- Reusable component library (Button, Card, StatusBadge, AnimatedView)
- Consistent typography hierarchy and visual elements

**Data Layer:**
- Supabase client configured in `src/services/supabase.ts` using KB01111's Project (dgqhxtrvoebwhjsllcck)
- Real data services implemented with actual Supabase queries for all screens
- Service pattern with async methods covering agents, executions, users, workflows, teams, and analytics
- Database schema includes comprehensive tables: agents, executions, users, workflows, teams, chat_sessions, documents, and more

**Key Dependencies:**
- Authentication: `@clerk/clerk-expo` with Google OAuth
- Database: `@supabase/supabase-js`
- OpenAI Agents: `@openai/agents` for AI agent creation and execution
- Navigation: `@react-navigation/*` (stack, bottom-tabs, drawer)
- Charts: `react-native-chart-kit`, `victory-native`
- UI: `@expo/vector-icons`, `react-native-vector-icons`

**Environment Variables Required:**
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL  
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `EXPO_PUBLIC_OPENAI_API_KEY` - OpenAI API key for OpenAI Agents SDK
- `EXPO_PUBLIC_OPENAI_ORGANIZATION` - OpenAI organization ID (optional)

**Component Architecture:**
- Screen organization under `src/screens/` with domain-based structure
- Reusable UI components in `src/components/ui/` with consistent API
- OpenAI integration in `src/components/openai/` with agent management
- Shared styling system in `src/styles/shared.ts` for consistency
- Animated components with built-in micro-interactions

**OpenAI Agents Integration:**
- Full support for OpenAI Agents SDK with agent creation, execution, and monitoring
- Service layer at `src/services/openaiAgents.ts` for all OpenAI operations
- Complete type definitions in `src/types/openai.ts` for type safety
- UI components for agent management, execution, and configuration
- Template-based agent creation with predefined roles (assistant, coder, researcher, analyst)
- Real-time execution with streaming support and cost tracking
- Tool integration including code interpreter, file search, and custom functions

**Development Guidelines:**
- Use shared theme system for all styling decisions
- Implement animations using the AnimatedView component
- Follow the established component patterns for consistency
- Utilize the comprehensive roadmap in `FEATURE_ROADMAP.md` for feature planning

**Type Safety:**
TypeScript is configured with strict mode. Enhanced type definitions include theme system, animations, and component props. Types are centralized in `src/types/index.ts`.