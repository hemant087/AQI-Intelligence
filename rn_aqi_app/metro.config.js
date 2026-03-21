const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .wasm and .db to assetExts
config.resolver.assetExts.push('wasm', 'db');

// Redirect native modules to mocks on web
if (process.env.EXPO_PUBLIC_PLATFORM === 'web' || !process.env.EXPO_PUBLIC_PLATFORM) {
  config.resolver.extraNodeModules = {
    'react-native-maps': path.resolve(__dirname, 'src/mocks/react-native-maps.js'),
  };
}

module.exports = config;
