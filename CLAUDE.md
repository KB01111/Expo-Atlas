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
- Animations: `react-native-reanimated`, `react-native-gesture-handler`, `moti`, `lottie-react-native`

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
- Full support for OpenAI Agents SDK (`@openai/agents@0.0.4`) with official OpenAI SDK (`openai@5.1.1`)
- Service layer at `src/services/openaiAgentsSimple.ts` using actual OpenAI Assistants API
- **Dynamic Model Management** at `src/services/openaiModels.ts` with automatic OpenAI API fetching
- Complete type definitions in `src/types/openai.ts` aligned with OpenAI SDK types
- UI components for agent management, execution, and configuration in `src/components/openai/`
- Template-based agent creation with predefined roles (assistant, coder, researcher, analyst)
- Real assistant execution using OpenAI Threads and Runs API with proper cleanup
- Tool integration including code interpreter, file search, and custom functions
- **Automatic cost calculation with dynamic pricing** and token usage tracking
- **Latest Model Support**: GPT-4.5, GPT-4.1, o3, o4-mini, and future models automatically available
- Categorized model selection with capability indicators (vision, reasoning, function calling)
- Proper error handling with fallback models and database persistence integration

**Agent Builder System:**
- Comprehensive agent builder at `src/screens/Agents/AgentBuilderScreen.tsx` with 7-step wizard interface
- Full-featured builder service at `src/services/agentBuilder.ts` with OpenAI SDK integration and Supabase persistence
- Multi-step configuration: Basic Info, Instructions, Tools, Files, Advanced, Test, Deploy
- Real-time testing interface with performance metrics and conversation history
- Custom function creation with API call, JavaScript, and external execution types
- File upload and vector store management for knowledge bases
- Template system for agent reuse and sharing
- Export/import functionality for agent configurations
- Complete database schema with agent builder states, files, functions, tests, and deployments
- Navigation integration via "Builder" button in AgentsScreen header

**MCP (Model Context Protocol) Integration:**
- Full Composio MCP SDK integration at `src/services/composioMCP.ts` for external tool access
- MCP server discovery and connection management with real-time status monitoring
- Support for popular MCP servers: filesystem, web search, Gmail, Google Calendar, GitHub, Slack
- Tool execution with cost tracking, rate limiting, and comprehensive logging
- Agent-specific tool connections with authentication and configuration management
- UI integration via `src/components/mcp/MCPToolsPanel.tsx` in Agent Builder tools step
- Complete database schema with MCP servers, tools, connections, and execution analytics

**AI Agent Templates & Marketplace:**
- Comprehensive template library at `src/services/agentTemplates.ts` with 6 categories
- One-click agent deployment system with pre-configured templates
- Agent Marketplace at `src/screens/Agents/AgentMarketplaceScreen.tsx` with category browsing
- 12+ pre-built agent templates: Smart Assistant, Email Manager, Sales Analyst, Code Reviewer, Research Analyst, Content Creator, Support Specialist
- Template analytics with usage tracking, ratings, and popularity scoring
- Template categories: Productivity, Business, Development, Research, Creative, Customer Support
- Featured agents showcase with difficulty levels and setup time estimates
- Template search and filtering with automatic MCP tool integration
- Navigation integration via "Marketplace" button in AgentsScreen header

**Animation System:**
- Comprehensive animation foundation using React Native Reanimated 3 + Gesture Handler
- Moti integration for Framer Motion-like declarative syntax in `src/components/animations/MotiView.tsx`
- Lottie support for After Effects animations in `src/components/animations/LottieAnimation.tsx`
- Gesture-enabled animations with pan, pinch, tap, and long press support
- Animation utilities and presets in `src/utils/animations.ts` with timing, spring, and easing configurations
- Enhanced AnimatedView components with staggered animations, interaction effects, and performance optimization
- Comprehensive animation presets: fadeIn/Out, slide directions, scale, bounce, pulse, shake, rubberBand, flip, rotate
- Gesture-based interactions with haptic feedback, ripple effects, and magnetic behaviors
- Layout animations and transition support with spring configurations

**Development Guidelines:**
- Use shared theme system for all styling decisions
- Implement animations using the AnimatedView component
- Follow the established component patterns for consistency
- Utilize the comprehensive roadmap in `FEATURE_ROADMAP.md` for feature planning

**Type Safety:**
TypeScript is configured with strict mode. Enhanced type definitions include theme system, animations, and component props. Types are centralized in `src/types/index.ts`.