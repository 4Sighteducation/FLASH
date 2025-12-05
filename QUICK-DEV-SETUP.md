# Quick Development Setup Guide
**For Testing the New Onboarding Wizard**

---

## 🚨 **The Issue**

The new search wizard needs:
1. **Frontend** (React Native/Expo) - Shows the UI
2. **Backend API** (Vercel functions) - Handles OpenAI calls securely

Currently, you're running the frontend but **not the backend API**, so search gets 401 errors.

---

## ✅ **Solution: Run Both Frontend + Backend**

### **Terminal 1: Start Expo (Frontend)**

```bash
cd "C:\Users\tonyd\OneDrive - 4Sight Education Ltd\Apps\FLASH"
npx expo start --web
```

This starts the React app on `http://localhost:19006`

### **Terminal 2: Start Vercel (Backend API)**

```bash
cd "C:\Users\tonyd\OneDrive - 4Sight Education Ltd\Apps\FLASH"
vercel dev
```

This starts your API functions on `http://localhost:3000`

**When prompted:**
- "Set up and develop"? → Yes
- "Which scope"? → Choose your Vercel account
- "Link to existing project"? → Yes
- "What's your project's name"? → flash or your Vercel project name

---

## 🔑 **Environment Variables**

Make sure you have a `.env` file in the FLASH folder with:

```env
EXPO_PUBLIC_SUPABASE_URL=https://qkapwhyxcpgzahuemucg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
OPENAI_API_KEY=sk-your-key-here
```

Vercel will pick these up automatically.

---

## 🌐 **Alternative: Deploy to Vercel**

If you don't want to run locally:

```bash
cd "C:\Users\tonyd\OneDrive - 4Sight Education Ltd\Apps\FLASH"
vercel --prod
```

Then test at your Vercel URL (e.g., `https://flash.vercel.app`)

---

## 🧪 **Testing the Wizard**

Once both servers are running:

1. **Open:** `http://localhost:19006` (Expo web)
2. **Create new account:** `test@example.com`
3. **Go through onboarding:**
   - Welcome screens
   - Select GCSE
   - Select Edexcel
   - Select Biology
4. **🆕 First Topic Wizard appears!**
5. **Type:** "photosynthesis"
6. **Should work!** ✅

---

## ⚠️ **If Vercel Dev Doesn't Work**

You might need to install Vercel CLI:

```bash
npm install -g vercel
```

Then try again:

```bash
vercel dev
```

---

## 🎯 **Quick Check**

Your API is working when you can visit:
- `http://localhost:3000/api/search-topics` 
- Should show: "Method not allowed" (because it needs POST)

---

**Let me know if you need help setting up Vercel dev!** 🚀

