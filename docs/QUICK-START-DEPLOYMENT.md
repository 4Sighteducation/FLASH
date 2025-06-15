# FLASH App - Quick Start Deployment Steps

## 🚀 Immediate Next Steps

### Step 1: Install EAS CLI (5 minutes)
```bash
npm install -g eas-cli
eas login
```

### Step 2: Initialize EAS in your project (2 minutes)
```bash
cd /c/Users/tonyd/OneDrive\ -\ 4Sight\ Education\ Ltd/Apps/FLASH
eas build:configure
```

### Step 3: Create Developer Accounts (30-60 minutes)
1. **Apple Developer** ($99/year): https://developer.apple.com
   - Use your business Apple ID
   - Select "Organization" if you have a D-U-N-S number
   - Otherwise, select "Individual"

2. **Google Play Developer** ($25 one-time): https://play.google.com/console
   - Use your business Google account
   - Complete identity verification

### Step 4: First Test Build (30 minutes)
```bash
# Build for iOS simulator (no Apple account needed yet)
eas build --platform ios --profile development

# Build APK for Android testing
eas build --platform android --profile preview
```

### Step 5: Test on Real Devices
1. **iOS**: Download to simulator or use Expo Go app
2. **Android**: Download APK directly to device

## 📱 Demo/Testing Environments

### iOS TestFlight (Apple's Sandbox)
- Internal Testing: Up to 100 testers (your team)
- External Testing: Up to 10,000 testers
- Builds expire after 90 days
- Perfect for demo versions!

### Google Play Internal Testing (Google's Sandbox)
- Internal Testing: Up to 100 testers
- Closed Testing: Unlimited testers
- Open Testing: Anyone with link
- Also perfect for demos!

## 🔄 Update Process

### Quick Updates (JavaScript only)
```bash
# Publishes instantly to users, no app store review!
expo publish
```

### Full Updates (Native code changes)
```bash
# 1. Update version in app.config.js
# 2. Build new version
eas build --platform all --profile production
# 3. Submit to stores
eas submit --platform all --latest
```

## ⚡ Today's Action Items

1. **Right Now**: Install EAS CLI
2. **Today**: Create developer accounts
3. **Tomorrow**: Make first test build
4. **This Week**: Get app on TestFlight/Internal Testing

## 🎯 Pro Tips for First-Time Publishers

1. **Start with Android**: Faster review process (hours vs days)
2. **Use TestFlight First**: Get feedback before public release
3. **Prepare Screenshots Early**: Takes longer than you think
4. **Write Privacy Policy**: Required by both stores
5. **Test Payment Features**: In sandbox environments first

## 📋 Pre-Launch Checklist

Before submitting to stores:
- [ ] App icons ready (1024x1024 for iOS, 512x512 for Android)
- [ ] Screenshots prepared (see main guide for sizes)
- [ ] Privacy Policy URL live
- [ ] Tested on real devices
- [ ] OpenAI API key removed from code (users add their own)

## 🆘 Common First-Timer Issues

1. **"Bundle identifier already exists"**
   - Change in app.config.js to something unique

2. **"EAS build failed"**
   - Usually missing environment variables
   - Check your .env file

3. **"App rejected by Apple"**
   - Normal! They'll tell you exactly what to fix
   - Usually screenshot or metadata issues

## 🎉 Your First Week Timeline

**Day 1**: Set up accounts, install tools
**Day 2**: Create first test builds
**Day 3**: Test on devices, fix issues
**Day 4**: Prepare store assets (screenshots, descriptions)
**Day 5**: Submit to TestFlight/Internal Testing
**Day 6**: Share with beta testers
**Day 7**: Gather feedback, plan improvements

Remember: Getting rejected is part of the process. Every app goes through it!

Need help? The Expo Discord is incredibly helpful: https://chat.expo.dev 