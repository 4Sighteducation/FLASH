# FLASH App - Play Store Testing Checklist

## Pre-Launch Checklist

### ✅ App Configuration
- [ ] Version number is correct (currently 1.0.0)
- [ ] Package name is correct: `com.foursighteducation.flash`
- [ ] App icons are properly sized
- [ ] Splash screen displays correctly

### ✅ Required Assets Ready
- [ ] App icon 512x512 (✓ Already have in `assets/store-icons/google-play-icon-512.png`)
- [ ] Feature graphic 1024x500 (optional but recommended)
- [ ] Screenshots (minimum 2, recommended 4-8)
  - Phone: 1080×1920 or similar 16:9 ratio
  - Tablet: Optional but recommended

### ✅ Store Listing Content
- [ ] App name: **FLASH - Smart Study Cards**
- [ ] Short description (80 chars): **AI-powered flashcards for GCSE & A-Level success**
- [ ] Full description (ready to copy)
- [ ] Category: **Education**
- [ ] Content rating: **Everyone**

## Step 1: Build Production AAB

```bash
# Run this command:
eas build --platform android --profile production
```

Build URL will appear here: _________________

## Step 2: Google Play Console Setup

### A. Create/Access Your App
1. Go to [Google Play Console](https://play.google.com/console)
2. Click **Create app** (or select existing)
3. Fill in:
   - App name: **FLASH - Smart Study Cards**
   - Default language: **English (United States)**
   - App or game: **App**
   - Free or paid: **Free**
   - Accept declarations

### B. Complete Store Listing
1. Go to **Store presence → Main store listing**
2. Upload:
   - App icon (512×512)
   - Feature graphic (1024×500) - optional
   - Phone screenshots (at least 2)
3. Fill in descriptions (copy from below)

### C. Set Up Internal Testing
1. Go to **Testing → Internal testing**
2. Click **Create new release**
3. Upload your AAB file
4. Release name: `v1.0.0-internal-1`
5. Release notes:
   ```
   Initial internal testing release
   - Core flashcard functionality
   - AI card generation
   - Voice answer assessment
   - Leitner box system
   ```

### D. Add Testers
1. Click **Testers** tab
2. Create email list named "Internal Team"
3. Add emails:
   - Your personal email
   - Team members
   - Beta testers
4. Save

### E. Roll Out
1. Review the release
2. Click **Start rollout to Internal testing**
3. Copy the opt-in URL
4. Share with testers

## Step 3: Testing Process

### For Testers:
1. Click the opt-in URL
2. Accept invitation
3. Wait 5-30 minutes for propagation
4. Search for "FLASH" in Play Store
5. Install the app (will show as beta)

### What to Test:
- [ ] App installs correctly
- [ ] Login/signup works
- [ ] Subject selection works
- [ ] Card creation (manual and AI)
- [ ] Image scanning
- [ ] Study mode
- [ ] Voice answers
- [ ] Settings persist

## Step 4: Monitoring

### Check Daily:
- **Crashes & ANRs** in Play Console
- **User feedback** in reviews
- **Install/uninstall** metrics

### Before Public Release:
- [ ] Test on multiple devices
- [ ] Fix any crashes
- [ ] Optimize based on feedback
- [ ] Prepare marketing materials

## App Description Template

```
FLASH revolutionizes exam preparation for GCSE and A-Level students with AI-powered flashcards and smart study techniques.

KEY FEATURES:
✓ AI-Generated Flashcards - Create study cards instantly with advanced AI
✓ Voice Answer Assessment - Speak your answers and get instant AI feedback
✓ Leitner Box System - Scientifically proven spaced repetition for better retention
✓ Complete Curriculum Coverage - All major UK exam boards included
✓ Image-to-Card Generation - Snap photos of your notes to create flashcards
✓ Progress Tracking - Monitor your learning journey with detailed statistics

SUBJECTS COVERED:
• Mathematics
• Sciences (Biology, Chemistry, Physics)
• English Literature & Language
• History, Geography, Psychology
• Modern Languages
• Business Studies, Economics
• And many more!

SMART STUDY FEATURES:
• Customizable topic priorities
• Daily review reminders
• Offline study mode
• Beautiful, distraction-free interface
• Personalized learning paths

EXAM BOARDS SUPPORTED:
• AQA
• Edexcel
• OCR
• WJEC
• CCEA
• SQA

Perfect for students preparing for:
- GCSE examinations
- A-Level examinations
- AS-Level examinations
- Mock exams and assessments

PRIVACY & SECURITY:
Your data is secure and private. We use industry-standard encryption and never share your personal information.

Start studying smarter, not harder with FLASH!

Note: Users provide their own OpenAI API key for AI features, ensuring complete control over AI usage and costs.
```

## Version Management

### Current Version:
- Version name: `1.0.0`
- Version code: `1` (auto-managed by EAS)

### For Updates:
1. Increment version in `app.config.js`
2. Build new AAB
3. Upload to same testing track
4. Testers get automatic updates

## Troubleshooting

### "App not available"
- Wait 5-30 minutes after rollout
- Ensure tester accepted invitation
- Check email is in tester list

### Crashes on launch
- Check crash reports in Play Console
- Verify all environment variables
- Test on multiple Android versions

### Update not showing
- Ensure higher version code
- Clear Play Store cache
- Wait for propagation

## Next Steps After Testing

1. **Closed Beta** (optional)
   - Wider audience (100-1000 users)
   - Public opt-in possible

2. **Production Release**
   - Gradual rollout (5% → 10% → 50% → 100%)
   - Monitor metrics closely
   - Be ready to halt if issues

## Important Links

- [Play Console](https://play.google.com/console)
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)
- [Screenshot Generator](https://screenshots.pro/)
- Build Status: [Check EAS](https://expo.dev/accounts/tonydennis/projects/flash/builds) 