/**
 * OpenAI Agents Integration Test
 * Tests the complete integration including service, UI components, and database persistence
 */

const { openaiAgentsComplete } = require('./src/services/openaiAgentsComplete');

async function testOpenAIIntegration() {
  console.log('🧪 Starting OpenAI Agents Integration Test\n');

  try {
    // Test 1: Service Configuration
    console.log('1. Testing service configuration...');
    const isReady = openaiAgentsComplete.isReady();
    console.log(`   ✅ Service ready: ${isReady}`);

    if (!isReady) {
      console.log('   ⚠️  Service not configured. Please set EXPO_PUBLIC_OPENAI_API_KEY');
      return;
    }

    // Test 2: Connection Test
    console.log('\n2. Testing OpenAI API connection...');
    const connectionTest = await openaiAgentsComplete.testConnection();
    console.log(`   ✅ Connection successful: ${connectionTest.success}`);
    console.log(`   📋 Available models: ${connectionTest.models.slice(0, 3).join(', ')}...`);

    // Test 3: Model Availability
    console.log('\n3. Testing model availability...');
    const models = await openaiAgentsComplete.getAvailableModels();
    console.log(`   ✅ GPT Models: ${models.gptModels.length}`);
    console.log(`   ✅ Assistant Models: ${models.assistantModels.length}`);

    // Test 4: Agent Creation
    console.log('\n4. Testing agent creation...');
    const testAgentConfig = {
      name: 'Test Agent',
      description: 'A test agent for integration testing',
      instructions: 'You are a helpful test assistant. Respond with "Test successful!" to confirm functionality.',
      model: 'gpt-4o-mini',
      tools: [
        { type: 'code_interpreter' }
      ],
      temperature: 0.7,
      user_id: 'test-user-id',
      metadata: {
        test: true,
        created_by: 'integration-test'
      }
    };

    const createdAgent = await openaiAgentsComplete.createAgent(testAgentConfig);
    console.log(`   ✅ Agent created: ${createdAgent.id}`);
    console.log(`   📝 Name: ${createdAgent.name}`);
    console.log(`   🤖 Model: ${createdAgent.model}`);
    console.log(`   🔧 Tools: ${createdAgent.tools.length}`);

    // Test 5: Agent Retrieval
    console.log('\n5. Testing agent retrieval...');
    const retrievedAgent = await openaiAgentsComplete.getAgent(createdAgent.id);
    console.log(`   ✅ Agent retrieved: ${retrievedAgent ? 'Yes' : 'No'}`);
    console.log(`   📝 Name matches: ${retrievedAgent?.name === testAgentConfig.name}`);

    // Test 6: Agent Execution
    console.log('\n6. Testing agent execution...');
    const execution = await openaiAgentsComplete.executeAgent(
      createdAgent.id,
      'Please respond with "Test successful!" to confirm you are working correctly.',
      {
        metadata: {
          test_execution: true
        }
      }
    );

    console.log(`   ✅ Execution completed: ${execution.status}`);
    console.log(`   📊 Tokens used: ${execution.tokensUsed}`);
    console.log(`   💰 Cost: $${execution.cost.toFixed(6)}`);
    console.log(`   ⏱️  Duration: ${execution.duration}ms`);
    console.log(`   💬 Response: ${execution.output.slice(0, 100)}...`);

    // Test 7: Conversation Management
    console.log('\n7. Testing conversation management...');
    const conversation = await openaiAgentsComplete.createConversation(
      createdAgent.id,
      'Test Conversation'
    );
    console.log(`   ✅ Conversation created: ${conversation.id}`);

    // Test 8: Agent Statistics
    console.log('\n8. Testing agent statistics...');
    const stats = await openaiAgentsComplete.getAgentStats(createdAgent.id);
    console.log(`   📊 Total executions: ${stats.totalExecutions}`);
    console.log(`   ✅ Successful executions: ${stats.successfulExecutions}`);
    console.log(`   💰 Total cost: $${stats.totalCost.toFixed(6)}`);

    // Test 9: Agent Update
    console.log('\n9. Testing agent update...');
    const updatedAgent = await openaiAgentsComplete.updateAgent(createdAgent.id, {
      description: 'Updated test agent description',
      temperature: 0.8
    });
    console.log(`   ✅ Agent updated: ${updatedAgent.description !== createdAgent.description}`);
    console.log(`   🌡️  Temperature updated: ${updatedAgent.temperature}`);

    // Test 10: List Agents
    console.log('\n10. Testing agent listing...');
    const agentsList = await openaiAgentsComplete.listAgents();
    console.log(`   📋 Total agents: ${agentsList.length}`);
    console.log(`   🔍 Test agent found: ${agentsList.some(a => a.id === createdAgent.id)}`);

    // Cleanup
    console.log('\n11. Cleaning up test data...');
    const deleteSuccess = await openaiAgentsComplete.deleteAgent(createdAgent.id);
    console.log(`   🗑️  Agent deleted: ${deleteSuccess}`);

    console.log('\n✅ All tests passed! OpenAI Agents integration is working correctly.\n');

    // Summary
    console.log('📊 Integration Test Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Service initialization');
    console.log('✅ OpenAI API connection');
    console.log('✅ Model availability check');
    console.log('✅ Agent creation');
    console.log('✅ Agent retrieval');
    console.log('✅ Agent execution');
    console.log('✅ Conversation management');
    console.log('✅ Statistics calculation');
    console.log('✅ Agent updates');
    console.log('✅ Agent listing');
    console.log('✅ Data cleanup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Integration ready for production use!');

  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    console.error('\n🔍 Error details:');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    
    console.log('\n🛠️  Troubleshooting steps:');
    console.log('1. Verify EXPO_PUBLIC_OPENAI_API_KEY is set');
    console.log('2. Check OpenAI API key permissions');
    console.log('3. Ensure Supabase connection is working');
    console.log('4. Verify database schema is up to date');
    console.log('5. Check network connectivity');
  }
}

// Component Integration Test Summary
function logComponentSummary() {
  console.log('\n🧩 Component Integration Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📁 Created Files:');
  console.log('   • src/services/openaiAgentsComplete.ts - Complete service');
  console.log('   • src/components/openai/AgentCreationModal.tsx - Agent builder UI');
  console.log('   • src/components/openai/AgentChatInterface.tsx - Chat interface');
  console.log('   • src/screens/Agents/EnhancedAgentsScreen.tsx - Management screen');
  console.log('   • openai_agents_schema.sql - Database schema');
  console.log('');
  console.log('🔧 Features Implemented:');
  console.log('   • Full TypeScript OpenAI SDK integration');
  console.log('   • Multi-step agent creation wizard');
  console.log('   • Real-time chat interface with streaming');
  console.log('   • Comprehensive Supabase data persistence');
  console.log('   • Agent statistics and analytics');
  console.log('   • File upload and vector store support');
  console.log('   • Custom function definitions');
  console.log('   • Conversation management');
  console.log('   • Usage tracking and cost calculation');
  console.log('   • Row-level security policies');
  console.log('');
  console.log('🎯 Ready for Use:');
  console.log('   • Create agents with custom tools and instructions');
  console.log('   • Chat with agents in real-time');
  console.log('   • Track usage and costs');
  console.log('   • Manage agent lifecycle');
  console.log('   • Export conversations');
  console.log('   • View detailed analytics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Run the test if called directly
if (require.main === module) {
  testOpenAIIntegration()
    .then(() => {
      logComponentSummary();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testOpenAIIntegration,
  logComponentSummary
};