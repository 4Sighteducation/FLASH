const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add more detailed error reporting
config.reporter = {
  update(event) {
    if (event.type === 'bundle_build_failed') {
      console.error('Bundle build failed:', event.error);
      console.error('Stack trace:', event.error.stack);
    }
  },
};

// Add resolver logging
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    return originalResolveRequest(context, moduleName, platform);
  } catch (error) {
    console.error(`Failed to resolve module: ${moduleName}`);
    console.error('Error:', error.message);
    throw error;
  }
};

// Ensure all assets are properly handled
config.resolver.assetExts = [...config.resolver.assetExts, 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico'];

module.exports = config; 