# In-App Purchases Build Guide

## The Problem

`expo-in-app-purchases` requires native code that isn't available in Expo Go. This means you need to create a custom development build or production build to test and use in-app purchases.

## Current Solution for Development

We've created a mock version of the SubscriptionContext that:
- Allows the app to run in Expo Go
- Defaults to "full" tier (no limits)
- Shows alerts when IAP functions are called

## How to Build with Real IAP

### Option 1: EAS Build (Recommended)

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Configure your project**:
   ```bash
   eas build:configure
   ```

3. **Build for development**:
   ```bash
   # iOS development build
   eas build --profile development --platform ios

   # Android development build  
   eas build --profile development --platform android
   ```

4. **Install on device/simulator**:
   - Download the build from the Expo dashboard
   - Install on your device or simulator

### Option 2: Local Build (Advanced)

1. **Prebuild the project**:
   ```bash
   npx expo prebuild
   ```

2. **Build locally**:
   ```bash
   # iOS (requires Mac)
   cd ios && pod install
   npx react-native run-ios

   # Android
   cd android
   ./gradlew assembleDebug
   ```

## Switching Between Mock and Real IAP

### For Development (Expo Go):
- Uses `SubscriptionContext.mock.tsx`
- No purchase functionality
- Full access to all features

### For Production Build:
1. Update imports in these files:
   - `App.tsx`
   - `src/screens/main/ProfileScreen.tsx`
   - `src/screens/onboarding/SubjectSelectionScreen.tsx`
   - `src/screens/cards/CreateCardScreen.tsx`

   Change:
   ```typescript
   import { useSubscription } from '../../contexts/SubscriptionContext.mock';
   ```
   
   To:
   ```typescript
   import { useSubscription } from '../../contexts/SubscriptionContext';
   ```

2. Build with EAS or locally

## Testing In-App Purchases

### iOS Testing:
1. Create Sandbox tester accounts in App Store Connect
2. Sign out of real Apple ID on device
3. Sign in with Sandbox account when prompted

### Android Testing:
1. Upload APK to Google Play Console (Internal Testing)
2. Add test accounts
3. Install from Play Store test track

## Important Notes

- **Never test with real money** - use test accounts
- **Configure products** in both app stores before testing
- **Server-side validation** recommended for production
- **Keep mock version** for easier development

## Quick Commands

```bash
# Development with mock IAP
npm run iap:mock      # Switch to mock IAP
npm run start         # Start Expo Go

# Production with real IAP
npm run iap:real      # Switch to real IAP
npm run build:android # Build for Android (automatically switches to real IAP)
npm run build:ios     # Build for iOS (automatically switches to real IAP)

# Manual switching
node scripts/toggle-iap.js mock  # For development
node scripts/toggle-iap.js real  # For production
```

## Workflow Summary

1. **For Development**: 
   ```bash
   npm run iap:mock
   npx expo start
   ```

2. **For Production Build**:
   ```bash
   npm run build:android  # Automatically switches to real IAP
   ``` 