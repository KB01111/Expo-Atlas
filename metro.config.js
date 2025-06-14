const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure react-native resolves to react-native-web for web platform
config.resolver.alias = {
  'react-native': 'react-native-web',
};

// Add polyfills for Node.js modules and web-specific aliases
config.resolver.alias = {
  ...config.resolver.alias,
  'crypto': 'crypto-browserify',
  'stream': 'stream-browserify',
  'buffer': 'buffer',
  'expo-linear-gradient': 'react-native-linear-gradient',
};

// Platform-specific resolver to handle MCP SDK issues on web
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Platform-specific file extensions for MCP
config.resolver.platforms = ['web', 'native', 'ios', 'android'];

// Exclude MCP SDK from web bundles
const existingBlockList = config.resolver.blockList || [];
const blockListArray = Array.isArray(existingBlockList) ? existingBlockList : [];

config.resolver.blockList = [
  ...blockListArray,
  // Block MCP SDK for web platform
  /.*@modelcontextprotocol\/sdk.*/,
];

module.exports = config;