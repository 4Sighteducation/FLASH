# FLASH App - OAuth Authentication Issues Handover Document

## Current Status (As of June 18, 2025)

### ✅ What's Working:
1. **Android Build**: Successfully built and uploaded to Google Play (closed testing)
2. **iOS Build**: Successfully built (build #3) and submitted to TestFlight
3. **Email/Password Authentication**: Working correctly on iOS
4. **Supabase Connection**: Confirmed working (environment variables are correct in EAS)
5. **Deep Link Configuration**: URLs are properly configured in Supabase

### ❌ What's Not Working:
1. **Social OAuth Authentication** (Google, Microsoft, Apple):
   - OAuth flow completes successfully
   - No Safari errors anymore
   - BUT: App doesn't receive/process the callback
   - User remains on login screen after authentication

## Technical Details

### Environment Variables (Confirmed in EAS):
- `EXPO_PUBLIC_SUPABASE_URL`: `https://qkapwhyxcpgzahuemucg.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Set correctly (starts with `eyJhbGciOiJIUzI1N...`)

### Supabase Configuration:
- **Site URL**: `flash://`
- **Redirect URLs**:
  - `com.foursighteducation.flash://auth/callback`
  - `flash://auth/callback`

### App Configuration (app.config.js):
```javascript
scheme: "flash"
ios: {
  bundleIdentifier: "com.foursighteducation.flash",
  buildNumber: "4", // Ready for next build
}
```

## Root Cause Analysis

The issue is specifically with **deep linking on iOS**. The OAuth providers are redirecting correctly, but the app isn't capturing the deep link callback. This is because:

1. The iOS app isn't properly configured to handle the deep link URLs
2. The current `expo-auth-session` setup in `socialAuth.ts` may not be correctly handling the callback

## Solution Steps

### 1. Update socialAuth.ts to use proper redirect URI:
```javascript
const redirectUri = makeRedirectUri({
  scheme: 'com.foursighteducation.flash',
  path: 'auth/callback',
  preferLocalhost: false,
  isTripleSlashed: true,
});
```

### 2. Add iOS URL schemes to app.config.js:
```javascript
ios: {
  // ... existing config
  infoPlist: {
    // ... existing permissions
    CFBundleURLTypes: [
      {
        CFBundleURLSchemes: [
          'com.foursighteducation.flash',
          'flash'
        ]
      }
    ]
  }
}
```

### 3. Update App.tsx deep link handling:
The current implementation logs but doesn't properly handle the OAuth response. Need to process the URL parameters.

### 4. Consider using expo-auth-session properly:
The current implementation opens the browser but doesn't properly wait for the response. May need to restructure the OAuth flow.

## Files Modified in This Session:
1. `app.config.js` - Added privacy permissions, incremented build number
2. `eas.json` - Switched to local version management, added App Store Connect ID
3. `metro.config.js` - Simplified configuration
4. `App.tsx` - Added basic deep link handling (needs improvement)
5. `src/screens/auth/LoginScreen.tsx` - Fixed vespalogo reference
6. `src/screens/auth/SignUpScreen.tsx` - Fixed missing image, removed duplicate VESPA section

## Next Build Requirements:
- iOS Build #4 is ready to build with OAuth fixes
- Android Build (version code 2) is ready if needed

## Immediate Next Steps:
1. Update `socialAuth.ts` with proper redirect URI configuration
2. Add URL schemes to `app.config.js`
3. Properly handle OAuth callbacks in App.tsx
4. Build iOS version 4
5. Test all OAuth providers

## Testing Notes:
- Email login works = Supabase connection is good
- OAuth completes = Provider configuration is correct
- App doesn't update = Deep linking issue

## Critical Information:
- Apple Developer Account: `tony@vespa.academy`
- Team ID: `583RMY9GN3`
- App Store Connect App ID: `6747457678`
- Bundle ID: `com.foursighteducation.flash`
- Current TestFlight Build: #3 (has privacy permissions)
- Next Build: #4 (will have OAuth fixes)

## Known Issues to Address:
1. Deep linking for OAuth callbacks
2. Old splash screen still showing (mentioned by user)
3. "Failed to save subjects" error after email login

## Support Resources:
- Supabase Project: `qkapwhyxcpgzahuemucg`
- EAS Project ID: `9bc8cac1-4205-4936-8f04-1834449f28a5`
- GitHub Repo: `https://github.com/4Sighteducation/FLASH` 