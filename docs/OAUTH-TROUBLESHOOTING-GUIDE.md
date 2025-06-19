# OAuth Troubleshooting Guide for iOS

## Changes Made to Fix OAuth on iOS

### 1. Updated socialAuth.ts
- Changed redirect URI to use bundle identifier on iOS: `com.foursighteducation.flash://auth/callback`
- Added triple-slash format and preferLocalhost: false
- Added console logging for debugging

### 2. Updated app.config.js
- Added CFBundleURLTypes with both schemes: `com.foursighteducation.flash` and `flash`
- Added associatedDomains for universal links
- Incremented build number to 5

### 3. Created OAuth Handler Utility
- New file: `src/utils/oauthHandler.ts`
- Handles different URL formats (hash fragments and query params)
- Properly extracts and validates tokens
- Sets session with error handling

### 4. Updated App.tsx
- Integrated new OAuth handler
- Better error handling and logging

## Required Supabase Dashboard Settings

1. **Site URL**: `com.foursighteducation.flash://`
2. **Redirect URLs** (add all of these):
   - `com.foursighteducation.flash://auth/callback`
   - `com.foursighteducation.flash:///auth/callback`
   - `flash://auth/callback`

## OAuth Provider Settings

### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Add these Authorized redirect URIs:
   - `https://qkapwhyxcpgzahuemucg.supabase.co/auth/v1/callback`

### Microsoft/Azure
1. Go to Azure Portal
2. Add these Redirect URIs:
   - `https://qkapwhyxcpgzahuemucg.supabase.co/auth/v1/callback`

### Apple
1. Configure in Apple Developer Console
2. Use the same redirect URI pattern

## Testing OAuth Flow

### 1. Build and Deploy
```bash
# Build for iOS
eas build --platform ios --profile preview

# Submit to TestFlight
eas submit -p ios --latest
```

### 2. Test Each Provider
1. Open the app from TestFlight
2. Go to login screen
3. Try each OAuth provider
4. Check console logs in Xcode if issues persist

### 3. Debug Using Console Logs
The app will log:
- OAuth Redirect URI on app start
- OAuth callback URL when received
- Token extraction process
- Session setting results

### 4. Common Issues and Solutions

#### Issue: App stays on login screen
**Solution**: Check that all redirect URLs are properly configured in Supabase dashboard

#### Issue: "Safari cannot open the page"
**Solution**: Ensure CFBundleURLTypes are correctly set in app.config.js

#### Issue: OAuth completes but no session
**Solution**: Check console logs for token extraction errors

#### Issue: Invalid redirect URI error
**Solution**: Verify OAuth provider has correct redirect URI configured

## Next Steps if Issues Persist

1. **Check Xcode Console**: Connect device to Xcode and monitor console output
2. **Verify Deep Links**: Test with `xcrun simctl openurl booted "com.foursighteducation.flash://auth/callback"`
3. **Check Supabase Logs**: Look for auth errors in Supabase dashboard
4. **Test in Safari**: Try the OAuth flow in mobile Safari to isolate app-specific issues

## Contact for Support
If OAuth still doesn't work after these changes:
1. Check the console logs for specific error messages
2. Verify all URLs match exactly (no trailing slashes unless specified)
3. Ensure the latest build (#5) is deployed to TestFlight 