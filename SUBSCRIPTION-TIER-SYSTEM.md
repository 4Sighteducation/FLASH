# 🎯 FLASH Subscription Tier System

**Last Updated:** November 2, 2025  
**Status:** Mock Mode (Development) | Production Ready (iOS/Android with IAP)

---

## 📋 **Overview**

FLASH uses a two-tier subscription model:
- **Lite (Free)** - Limited features for trial users
- **Full (Paid)** - Unlimited access to all features

The system supports both **mock mode** (for development/testing) and **production mode** (with real in-app purchases).

---

## 🏗️ **Architecture**

### **Two Context Implementations:**

```
src/contexts/
├── SubscriptionContext.tsx       ← PRODUCTION (Real IAP)
└── SubscriptionContext.mock.tsx  ← DEVELOPMENT (Mock/Testing)
```

**Why Two Files?**
1. **SubscriptionContext.tsx** - Full implementation with Expo In-App Purchases
2. **SubscriptionContext.mock.tsx** - Simplified version for testing without IAP setup

---

## 🔑 **Key Differences**

### **SubscriptionContext.tsx (Production)**
```typescript
// Features:
- ✅ Real Expo In-App Purchases integration
- ✅ Queries Supabase for subscription status
- ✅ Handles purchase flows
- ✅ Restores previous purchases
- ✅ Syncs with app store receipts
- ✅ Checks user_subscriptions table

// Use Cases:
- Production builds (iOS/Android)
- Testing with real app store sandbox
- When IAP is configured
```

### **SubscriptionContext.mock.tsx (Development)**
```typescript
// Features:
- ✅ Simulates subscription tiers
- ✅ No Supabase queries
- ✅ No IAP dependencies
- ✅ Easy to test limits
- ✅ Fast development iteration

// Use Cases:
- Local development
- Expo Go testing
- Web builds (no IAP support)
- Quick prototyping
```

---

## 📊 **Subscription Tiers**

### **Lite (Free)**
```typescript
{
  maxSubjects: 1,
  maxTopicsPerSubject: 1,
  maxCards: 10,
  canUseAI: false,
  canExportCards: false,
  canUseVoiceAnswers: false
}
```

**Perfect for:**
- Trial users
- Students testing the app
- Single subject study

### **Full (Paid)**
```typescript
{
  maxSubjects: Infinity,
  maxTopicsPerSubject: Infinity,
  maxCards: Infinity,
  canUseAI: true,
  canExportCards: true,
  canUseVoiceAnswers: true
}
```

**Includes:**
- Unlimited subjects and topics
- Unlimited flashcards
- AI card generation
- Voice answer feedback
- Export functionality
- Priority support

---

## 🔌 **How It Works**

### **1. App Initialization**

**App.tsx:**
```typescript
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
// OR
import { SubscriptionProvider } from './src/contexts/SubscriptionContext.mock';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SubscriptionProvider>
          <AppContent />
        </SubscriptionProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
```

**⚠️ CRITICAL:** Only import ONE context at a time! Using both will cause provider mismatch errors.

---

### **2. Using in Components**

```typescript
import { useSubscription } from '../../contexts/SubscriptionContext';

function MyComponent() {
  const { tier, limits, checkLimits, purchaseFullVersion } = useSubscription();
  
  // Check if user can add more subjects
  if (!checkLimits('subject', currentSubjectCount + 1)) {
    Alert.alert(
      'Upgrade Required',
      'The free version is limited to 1 subject. Upgrade to FLASH Full!',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Upgrade', onPress: purchaseFullVersion }
      ]
    );
    return;
  }
  
  // Proceed with action
}
```

---

### **3. Database Integration (Production Only)**

**Supabase Table: `user_subscriptions`**

```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tier TEXT NOT NULL DEFAULT 'lite',
  expires_at TIMESTAMP WITH TIME ZONE,
  store_product_id TEXT,
  store_transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
const { data } = await supabase
  .from('user_subscriptions')
  .select('tier, expires_at')
  .eq('user_id', user.id)
  .single();
```

---

## 🎮 **Development vs Production**

### **Development (Mock Mode)**

**Best for:**
- Expo Go testing
- Web development
- Local dev server
- Quick iteration

**Setup:**
```typescript
// App.tsx
import { SubscriptionProvider } from './src/contexts/SubscriptionContext.mock';

// Components
import { useSubscription } from '../../contexts/SubscriptionContext.mock';
```

**How to Test Tiers:**
```typescript
// In SubscriptionContext.mock.tsx
const [tier, setTier] = useState<SubscriptionTier>('lite'); // or 'full'

// Manually toggle for testing
setTier('full'); // Test full features
setTier('lite'); // Test limitations
```

---

### **Production (Real IAP)**

**Best for:**
- App Store builds
- Google Play builds
- Production releases
- Real purchases

**Setup:**
```typescript
// App.tsx
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';

// Components
import { useSubscription } from '../../contexts/SubscriptionContext';
```

**Requires:**
1. ✅ App Store Connect setup
2. ✅ Google Play Console setup
3. ✅ In-App Purchase products created
4. ✅ Supabase `user_subscriptions` table
5. ✅ Custom dev client build (not Expo Go)

---

## 🛠️ **Implementation Guide**

### **Switch to Production Mode:**

**Step 1: Update App.tsx**
```typescript
// BEFORE (Development)
import { SubscriptionProvider } from './src/contexts/SubscriptionContext.mock';

// AFTER (Production)
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
```

**Step 2: Update All Components**

Find and replace across codebase:
```bash
# Find files using mock context
grep -r "SubscriptionContext.mock" src/

# Replace with production context
# Change:  import { useSubscription } from '../../contexts/SubscriptionContext.mock';
# To:      import { useSubscription } from '../../contexts/SubscriptionContext';
```

**Step 3: Configure IAP Products**

**iOS (App Store Connect):**
- Product ID: `com.foursighteducation.flash.full`
- Type: Auto-renewable Subscription
- Price: £2.99/month (or chosen price)

**Android (Google Play Console):**
- Product ID: `com.foursighteducation.flash.full`
- Type: Subscription
- Price: £2.99/month (or chosen price)

**Step 4: Build Custom Client**
```bash
# IAP doesn't work in Expo Go
eas build --platform ios --profile production
eas build --platform android --profile production
```

---

## 📁 **Key Files**

### **Core Context Files:**
```
src/contexts/
├── SubscriptionContext.tsx       ← Production (IAP enabled)
├── SubscriptionContext.mock.tsx  ← Development (Mock)
└── AuthContext.tsx               ← User authentication
```

### **Components Using Subscriptions:**
```
src/screens/onboarding/
└── SubjectSelectionScreen.tsx    ← Checks subject limits

src/screens/topics/
└── TopicHubScreen.tsx            ← Checks topic limits

src/screens/cards/
├── AIGeneratorScreen.tsx         ← Requires full tier
└── CreateCardScreen.tsx          ← Checks card limits

src/screens/main/
└── ProfileScreen.tsx             ← Shows tier & upgrade
```

### **Database:**
```
supabase/migrations/
└── create_user_subscriptions.sql ← Table schema
```

---

## ⚠️ **Common Issues & Solutions**

### **Error: "useSubscription must be used within a SubscriptionProvider"**

**Cause:** Mismatched context imports

**Solution:**
```typescript
// Make sure App.tsx and components use SAME context!

// App.tsx uses:
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';

// Components MUST use:
import { useSubscription } from '../../contexts/SubscriptionContext';

// NOT the mock version!
```

---

### **Web Build Doesn't Work**

**Issue:** IAP context queries Supabase table that might not exist

**Solution:** Use mock context for web builds
```typescript
// For web exports, use mock context
import { SubscriptionProvider } from './src/contexts/SubscriptionContext.mock';
```

---

### **Subscription Not Syncing**

**Check:**
1. User is authenticated
2. `user_subscriptions` table exists
3. Row exists for user
4. `tier` field is 'lite' or 'full'
5. Network connectivity

---

## 🧪 **Testing Guide**

### **Test Lite Tier Limits:**

```typescript
// 1. Set mock to 'lite'
const [tier, setTier] = useState<SubscriptionTier>('lite');

// 2. Try adding 2+ subjects → Should block
// 3. Try AI generation → Should block
// 4. Try creating 11+ cards → Should block
```

### **Test Full Tier:**

```typescript
// 1. Set mock to 'full'
const [tier, setTier] = useState<SubscriptionTier>('full');

// 2. Add unlimited subjects → Should work
// 3. Use AI generation → Should work
// 4. Create unlimited cards → Should work
```

### **Test Production IAP:**

1. Build with real context
2. Use App Store/Play Store sandbox
3. Make test purchase
4. Verify Supabase row created
5. Check features unlock

---

## 💰 **Pricing Strategy**

**Current Plan:**
- **Lite:** FREE forever
- **Full:** £2.99/month or £19.99/year

**Future Options:**
- Student discount
- Bulk licenses for schools
- Lifetime purchase option

---

## 🚀 **Migration Checklist**

**When ready to enable real IAP:**

- [ ] Create IAP products in App Store Connect
- [ ] Create IAP products in Google Play Console
- [ ] Update App.tsx to use production context
- [ ] Update all components to use production context
- [ ] Create `user_subscriptions` table in Supabase
- [ ] Test sandbox purchases (iOS)
- [ ] Test sandbox purchases (Android)
- [ ] Verify Supabase sync
- [ ] Test restore purchases flow
- [ ] Submit for app store review
- [ ] Launch! 🎉

---

## 📚 **Additional Resources**

**Expo In-App Purchases:**
- https://docs.expo.dev/versions/latest/sdk/in-app-purchases/

**App Store Connect:**
- https://developer.apple.com/app-store-connect/

**Google Play Console:**
- https://play.google.com/console

**Supabase Auth:**
- https://supabase.com/docs/guides/auth

---

## 🆘 **Support**

**Questions?**
- Check `/docs/IN-APP-PURCHASES-BUILD-GUIDE.md`
- Review Expo documentation
- Test in sandbox mode first

**Common Commands:**
```bash
# Build with IAP
eas build --platform ios --profile production

# Check build status
eas build:list

# Test locally (mock mode)
expo start
```

---

**Remember:** Always use mock context for development and web builds. Switch to production context only when ready for real purchases on native builds! 🎯

