# Social Authentication Setup Guide

This guide covers setting up OAuth authentication for Google, TikTok, and Snapchat in your FLASH app.

## Prerequisites

- Supabase project (already set up)
- Google Cloud Console account
- TikTok Developer account (for TikTok login)
- Snapchat Developer account (for Snapchat login)

## 1. Google Authentication Setup

### A. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click Enable

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     ```
     https://qkapwhyxcpgzahuemucg.supabase.co/auth/v1/callback
     ```

5. Copy your:
   - Client ID
   - Client Secret

### B. Supabase Configuration

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to Authentication → Providers
3. Find Google and click "Enable"
4. Add your Google credentials:
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)
5. Save

### C. Mobile App Configuration

For production builds, you need to add the following to your app config:

```javascript
// app.config.js
android: {
  googleServicesFile: "./google-services.json", // Download from Firebase Console
}
```

## 2. TikTok Authentication Setup

### A. TikTok Developer Portal

1. Go to [TikTok Developer Portal](https://developers.tiktok.com/)
2. Create a new app
3. Add OAuth redirect URI:
   ```
   https://qkapwhyxcpgzahuemucg.supabase.co/auth/v1/callback
   ```
4. Note your:
   - Client Key
   - Client Secret

### B. Supabase Configuration

**Note**: TikTok is not a built-in provider in Supabase. You'll need to:

1. Use custom OAuth provider setup
2. Or wait for official support
3. Consider using Auth0 or another service as middleware

### C. Implementation Status

Currently showing "Coming Soon" message in the app. To implement:

1. Set up custom OAuth flow
2. Handle TikTok's specific OAuth requirements
3. Update `socialAuth.ts` with actual implementation

## 3. Snapchat Authentication Setup

### A. Snapchat Developer Portal

1. Go to [Snapchat Kit Developer Portal](https://kit.snapchat.com/manage)
2. Create a new app
3. Enable "Login Kit"
4. Add OAuth redirect URI:
   ```
   https://qkapwhyxcpgzahuemucg.supabase.co/auth/v1/callback
   ```
5. Note your:
   - Client ID
   - Client Secret

### B. Supabase Configuration

**Note**: Like TikTok, Snapchat requires custom OAuth setup in Supabase.

### C. Implementation Status

Currently showing "Coming Soon" message. Similar requirements to TikTok.

## 4. Testing Social Auth

### Development Testing

1. Use Expo Go app (limited OAuth support)
2. Or build a development client:
   ```bash
   eas build --profile development --platform android
   ```

### Production Testing

1. Build production app:
   ```bash
   eas build --profile production --platform android
   ```
2. Test on real devices
3. Ensure redirect URIs match exactly

## 5. Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Check URI matches exactly in provider console
   - Include trailing slashes if required

2. **"Authentication failed"**
   - Verify client ID/secret are correct
   - Check provider is enabled in Supabase

3. **App crashes on OAuth**
   - Ensure `expo-web-browser` is installed
   - Check scheme is properly configured

### Debug Tips

```javascript
// Add to socialAuth.ts for debugging
console.log('Redirect URI:', redirectUri);
console.log('Auth URL:', data?.url);
```

## 6. Security Considerations

1. **Never expose secrets**: Keep client secrets server-side only
2. **Use proper scopes**: Only request necessary permissions
3. **Handle tokens securely**: Supabase manages this automatically
4. **Validate users**: Check email verification status

## 7. Next Steps

1. **Email verification**: Consider requiring email verification
2. **Profile completion**: Prompt users to complete profile after social login
3. **Account linking**: Allow users to link multiple social accounts
4. **Analytics**: Track which auth methods are most popular

## Required Environment Variables

None needed for client-side OAuth - Supabase handles the OAuth flow securely.

## Platform-Specific Notes

### Android
- Google Sign-In works out of the box
- Other providers may require additional manifest entries

### iOS
- Add URL schemes to Info.plist
- Apple Sign-In available (native implementation recommended)

### Web
- All providers work via redirect flow
- Pop-up blockers may interfere

## Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Expo AuthSession Docs](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google Identity Platform](https://developers.google.com/identity)
- [TikTok Login Kit](https://developers.tiktok.com/doc/login-kit-web)
- [Snapchat Login Kit](https://docs.snapchat.com/docs/login-kit/) 