require('dotenv').config();

// Debug: Log environment variables
console.log('🔍 Loading app.config.js...');
console.log('📁 Current directory:', __dirname);
console.log('🔑 EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('🔑 EXPO_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
console.log('🔑 EXPO_PUBLIC_SUPABASE_ANON_KEY length:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.length);

export default {
  expo: {
    name: "FLASH",
    slug: "flash",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.foursighteducation.flash",
      buildNumber: "1"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.foursighteducation.flash",
      versionCode: 1
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "9bc8cac1-4205-4936-8f04-1834449f28a5"
      },
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qkapwhyxcpgzahuemucg.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    owner: "tonydennis"
  }
}; 