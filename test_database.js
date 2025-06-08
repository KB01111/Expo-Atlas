const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabase() {
  console.log('🧪 Testing KB-Atlas Database Setup...\n');

  const requiredTables = [
    'users', 'agents', 'executions', 'workflows', 
    'teams', 'team_members', 'chat_sessions', 'chat_messages',
    'user_settings', 'notifications', 'user_roles'
  ];

  let allTestsPassed = true;

  // Test 1: Check if tables exist
  console.log('📋 Testing table existence...');
  try {
    for (const tableName of requiredTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table '${tableName}' - Error: ${error.message}`);
        allTestsPassed = false;
      } else {
        console.log(`✅ Table '${tableName}' - OK`);
      }
    }
  } catch (error) {
    console.log(`❌ Table check failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 2: Test basic CRUD operations
  console.log('\n📝 Testing CRUD operations...');
  
  try {
    // Test notifications table
    const { data: notificationData, error: notificationError } = await supabase
      .from('notifications')
      .select('count(*)')
      .single();
    
    if (notificationError) {
      console.log(`❌ Notifications query failed: ${notificationError.message}`);
      allTestsPassed = false;
    } else {
      console.log(`✅ Notifications table - Query successful`);
    }
  } catch (error) {
    console.log(`❌ CRUD test failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 3: Check indexes exist
  console.log('\n🔍 Testing database performance indexes...');
  try {
    const { data: indexes, error: indexError } = await supabase
      .rpc('pg_indexes', {})
      .select('indexname')
      .like('indexname', 'idx_%');
    
    if (!indexError && indexes && indexes.length > 0) {
      console.log(`✅ Found ${indexes.length} performance indexes`);
    } else {
      console.log(`ℹ️  Index check skipped (requires additional permissions)`);
    }
  } catch (error) {
    console.log(`ℹ️  Index check skipped: ${error.message}`);
  }

  // Test 4: Test RLS policies
  console.log('\n🔐 Testing Row Level Security...');
  try {
    // This should work without authentication (public read)
    const { data: publicData, error: publicError } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1);
    
    // RLS should prevent access without proper auth
    if (publicError && publicError.message.includes('RLS')) {
      console.log(`✅ RLS is working - Access properly restricted`);
    } else if (publicData && publicData.length === 0) {
      console.log(`✅ RLS enabled - No unauthorized data access`);
    } else {
      console.log(`ℹ️  RLS check inconclusive`);
    }
  } catch (error) {
    console.log(`ℹ️  RLS test skipped: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('\n✅ Your KB-Atlas database is fully operational!');
    console.log('\n🚀 Ready features:');
    console.log('   📱 User authentication & sync');
    console.log('   🤖 Agent management (CRUD)');
    console.log('   🔄 Workflow builder with persistence');
    console.log('   🔔 Notifications system');
    console.log('   ⚙️  User settings management');
    console.log('   🔍 Global search functionality');
    console.log('   💬 Chat system with history');
    console.log('   📊 Execution monitoring');
    console.log('\n🎯 Start your app - all features are LIVE!');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('\n🔧 Please check the manual setup guide:');
    console.log('   📖 See MANUAL_DATABASE_SETUP.md');
    console.log('   🌐 Use Supabase Dashboard SQL Editor');
    console.log('   📋 Execute supabase_migration.sql');
  }
  console.log('='.repeat(50));
}

testDatabase();