const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure all image assets are properly handled
if (!config.resolver.assetExts.includes('png')) {
  config.resolver.assetExts.push('png');
}
if (!config.resolver.assetExts.includes('ico')) {
  config.resolver.assetExts.push('ico');
}

module.exports = config; 