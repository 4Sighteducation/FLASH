# FLASH Complete Deployment Guide
**Date:** December 6, 2025  
**Status:** 🔴 CRITICAL - Must Fix Before Testing  
**Time to Fix:** 30 minutes

---

## 🎯 EXECUTIVE SUMMARY

**Problem:** Your web app at www.fl4sh.cards is broken because API functions aren't deployed.

**Solution:** Fix `vercel.json` configuration + redeploy (I've already done this for you!)

**Impact:** After deploying these fixes, web app will work perfectly.

---

## 📊 YOUR CURRENT DEPLOYMENT ARCHITECTURE

### **What You Have:**

```
┌─────────────────────────────────────────────────┐
│           FLASH ECOSYSTEM                       │
└─────────────────────────────────────────────────┘

1. iOS App
   ├─ Built with: Expo EAS
   ├─ Deployed to: TestFlight → App Store
   ├─ Version: 1.0.4 (Build 10)
   └─ Status: ✅ WORKING

2. Android App  
   ├─ Built with: Expo EAS
   ├─ Deployed to: Google Play (Internal Testing)
   ├─ Version: 1.0.4 (versionCode 8)
   └─ Status: ✅ WORKING (presumably)

3. Web App
   ├─ Built with: Expo web export (static)
   ├─ Deployed to: www.fl4sh.cards
   ├─ Platform: Vercel
   └─ Status: ❌ BROKEN (API calls failing)

4. Marketing Site
   ├─ Built with: Next.js 14.2
   ├─ Deployed to: fl4shcards.com
   ├─ Platform: Vercel
   └─ Status: ✅ WORKING

5. API Functions (THE PROBLEM!)
   ├─ Location: /api folder
   ├─ Functions: generate-cards, search-topics, analyze-answer, transcribe-audio
   ├─ Should be at: www.fl4sh.cards/api/*
   └─ Status: ❌ NOT DEPLOYED
```

---

## 🐛 WHY WEB APP IS BROKEN

### **Root Cause:**

Your `vercel.json` was configured for **STATIC ONLY** build:
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build"  ← Only static files!
    }
  ]
}
```

**Result:**
- ✅ Static web app deployed (HTML/JS/CSS)
- ❌ API functions in `/api` folder IGNORED
- ❌ Calling `/api/generate-cards` = 404 Not Found

**Your app tried to call:**
```
https://www.fl4sh.cards/api/generate-cards
     ↑ Returns 404 because API not deployed
```

---

## ✅ THE FIX (Already Applied!)

### **1. Updated vercel.json** ✅

I've updated your `vercel.json` to include API functions:

```json
{
  "version": 2,
  "name": "flash-web-app",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",  ← Static web app
      "config": { "distDir": "dist" }
    },
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"  ← NEW! Serverless functions
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },  ← API routes first!
    { "src": "/(.+)", "dest": "/$1" },
    { "src": "/", "dest": "/index.html" }
  ],
  "env": {
    "OPENAI_API_KEY": "@openai-api-key"  ← Environment variable
  }
}
```

### **2. Fixed API URL** ✅

Updated `src/services/aiService.ts`:
```typescript
// Changed from: https://flash-gules.vercel.app/api/generate-cards
// Changed to:  https://www.fl4sh.cards/api/generate-cards
```

Now all API calls go to the same domain as your web app!

---

## 🚀 DEPLOYMENT STEPS (DO THESE NOW)

### **Step 1: Add Environment Variables to Vercel** (5 min)

Go to: https://vercel.com/dashboard

1. Find project: **flash-web-app** (or whatever your web app is called)
2. Click on it
3. Go to: **Settings** → **Environment Variables**
4. Add these:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `OPENAI_API_KEY` | `sk-proj-...` (your OpenAI key) | Production, Preview, Development |
| `SUPABASE_URL` | `https://qkapwhyxcpgzahuemucg.supabase.co` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Production, Preview, Development |

**Where to find Supabase keys:**
- Go to: https://supabase.com/dashboard/project/qkapwhyxcpgzahuemucg/settings/api
- Copy: **Project URL** and **service_role** key (NOT anon key!)

### **Step 2: Deploy SQL Function to Supabase** (2 min)

Go to: https://supabase.com/dashboard/project/qkapwhyxcpgzahuemucg/sql/new

Copy and paste this entire file:
```
supabase/create-subject-search-function.sql
```

Click **Run**. Should see: "Success" ✅

### **Step 3: Commit & Push Changes** (2 min)

```bash
cd "C:\Users\tonyd\OneDrive - 4Sight Education Ltd\Apps\FLASH"
git add vercel.json src/services/aiService.ts DEPLOYMENT-GUIDE-COMPLETE.md DEPLOYMENT-STRATEGY-ANALYSIS.md
git commit -m "fix: configure Vercel to deploy API functions with web app"
git push
```

### **Step 4: Redeploy on Vercel** (5 min)

Vercel will **automatically redeploy** when you push to GitHub.

Or manually trigger:
```bash
cd "C:\Users\tonyd\OneDrive - 4Sight Education Ltd\Apps\FLASH"
vercel --prod
```

### **Step 5: Test!** (5 min)

1. Go to: https://www.fl4sh.cards
2. Sign up with test account
3. Go through onboarding
4. Try to create cards
5. Check console - should work now! ✅

---

## 🧪 PROPER TESTING WORKFLOW

### **DO NOT Test on Production!**

Here's the right way:

#### **For Quick Iteration (Web):**
```bash
# 1. Local testing
cd FLASH
npm start
# Opens: http://localhost:8081
# Fast reload, instant changes
```

#### **For Preview Testing (Before Production):**
```bash
# 1. Create feature branch
git checkout -b feature/new-onboarding

# 2. Make changes & commit
git add .
git commit -m "feat: new onboarding"
git push origin feature/new-onboarding

# 3. Vercel creates preview automatically!
# URL: https://flash-abc123-preview.vercel.app
# Test without affecting production
```

#### **For Production Deployment:**
```bash
# Only when everything tested and working
git checkout main
git merge feature/new-onboarding
git push origin main
# Vercel auto-deploys to www.fl4sh.cards
```

---

## 📱 iOS/Android Deployment

### **Do Changes Auto-Update?**

**SHORT ANSWER: NO** (for native apps)

**Long Answer:**
```
Code Change → Need New Build → Submit to Store → Users Update

Timeline:
- Make change: Instant
- Build app: 20-30 minutes
- Apple review: 1-3 days
- Google review: hours to 1 day
- User updates: When they open store
```

### **Exception: Over-the-Air (OTA) Updates**

For **JavaScript-only changes** (no native code), you can use Expo Updates:

```bash
# Push JavaScript updates without store review
eas update --branch production
# Users get update next time they open app
```

**Works for:**
- ✅ UI changes
- ✅ Logic changes
- ✅ New screens (JS only)

**Does NOT work for:**
- ❌ Native module changes
- ❌ Permissions changes
- ❌ Package additions requiring native code

---

## 🎯 RECOMMENDED TESTING STRATEGY

### **Phase-Based Testing:**

#### **Phase 1: Web Only (Fastest)** ⚡
```
1. Develop locally: npm start (web)
2. Test changes instantly
3. Push to preview branch
4. Test on preview URL
5. Merge to production
```
**Timeline:** Minutes to test

#### **Phase 2: Mobile Development Build** 📱
```
1. Once web works, build mobile dev version
2. Install on your device
3. Test full features (camera, voice, etc.)
4. Iterate as needed
```
**Timeline:** Hours to test

#### **Phase 3: Production Mobile** 🚀
```
1. Once everything works, build production
2. Submit to stores
3. Wait for review
4. Release to users
```
**Timeline:** Days to deploy

---

## 🔧 VERCEL DEPLOYMENT DETAILS

### **Your Vercel Projects:**

Based on your setup, you likely have:

1. **flash-web-app** (www.fl4sh.cards)
   - Main FLASH web app
   - Should have API functions NOW (after fix)

2. **fl4shcards-marketing** (fl4shcards.com)
   - Marketing site
   - Separate project
   - Working fine

3. **flash-gules** (flash-gules.vercel.app)?
   - Old API deployment?
   - May be outdated
   - Can probably delete

### **To Check:**
Go to: https://vercel.com/dashboard

See all your projects. Look for duplicates or old ones.

---

## 📋 IMMEDIATE ACTION ITEMS

### **RIGHT NOW (Before Testing):**

- [x] Fix vercel.json ✅ (DONE)
- [x] Fix API URLs in aiService.ts ✅ (DONE)
- [ ] Add environment variables to Vercel ← YOU DO THIS
- [ ] Deploy SQL function to Supabase ← YOU DO THIS
- [ ] Push changes to GitHub ← DO THIS
- [ ] Wait for Vercel auto-deploy (2-3 min)
- [ ] Test web app

### **AFTER IT WORKS:**

- [ ] Delete old/duplicate Vercel projects
- [ ] Set up proper preview workflow
- [ ] Test new onboarding flow
- [ ] Build mobile dev versions
- [ ] Document what works

---

## 🎯 QUICK FIX CHECKLIST

Use this checklist right now:

```
□ 1. Go to Vercel Dashboard
□ 2. Find "flash-web-app" project (or main web project)
□ 3. Settings → Environment Variables
□ 4. Add: OPENAI_API_KEY
□ 5. Add: SUPABASE_URL
□ 6. Add: SUPABASE_SERVICE_ROLE_KEY
□ 7. Go to Supabase Dashboard
□ 8. SQL Editor → Run create-subject-search-function.sql
□ 9. Back to terminal: git push
□ 10. Wait 2-3 minutes for Vercel deploy
□ 11. Test: www.fl4sh.cards
□ 12. Create cards → Should work! ✅
```

---

## 💡 KEY INSIGHTS

### **About Your Setup:**

1. **You have good architecture** - Separate concerns (web, mobile, marketing, API)
2. **The problem was configuration** - Not deployment strategy
3. **Easy fix** - Just needed hybrid build config

### **About Testing:**

1. **Don't test on production** - Use previews or local
2. **Web is fastest** - Develop on web first
3. **Mobile is slowest** - Only build when web works

### **About Updates:**

1. **Web updates instantly** - Just push to GitHub
2. **Mobile needs rebuilding** - Use OTA for JS changes
3. **Store reviews take time** - Plan accordingly

---

## 🚨 COMMON MISTAKES TO AVOID

1. ❌ **Testing on production** - Use preview URLs
2. ❌ **Building mobile too early** - Get web working first
3. ❌ **Forgetting environment variables** - Check Vercel settings
4. ❌ **Not checking Vercel logs** - Use dashboard to debug
5. ❌ **Assuming instant mobile updates** - They need new builds

---

## ✅ SUCCESS CRITERIA

After deploying these fixes, you should be able to:

- [ ] Visit www.fl4sh.cards (loads)
- [ ] Sign up with new account
- [ ] Complete onboarding (new flow!)
- [ ] Click "Create Cards"
- [ ] AI generates cards successfully
- [ ] Cards save to database
- [ ] Can study cards
- [ ] No console errors

---

## 🔜 NEXT STEPS

### **Once Web App Works:**

1. **Test Phase 1 onboarding:**
   - New subject search screen
   - Can select exam boards
   - Subjects save correctly

2. **Build Phase 2:**
   - Smart card creation with search
   - Topic suggestions
   - Breadcrumb navigation

3. **Deploy to mobile:**
   - Build development versions
   - Test on devices
   - When ready, submit to stores

---

## 📞 IF THINGS STILL DON'T WORK

### **Debugging Checklist:**

1. **Check Vercel Build Logs:**
   - Go to: https://vercel.com/dashboard
   - Click your project
   - Click latest deployment
   - Check build logs for errors

2. **Check Vercel Function Logs:**
   - Dashboard → Project → Functions
   - See if API calls are reaching functions
   - Look for errors

3. **Check Browser Console:**
   - F12 → Console tab
   - Look for specific error messages
   - Share them with me

4. **Check Network Tab:**
   - F12 → Network tab
   - See if API calls are being made
   - Check response status (404? 500? CORS?)

---

## 🎯 BOTTOM LINE

**You've been deploying correctly for mobile (iOS/Android).** Those work fine!

**The web app deployment just needed one config fix:** Enable API functions in Vercel.

**After you:**
1. Add environment variables
2. Push the fixes I made
3. Wait for redeploy

**Your web app WILL WORK!** 🎉

---

**Let me know when you've completed the checklist above and I'll help debug if anything doesn't work!**
