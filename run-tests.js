#!/usr/bin/env node

const { spawnSync } = require('child_process');

const tests = [
  'test-openai-agents-sdk.js',
  'test-marketplace-deployment.js',
  'test-agent-execution.js',
  'test-sdk-integration.js',
  'test-database.js',
  'test-agent-builder.js'
];

for (const test of tests) {
  console.log(`\nRunning ${test}...`);
  const result = spawnSync('node', [test], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`${test} failed`);
    process.exit(result.status);
  }
}

console.log('\nAll tests completed successfully');
