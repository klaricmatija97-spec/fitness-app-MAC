// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure TypeScript files are resolved
config.resolver.sourceExts.push('ts', 'tsx');

module.exports = config;

