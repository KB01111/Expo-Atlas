# KB-Atlas Mobile

A React Native mobile app built with Expo that mirrors the KB-Atlas web features, providing intelligent automation and analytics on mobile devices.

## Features

- **Modern UI**: Clean design with gradient backgrounds and dark/light theme toggle
- **Authentication**: Clerk-based sign-in with Google OAuth
- **Real-time Dashboard**: Live metrics, charts, and system status
- **Agent Management**: Search, manage, and monitor AI agents
- **Workflow Automation**: Simplified drag-and-drop workflow builder
- **Financial Tracking**: BAS automation with transaction categorization
- **Analytics**: Performance charts and usage insights
- **User Management**: Admin controls with role-based access
- **Settings**: Theme switching, notifications, and security options

## Tech Stack

- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Authentication**: Clerk
- **Database**: Supabase
- **Navigation**: React Navigation 6
- **Charts**: React Native Chart Kit, Victory Native
- **UI Components**: React Native Vector Icons, Expo Vector Icons
- **Styling**: React Native StyleSheet with LinearGradient

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (for iOS development)
- Android Studio & Android Emulator (for Android development)

## Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd Expo-Atlas
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

3. **Setup Clerk Authentication**:
   - Create a Clerk account at [clerk.com](https://clerk.com)
   - Create a new application
   - Enable Google OAuth provider
   - Copy the publishable key to your `.env` file

4. **Setup Supabase**:
   - Create a Supabase account at [supabase.com](https://supabase.com)
   - Create a new project
   - Copy the project URL and anon key to your `.env` file

## Development

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/            # React contexts (Theme, etc.)
├── navigation/          # Navigation configuration
├── screens/             # Screen components
│   ├── Auth/           # Authentication screens
│   ├── Dashboard/      # Dashboard and metrics
│   ├── Agents/         # Agent management
│   ├── Workflows/      # Workflow builder
│   ├── Analytics/      # Charts and analytics
│   ├── Financial/      # Financial automation
│   ├── Users/          # User management
│   └── Settings/       # App settings
├── services/           # API and data services
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
└── utils/              # Utility functions
```

## Key Components

### Theme System
- Supports light, dark, and system themes
- Automatic theme switching based on system preferences
- Gradient backgrounds and consistent color schemes

### Navigation
- Bottom tab navigation with 7 main sections
- Stack navigation for detailed views
- Drawer/modal menu for additional options

### Real-time Features
- WebSocket/SSE integration for live updates
- Auto-refreshing dashboard metrics
- Real-time agent status monitoring

### Charts & Analytics
- Line charts for time-series data
- Bar charts for comparative metrics
- Pie charts for distribution analysis
- Mobile-optimized chart configurations

## Building for Production

```bash
# Build for iOS
npx expo build:ios

# Build for Android
npx expo build:android

# Create development build
npx expo install --fix
npx expo prebuild
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk authentication key | Yes |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `EXPO_PUBLIC_API_BASE_URL` | Backend API base URL | No |

## Features Overview

### Dashboard Screen
- Real-time system metrics
- Agent activity monitoring
- Performance charts
- System status indicators

### Agent Management
- Searchable agent list
- CRUD operations
- Status badges and statistics
- Real-time task monitoring

### Workflow Builder
- Simplified node-based editor
- Drag-and-drop interface
- Live validation
- Link to advanced LangGraph OAP

### Financial Automation
- Transaction categorization
- BAS classification with confidence scores
- Monthly summaries
- Manual review capabilities

### Analytics
- Usage distribution charts
- Performance metrics
- Cost analysis
- System health monitoring

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

MIT License - see LICENSE file for details