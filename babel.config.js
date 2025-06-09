module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }]
    ],
    plugins: [
      // Reanimated plugin has to be the last one
      'react-native-reanimated/plugin',
    ],
  };
};