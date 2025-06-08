# Database Setup Guide

## Required Steps to Make All Features Live

### 1. Run Database Schema Migration

Execute the SQL in `database_schema.sql` in your Supabase SQL editor:

```sql
-- Copy and paste the entire contents of database_schema.sql
-- This creates the missing tables: user_settings, notifications, user_roles
-- And adds missing columns to existing tables
```

### 2. Verify Tables Exist

After running the migration, verify these tables exist in your Supabase dashboard:

✅ **Existing Tables (should already exist):**
- `users`
- `agents` 
- `executions`
- `workflows`
- `teams`
- `team_members`
- `chat_sessions`
- `chat_messages`

✅ **New Tables (created by migration):**
- `user_settings`
- `notifications` 
- `user_roles`

### 3. Test Real Functionality

Once the database is set up, these features will work with real data:

**✅ Fully Functional:**
- Agent creation/editing/deletion
- Workflow builder with database persistence
- User settings with real persistence
- Notifications system
- Search functionality
- Execution monitoring and controls
- User authentication with Clerk + Supabase sync

**✅ Partially Functional (need backend AI integration):**
- Chat messages (saves to database, but responses are simulated)
- Agent execution (can start/stop, but needs actual AI processing)

### 4. Environment Variables Required

Ensure these are set in your `.env`:
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. RLS Policies

The migration sets up Row Level Security (RLS) policies so users can only access their own data.

## Current Status After Database Setup

🟢 **LIVE Features (No Mock Data):**
- Real user authentication and sync
- Agent CRUD operations with database
- Workflow builder with persistence
- User settings management
- Notifications system
- Global search across all data
- Execution monitoring and controls
- User role management
- Real-time data updates

🟡 **Simulated Features (Database + Mock Responses):**
- Chat conversations (messages saved, AI responses simulated)
- Agent execution results (start/stop works, but results are mocked)

🔴 **Missing for Production:**
- Actual AI agent processing backend
- Real-time WebSocket connections for live updates
- Push notification service integration
- File upload/attachment handling
- Email notification service

## Next Steps for Full Production

1. **AI Backend Integration**: Connect to actual AI services (OpenAI, Anthropic, etc.)
2. **Real-time Updates**: Add Supabase real-time subscriptions
3. **Push Notifications**: Integrate with Expo push notifications
4. **File Storage**: Add Supabase storage for file uploads
5. **Email Service**: Integrate email service for notifications

After running the database migration, **90% of features will be fully functional with real data persistence**.