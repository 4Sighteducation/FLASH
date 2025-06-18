# Social Authentication Setup Guide

This guide covers setting up OAuth authentication for Google, Microsoft, and Apple in your FLASH app.

## Prerequisites

- Supabase project (already set up)
- Google Cloud Console account
- Microsoft Azure account (free tier works)
- Apple Developer account ($99/year) - for Apple Sign In

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

## 2. Microsoft (Azure AD) Authentication Setup

### A. Azure Portal Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Azure Active Directory → App registrations
3. Click "New registration"
4. Configure:
   - Name: `FLASH Education App`
   - Account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI (Web): 
   ```
   https://qkapwhyxcpgzahuemucg.supabase.co/auth/v1/callback
   ```
5. After registration, note your:
   - Application (client) ID
   - Directory (tenant) ID

### B. Create Client Secret

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Add description and expiration
4. Copy the secret value immediately

### C. Supabase Configuration

1. Enable Azure provider in Supabase
2. Add:
   - Client ID (Application ID)
   - Secret (Client secret)
   - URL: `https://login.microsoftonline.com/common`

## 3. Apple Authentication Setup

### A. Apple Developer Portal

1. Go to [Apple Developer](https://developer.apple.com)
2. Create an App ID with "Sign in with Apple" capability
3. Create a Service ID for web authentication
4. Configure return URLs:
   ```
   https://qkapwhyxcpgzahuemucg.supabase.co/auth/v1/callback
   ```

### B. Generate Private Key

1. Go to Keys section
2. Create a new key with "Sign in with Apple" enabled
3. Download the .p8 file (keep it secure!)
4. Note the Key ID

### C. Supabase Configuration

1. Enable Apple provider in Supabase
2. Add:
   - Service ID (not the App ID)
   - Team ID (from membership page)
   - Key ID
   - Private Key (contents of .p8 file)

### D. Implementation Notes

- Apple Sign In button only shows on iOS devices
- Requires Apple Developer account ($99/year)
- Must follow Apple's design guidelines for the button

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
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Apple Sign In](https://developer.apple.com/sign-in-with-apple/) 