# 🌐 FLASH Web App Deployment to fl4sh.cards

**Created:** October 27, 2025  
**Goal:** Deploy working web app to fl4sh.cards domain

---

## ✅ **Current Status:**

- ✅ Web export works! (`dist/` folder generated successfully)
- ✅ iOS submitted to TestFlight! 🎉
- ✅ Marketing site live at fl4shcards.com
- ⏸️ Need to deploy web app to fl4sh.cards

---

## 🚀 **Deployment Steps:**

### **Option 1: Deploy via Vercel CLI (Recommended)**

**In PowerShell:**

```powershell
cd "C:\Users\tonyd\OneDrive - 4Sight Education Ltd\Apps\FLASH\dist"
vercel --prod
```

**Vercel will ask:**
1. **Set up and deploy?** → Y
2. **Which scope?** → Your account
3. **Link to existing project?** → N (create new)
4. **Project name?** → `flash-web-app` (or anything you want)
5. **Directory?** → `.` (current)
6. **Override settings?** → N

**Result:**
- Deploys to: `https://flash-web-app-xxx.vercel.app`
- Then we configure custom domain

---

### **Step 2: Configure fl4sh.cards Domain**

**In Vercel Dashboard:**
1. Go to: https://vercel.com/dashboard
2. Find the new `flash-web-app` project
3. Click on it
4. Go to: **Settings** → **Domains**
5. Click **Add**
6. Enter: `fl4sh.cards`
7. Vercel shows DNS configuration

**Typical DNS (Vercel gives you exact values):**
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME  
Name: www
Value: cname.vercel-dns.com
```

---

### **Step 3: Configure DNS in GoDaddy**

1. Go to: https://dcc.godaddy.com/control/portfolio/fl4sh.cards/settings?subtab=dns
2. **DNS Management**
3. **Update existing records:**
   - Find the CNAME for `@` (root)
   - Change it to point to your Vercel deployment
   - Or add A record if needed

**Current setup (from yesterday):**
- `fl4sh.cards` → Redirects to fl4shcards.com (marketing)

**New setup:**
- `fl4sh.cards` → FLASH web app
- `fl4shcards.com` → Marketing site

---

### **Step 4: Wait for DNS (5-10 minutes)**

DNS propagation takes a few minutes. Then:

✅ `https://fl4sh.cards` → FLASH web app!  
✅ `https://fl4shcards.com` → Marketing site!

---

## 🧪 **Testing the Web App:**

**Once deployed, test:**

1. **Sign Up:**
   - Go to fl4sh.cards
   - Create account with email/password
   - Complete onboarding

2. **Create Cards:**
   - Manual flashcards (all 4 types)
   - AI card generation

3. **Study Mode:**
   - Leitner boxes
   - Card progression
   - XP tracking

**Known limitations (expected):**
- ❌ No OAuth (Google/Apple sign-in won't work)
- ❌ No voice recording (native only)
- ❌ No camera (native only)
- ✅ Everything else should work!

---

## 📱 **Current Domain Setup:**

**After deployment:**
- ✅ `fl4shcards.com` → Marketing (Next.js site)
- ✅ `fl4sh.cards` → Web App (Expo web export)
- ✅ `app.fl4shcards.com` → Available for future use

---

## 🎯 **Quick Commands:**

**Build fresh web export:**
```powershell
cd "C:\Users\tonyd\OneDrive - 4Sight Education Ltd\Apps\FLASH"
npx expo export --platform web
```

**Deploy to Vercel:**
```powershell
cd dist
vercel --prod
```

**Update deployment:**
```powershell
cd dist
vercel --prod  # Automatically updates existing deployment
```

---

## ✅ **Success Criteria:**

- [ ] Web app deploys successfully
- [ ] fl4sh.cards resolves to web app
- [ ] Can sign up with email/password
- [ ] Can create flashcards
- [ ] Study mode works
- [ ] Supabase connection works

---

**Ready to deploy? Run the commands above!** 🚀

