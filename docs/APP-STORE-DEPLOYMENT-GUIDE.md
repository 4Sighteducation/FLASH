# FLASH App Store Deployment Guide

## Overview
This guide walks you through deploying FLASH to both Apple App Store and Google Play Store using Expo Application Services (EAS).

## Prerequisites

### 1. Developer Accounts
- **Apple Developer Account**: $99/year at [developer.apple.com](https://developer.apple.com)
- **Google Play Developer Account**: $25 one-time fee at [play.google.com/console](https://play.google.com/console)

### 2. Install EAS CLI
```bash
npm install -g eas-cli
```

### 3. Login to Expo
```bash
eas login
```

## Part 1: Initial Setup

### 1. Configure EAS Build
The `eas.json` file has been created with three build profiles:
- **development**: For testing on simulators/emulators
- **preview**: For internal testing (TestFlight/Internal Testing)
- **production**: For app store releases

### 2. Update App Configuration
Update `app.config.js` with your production details:
- Increment version numbers for updates
- Ensure bundle identifiers match your developer accounts

## Part 2: iOS App Store Deployment

### Step 1: Apple Developer Setup
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "+" and select "New App"
3. Fill in:
   - Platform: iOS
   - Name: FLASH
   - Primary Language: English
   - Bundle ID: com.foursighteducation.flash
   - SKU: FLASH-001 (or any unique identifier)

### Step 2: Build for iOS
```bash
# First build (creates provisioning profiles)
eas build --platform ios --profile preview

# Production build
eas build --platform ios --profile production
```

### Step 3: Submit to TestFlight
```bash
# Submit to TestFlight for testing
eas submit --platform ios --latest
```

### Step 4: TestFlight Testing
1. In App Store Connect, go to TestFlight tab
2. Add internal testers (your team)
3. Once approved (~24 hours), test the app
4. Add external testers if needed

### Step 5: Submit for Review
1. In App Store Connect, go to "App Store" tab
2. Fill in all required information:
   - App Description
   - Keywords
   - Screenshots (required sizes: 6.7", 6.5", 5.5")
   - App Preview (optional video)
   - Age Rating
   - Privacy Policy URL
3. Submit for review

## Part 3: Google Play Store Deployment

### Step 1: Google Play Console Setup
1. Log in to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in:
   - App name: FLASH
   - Default language: English
   - App or game: App
   - Free or paid: Free

### Step 2: Build for Android
```bash
# Test build (APK)
eas build --platform android --profile preview

# Production build (AAB)
eas build --platform android --profile production
```

### Step 3: Internal Testing
1. In Play Console, go to "Testing" > "Internal testing"
2. Create a release
3. Upload the AAB file from EAS build
4. Add testers by email
5. Share testing link

### Step 4: Production Release
1. Complete all sections in Play Console:
   - App content (privacy policy, ads, content rating)
   - Store listing (description, screenshots, graphics)
   - App pricing and distribution
2. Go to "Production" > "Create release"
3. Upload production AAB
4. Submit for review

## Part 4: Required Assets

### App Icons
- iOS: 1024x1024px (no transparency, no rounded corners)
- Android: 512x512px

### Screenshots
#### iOS (Required)
- 6.7" (iPhone 15 Pro Max): 1290 × 2796
- 6.5" (iPhone 14 Plus): 1284 × 2778 or 1242 × 2688
- 5.5" (iPhone 8 Plus): 1242 × 2208

#### Android (Required)
- Phone: 1080 × 1920 (or similar 16:9 ratio)
- Tablet: 1920 × 1080 (optional but recommended)

### Store Listing Content
- **App Name**: FLASH - Smart Study Cards
- **Short Description** (80 chars): AI-powered flashcards for GCSE & A-Level success
- **Full Description**: (See template below)
- **Keywords**: flashcards, study, GCSE, A-Level, education, learning, AI, revision
- **Category**: Education
- **Privacy Policy URL**: Required for both stores

### App Description Template
```
FLASH revolutionizes exam preparation for GCSE and A-Level students with AI-powered flashcards and smart study techniques.

KEY FEATURES:
✓ AI-Generated Flashcards - Create study cards instantly
✓ Voice Answer Assessment - Speak your answers, get AI feedback
✓ Leitner Box System - Scientifically proven spaced repetition
✓ Complete Curriculum Coverage - All major exam boards
✓ Image-to-Card Generation - Snap photos of notes to create cards
✓ Progress Tracking - Monitor your learning journey

SUBJECTS COVERED:
• Mathematics
• Sciences (Biology, Chemistry, Physics)
• English Literature & Language
• History, Geography, Psychology
• Modern Languages
• And many more!

SMART STUDY FEATURES:
• Customizable topic priorities
• Daily review reminders
• Offline study mode
• Beautiful, distraction-free interface

Perfect for students preparing for:
- GCSE examinations
- A-Level examinations
- Mock exams and assessments

Start studying smarter, not harder with FLASH!
```

## Part 5: Updating Your App

### Version Updates
1. Update version in `app.config.js`:
   ```javascript
   version: "1.0.1",  // Increment for updates
   ios: {
     buildNumber: "2"  // Increment for each build
   },
   android: {
     versionCode: 2  // Increment for each build
   }
   ```

2. Build new version:
   ```bash
   eas build --platform all --profile production
   ```

3. Submit update:
   ```bash
   eas submit --platform all --latest
   ```

### Over-the-Air (OTA) Updates
For JavaScript-only changes:
```bash
expo publish
```
Users will get updates automatically without app store review!

## Part 6: Testing Checklist

### Before First Submission
- [ ] Test on real devices (not just simulators)
- [ ] Check all API keys are working
- [ ] Verify Supabase connection
- [ ] Test user registration/login flow
- [ ] Test core features (card creation, study mode)
- [ ] Check offline functionality
- [ ] Review crash analytics
- [ ] Test on different screen sizes

### Privacy & Compliance
- [ ] Privacy Policy URL active
- [ ] Terms of Service URL (if applicable)
- [ ] GDPR compliance for EU users
- [ ] Age rating questionnaire completed
- [ ] Export compliance (for encryption)

## Part 7: Common Issues & Solutions

### iOS Issues
1. **Missing Push Notification Capability**: Add in Apple Developer portal
2. **Invalid Bundle ID**: Must match exactly with Apple Developer account
3. **Missing Screenshots**: All required sizes must be provided

### Android Issues
1. **Target API Level**: Must meet Google's requirements (currently API 33+)
2. **64-bit Requirement**: EAS handles this automatically
3. **App Bundle Signing**: Use Google Play App Signing

## Part 8: Timeline Expectations

### iOS App Store
- TestFlight Build Review: 24-48 hours
- App Store Review: 24-72 hours (can be expedited)
- Updates: Usually faster (24 hours)

### Google Play Store
- Internal Testing: Available immediately
- Production Review: 2-3 hours to 24 hours
- Updates: 2-3 hours

## Part 9: Post-Launch

### Monitor Performance
1. **App Store Connect**: Check Analytics, Crashes, Reviews
2. **Google Play Console**: Check Statistics, Crashes, Reviews
3. **Expo Dashboard**: Monitor OTA update adoption

### Respond to Reviews
- Both stores allow developer responses
- Address issues promptly
- Thank positive reviewers

### Regular Updates
- Fix bugs quickly
- Add requested features
- Keep content fresh
- Maintain compatibility with OS updates

## Emergency Procedures

### Critical Bug After Release
1. **iOS**: Request expedited review
2. **Android**: Use staged rollout, halt if needed
3. **Both**: Push OTA update for JS fixes

### Rollback Procedure
- iOS: Submit new build with previous code
- Android: Use previous APK/AAB in Play Console

## Support Resources

- [Expo Documentation](https://docs.expo.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [App Store Guidelines](https://developer.apple.com/app-store/guidelines/)
- [Google Play Policies](https://play.google.com/console/policy)

---

Remember: Your first submission might get rejected - this is normal! Address the feedback and resubmit. Good luck with your launch! 🚀 