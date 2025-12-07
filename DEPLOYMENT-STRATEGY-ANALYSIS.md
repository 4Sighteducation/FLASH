# FLASH Deployment Strategy Analysis & Recommendations
**Date:** December 6, 2025  
**Status:** 🔴 NEEDS FIXING  
**Priority:** CRITICAL before continuing development

---

## 🚨 Current Problems Identified

### **1. Web App is Broken (www.fl4sh.cards)**
**Error:** `Failed to fetch` when calling API endpoints

**Root Cause:**
- Web app calls: `https://flash-gules.vercel.app/api/generate-cards`
- This endpoint either doesn't exist or isn't properly deployed
- Static Expo web build can't include serverless API functions

### **2. Multiple Vercel Deployments (Confusing)**
Found references to:
- `www.fl4sh.cards` (main web app)
- `flash-gules.vercel.app` (API functions?)
- `flash-mw9kep9bm-tony-dennis-projects.vercel.app` (search API?)

**Problem:** Unclear which is which and what's deployed where

### **3. Icons Not Loading**
**Error:** `Ionicons.ttf` 404
- Font files not included in web build
- Expo web build configuration issue

---

## 🏗️ Your Current Architecture

### **What You Have:**

```
FLASH Project Structure:
├── /src (React Native app code)
│   ├── /screens
│   ├── /services (aiService.ts → calls API)
│   └── /components
├── /api (Serverless functions)
│   ├── generate-cards.js ✅
│   ├── search-topics.js ✅
│   ├── analyze-answer.js ✅
│   └── transcribe-audio.js ✅
├── package.json (Expo dependencies)
└── vercel.json (Static build config)
```

### **Deployment Platforms:**

1. **iOS:** Expo EAS Build → App Store
2. **Android:** Expo EAS Build → Google Play
3. **Web:** Vercel → www.fl4sh.cards (STATIC)
4. **API Functions:** ??? Should be deployed separately

---

## ❌ What's Wrong (The Issues)

### **Problem 1: Static vs Serverless Confusion**

Your `vercel.json` configures a STATIC build:
```json
{
  "builds": [{
    "src": "package.json",
    "use": "@vercel/static-build"  ← Static, no API routes!
  }],
  "buildCommand": "npx expo export --platform web"
}
```

**This means:**
- Web app is deployed as static HTML/JS/CSS
- **API functions in `/api` are NOT deployed**
- Calling `fetch('/api/generate-cards')` = 404

### **Problem 2: API Functions Have No Deployment**

The `/api` folder exists with functions, but:
- Not deployed with main app (static build)
- Should be separate Vercel project OR
- Main app needs to be hybrid (static + functions)

### **Problem 3: Hardcoded API URLs**

`aiService.ts` line 71:
```typescript
this.apiUrl = 'https://flash-gules.vercel.app/api/generate-cards';
```

**Questions:**
- Is `flash-gules.vercel.app` deployed?
- Does it have the API functions?
- Is it up to date?

---

## ✅ RECOMMENDED SOLUTION

### **Option A: Separate API Deployment** ⭐ (Recommended)

**Why:** Clean separation, easier to manage

**Setup:**
```
1. FLASH Main App (www.fl4sh.cards)
   - Expo web build (static)
   - iOS/Android via EAS
   - Calls external API

2. FLASH API (api.fl4sh.cards or flash-api.vercel.app)
   - Separate Vercel project
   - Only contains /api folder
   - Serverless functions
```

**Implementation:**
1. Create new folder: `FLASH-api` (separate repo)
2. Move `/api` folder into it
3. Add proper `package.json` with dependencies
4. Create `vercel.json` for API functions
5. Deploy to Vercel
6. Update `aiService.ts` to point to new API URL

---

### **Option B: Hybrid Deployment**

**Why:** Single project, but more complex

**Setup:**
```
FLASH Project (www.fl4sh.cards)
   - Static web app at root
   - API functions at /api
   - Both deployed together
```

**Implementation:**
1. Update `vercel.json` to support BOTH static + functions
2. Ensure API dependencies in root `package.json`
3. Configure routes properly
4. Redeploy

**Updated vercel.json:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    },
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.+)", "dest": "/$1" },
    { "src": "/", "dest": "/index.html" }
  ]
}
```

---

### **Option C: Direct Supabase (No API)** 🚀 (Simplest)

**Why:** Eliminate API middleman entirely

**What Changes:**
- AI generation calls OpenAI directly from React Native
- Use Supabase Edge Functions for sensitive operations
- No Vercel API needed

**Pros:**
- ✅ Simpler architecture
- ✅ Fewer moving parts
- ✅ Works on iOS/Android/Web identically
- ✅ No API deployment needed

**Cons:**
- ❌ OpenAI API key exposed to client (need proxy)
- ❌ May need Supabase Edge Functions for security

---

## 🎯 MY RECOMMENDATION: Option B + Supabase Edge Functions

### **Short Term (This Week):**
1. Fix the current Vercel deployment (Option B)
2. Get web app working with API functions
3. Test on web first (fastest iteration)

### **Long Term (Next Month):**
1. Move sensitive operations to Supabase Edge Functions
2. Keep simple API routes on Vercel
3. Consider Option A for cleaner separation

---

## 📋 IMMEDIATE FIX (Option B Implementation)

### **Step 1: Fix vercel.json** (5 minutes)

Replace your current `vercel.json` with:

```json
{
  "version": 2,
  "name": "flash-web-app",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    },
    {
      "src": "/",
      "dest": "/index.html"
    }
  ],
  "env": {
    "OPENAI_API_KEY": "@openai-api-key"
  }
}
```

### **Step 2: Ensure API Dependencies** (2 minutes)

Check your root `package.json` has:
```json
{
  "dependencies": {
    "openai": "^5.3.0"  ✅ Already have this
  }
}
```

### **Step 3: Fix API URLs in App** (10 minutes)

Update `src/services/aiService.ts`:
```typescript
// Line 71 - Change from:
this.apiUrl = 'https://flash-gules.vercel.app/api/generate-cards';

// To:
this.apiUrl = 'https://www.fl4sh.cards/api/generate-cards';
```

### **Step 4: Redeploy** (5 minutes)
```bash
cd FLASH
vercel --prod
```

---

## 🧪 PROPER TESTING WORKFLOW

### **Current Problem:**
You're testing on production (www.fl4sh.cards) which breaks for real users!

### **Recommended Workflow:**

#### **For Web Testing:**
```bash
# 1. Local development
cd FLASH
npm start  # or expo start --web
# Test at: http://localhost:8081
# Uses local Expo Metro bundler
# Hot reload works

# 2. Deploy to Vercel Preview
git push
# Vercel automatically creates preview deployment
# Test at: flash-abc123.vercel.app
# Doesn't affect production

# 3. Deploy to Production (when ready)
vercel --prod
# Updates www.fl4sh.cards
```

#### **For iOS/Android Testing:**
```bash
# Development build (internal testing)
npm run build:ios:dev
npm run build:android:dev
# Install on your device
# Full native features work

# Production build (for stores)
npm run build:ios
npm run build:android
# Submit to App Store / Google Play
```

---

## 🔑 Environment Variables Setup

### **Vercel Environment Variables Needed:**

Go to Vercel Dashboard → Project Settings → Environment Variables

Add these:
| Key | Value | Scope |
|-----|-------|-------|
| `OPENAI_API_KEY` | `sk-...` | Production + Preview |
| `SUPABASE_URL` | Your Supabase URL | All |
| `SUPABASE_ANON_KEY` | Your anon key | All |

---

## 📱 iOS/Android Auto-Update Question

### **Do code changes auto-update mobile apps?**

**NO** for native apps! You need to rebuild and resubmit.

**Workflow:**
```
1. Make code changes
2. Test locally
3. Build new version: eas build
4. Submit to stores: eas submit
5. Wait for review (1-7 days)
6. Users get update
```

**Exception:** Expo Updates (OTA)
- Can push JavaScript updates without store review
- Doesn't work for native code changes
- Need to configure in app.json

---

## 🎯 CRITICAL DEPLOYMENT ISSUES TO FIX

### **Issue 1: API Routes Not Deployed**
**Current:** Static build only
**Fix:** Update `vercel.json` to include API functions (Option B above)

### **Issue 2: Wrong API URL**
**Current:** Points to `flash-gules.vercel.app`
**Fix:** Should point to `www.fl4sh.cards/api/` or dedicated API domain

### **Issue 3: No Testing Environment**
**Current:** Testing directly on production
**Fix:** Use Vercel preview deployments

### **Issue 4: Missing Font Files**
**Current:** Ionicons.ttf not loading on web
**Fix:** Configure Expo web to include font assets

---

## ✅ ACTION PLAN (Priority Order)

### **TODAY (Critical - 1 hour):**

1. **Fix vercel.json** (I'll do this)
2. **Fix API URL in aiService.ts** (I'll do this)
3. **Add Vercel environment variables** (You do this)
4. **Redeploy to Vercel**
5. **Test web app** - Should work now

### **THIS WEEK (Important - 2-3 hours):**

1. **Set up proper testing workflow**
   - Use preview deployments
   - Don't test on production
   
2. **Fix Expo web font loading**
   - Configure proper asset loading
   
3. **Test iOS/Android builds**
   - Build dev version
   - Install on test device
   - Verify APIs work

### **NEXT WEEK (Nice to Have):**

1. **Consider Supabase Edge Functions**
   - Move API logic to Supabase
   - Eliminate Vercel API dependency
   
2. **Set up proper CI/CD**
   - Auto-deploy preview on PR
   - Auto-build on main branch

---

## 🛠️ Let Me Fix This NOW

Shall I:
1. ✅ Update `vercel.json` to support API functions
2. ✅ Update `aiService.ts` to use correct URL
3. ✅ Create deployment guide
4. ✅ Document proper testing workflow

Then you can:
1. Add environment variables to Vercel
2. Redeploy
3. Test the fixed web app

**Ready to fix this?** Say yes and I'll proceed! 🚀
