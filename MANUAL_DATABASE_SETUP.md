# 🔧 Manual Database Setup Guide

Since automated setup encountered API key issues, please follow these manual steps to set up your Supabase database:

## 📋 Step-by-Step Instructions

### 1. Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Navigate to your project: `dgqhxtrvoebwhjsllcck`
3. Click on **SQL Editor** in the left sidebar

### 2. Execute the Migration SQL
1. Click **New Query** in the SQL Editor
2. Copy the entire contents of `supabase_migration.sql` (it's in your project root)
3. Paste it into the SQL Editor
4. Click **Run** to execute the migration

### 3. Verify Tables Were Created
After running the migration, go to **Database** → **Tables** and verify these tables exist:

✅ **Core Tables:**
- `users` (should already exist)
- `agents`
- `executions` 
- `workflows`
- `teams`
- `team_members`
- `chat_sessions`
- `chat_messages`

✅ **New Feature Tables:**
- `user_settings`
- `notifications`
- `user_roles`

### 4. Check the Migration Success Message
At the end of the SQL execution, you should see a success message like:
```
NOTICE: Migration completed successfully! Found 11 required tables.
NOTICE: All required tables are present. Your KB-Atlas database is ready!
```

### 5. Alternative: Execute SQL in Chunks
If the full migration fails, execute these parts separately:

#### Part 1: Create New Tables
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  theme_mode TEXT DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  auto_sync BOOLEAN DEFAULT true,
  offline_mode BOOLEAN DEFAULT true,
  biometric_lock BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'in_app' CHECK (type IN ('push', 'email', 'in_app')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);
```

#### Part 2: Update Users Table
```sql
-- Add columns to users table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'status') THEN
    ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' 
    CHECK (status IN ('active', 'inactive', 'pending'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'last_active') THEN
    ALTER TABLE users ADD COLUMN last_active TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;
```

#### Part 3: Enable Row Level Security
```sql
-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (auth.uid()::text = user_id::text);
```

#### Part 4: Create Indexes
```sql
-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
```

## 🎯 What This Migration Does

### New Features Enabled:
- ✅ **User Settings**: Theme, notifications, preferences
- ✅ **Notifications System**: In-app, email, push notifications  
- ✅ **User Roles**: Role-based access control
- ✅ **Enhanced User Management**: Status tracking, last active
- ✅ **Performance Indexes**: Faster queries
- ✅ **Row Level Security**: Data protection

### Tables That Should Already Exist:
If any of these core tables are missing, create them using the full `supabase_migration.sql`:
- `users`, `agents`, `executions`, `workflows`, `teams`, `team_members`, `chat_sessions`, `chat_messages`

## 🚨 Troubleshooting

### If You Get Permission Errors:
1. Make sure you're using the **SQL Editor** in Supabase Dashboard
2. Try running commands in smaller chunks
3. Check that your project is the correct one: `dgqhxtrvoebwhjsllcck`

### If Tables Already Exist:
The migration uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times.

### If Some Features Don't Work:
1. Verify all tables exist in **Database** → **Tables**
2. Check that RLS policies were created in **Authentication** → **Policies**
3. Restart your Expo app after database changes

## ✅ Verification

After completing the setup, test these features in your app:
1. **Settings Screen**: Should save theme and notification preferences
2. **Agents Screen**: Should create/edit/delete agents
3. **Workflows Screen**: Should save workflow designs
4. **Notifications**: Should appear for user actions
5. **Search**: Should find data across all tables

## 🎉 Success!

Once the migration is complete, your KB-Atlas app will have:
- 📱 **100% Live Features** (no mock data)
- 🔐 **Real Authentication** with user sync
- 💾 **Persistent Data** across app restarts
- 🔍 **Full Search** across all content
- ⚙️ **User Settings** with database storage
- 🔔 **Notifications System** ready for use
- 🤖 **Complete Agent Management**
- 🔄 **Workflow Builder** with save/load
- 💬 **Chat System** with message history

Your app is now production-ready! 🚀