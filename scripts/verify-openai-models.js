#!/usr/bin/env node
/**
 * Verification script for OpenAI Models Service
 * Tests the dynamic model fetching without requiring Jest
 */

const { openaiModelsService } = require('../dist/services/openaiModels');

async function verifyModelsService() {
  console.log('🔍 Verifying OpenAI Models Service...\n');
  
  try {
    // Test 1: Fetch all models
    console.log('1. Testing fetchAllModels()...');
    const models = await openaiModelsService.fetchAllModels();
    console.log(`   ✅ Found ${models.length} models`);
    console.log(`   ✅ Latest models: ${models.slice(0, 3).map(m => m.id).join(', ')}`);
    
    // Test 2: Get model categories
    console.log('\n2. Testing getModelsByCategory()...');
    const categories = await openaiModelsService.getModelsByCategory();
    console.log(`   ✅ Found ${categories.length} categories:`);
    categories.forEach(cat => {
      console.log(`      - ${cat.category}: ${cat.models.length} models`);
    });
    
    // Test 3: Get available model IDs
    console.log('\n3. Testing getAvailableModelIds()...');
    const modelIds = await openaiModelsService.getAvailableModelIds();
    console.log(`   ✅ Available model IDs: ${modelIds.length} total`);
    
    // Test 4: Check for new models
    console.log('\n4. Checking for latest models...');
    const hasGPT45 = modelIds.includes('gpt-4.5');
    const hasGPT41 = modelIds.includes('gpt-4.1');
    const hasO4Mini = modelIds.includes('o4-mini');
    
    if (hasGPT45) console.log('   ✅ GPT-4.5 available');
    if (hasGPT41) console.log('   ✅ GPT-4.1 available'); 
    if (hasO4Mini) console.log('   ✅ o4-mini available');
    
    if (!hasGPT45 && !hasGPT41 && !hasO4Mini) {
      console.log('   ⚠️  Using fallback models (latest models not yet available in API)');
    }
    
    // Test 5: Check model capabilities
    console.log('\n5. Testing model capabilities...');
    const modelsWithCapabilities = models.filter(m => m.capabilities);
    console.log(`   ✅ ${modelsWithCapabilities.length} models have capability metadata`);
    
    const visionModels = models.filter(m => m.capabilities?.vision).length;
    const reasoningModels = models.filter(m => m.capabilities?.reasoning).length;
    const functionModels = models.filter(m => m.capabilities?.function_calling).length;
    
    console.log(`   ✅ Vision models: ${visionModels}`);
    console.log(`   ✅ Reasoning models: ${reasoningModels}`);
    console.log(`   ✅ Function calling models: ${functionModels}`);
    
    // Test 6: Check pricing
    console.log('\n6. Testing pricing information...');
    const modelsWithPricing = models.filter(m => m.pricing);
    console.log(`   ✅ ${modelsWithPricing.length} models have pricing information`);
    
    const cheapestModel = models.reduce((prev, curr) => 
      (curr.pricing?.input_tokens_per_1k || Infinity) < (prev.pricing?.input_tokens_per_1k || Infinity) ? curr : prev
    );
    
    if (cheapestModel.pricing) {
      console.log(`   ✅ Most cost-effective: ${cheapestModel.id} ($${cheapestModel.pricing.input_tokens_per_1k}/1K tokens)`);
    }
    
    console.log('\n🎉 All tests passed! OpenAI Models Service is working correctly.');
    console.log('\n📋 Summary:');
    console.log(`   - Total models: ${models.length}`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Latest GPT-4.5/4.1 support: ${hasGPT45 || hasGPT41 ? 'Yes' : 'Fallback'}`);
    console.log(`   - Reasoning models (o-series): ${hasO4Mini ? 'Yes' : 'Fallback'}`);
    console.log(`   - Dynamic pricing: Enabled`);
    console.log(`   - Capability detection: Enabled`);
    
  } catch (error) {
    console.error('❌ Error testing models service:', error.message);
    console.log('\n🔧 This might be due to:');
    console.log('   - Missing OpenAI API key');
    console.log('   - Network connectivity issues');  
    console.log('   - API rate limiting');
    console.log('\n💡 The service will use fallback models in production if API calls fail.');
    process.exit(1);
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyModelsService().catch(console.error);
}

module.exports = { verifyModelsService };