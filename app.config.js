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
    version: "1.0.4",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0F172A"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.foursighteducation.flash",
      buildNumber: "9",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSMicrophoneUsageDescription: "FLASH needs access to your microphone to record voice answers for flashcards. This helps you practice speaking and improves your learning experience.",
        NSCameraUsageDescription: "FLASH needs access to your camera to capture images for creating flashcards from photos of your notes or textbooks.",
        NSPhotoLibraryUsageDescription: "FLASH needs access to your photo library to select images for creating flashcards from your saved photos.",
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "com.foursighteducation.flash",
              "flash"
            ]
          }
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0F172A"
      },
      package: "com.foursighteducation.flash",
      versionCode: 4
    },
    web: {
      favicon: "./assets/icon.png"
    },
    scheme: "flash",
    plugins: [
      "expo-font"
    ],
    extra: {
      eas: {
        projectId: "9bc8cac1-4205-4936-8f04-1834449f28a5"
      },
      EXPO_PUBLIC_SUPABASE_URL: 'https://qkapwhyxcpgzahuemucg.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrYXB3aHl4Y3BnemFodWVtdWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NTgzNTUsImV4cCI6MjA2NTEzNDM1NX0.Labu2GwodnfEce4Nh5oBqTBTaD3weN63nKRMwAsyfbg',
    },
    owner: "tonydennis"
  }
}; 