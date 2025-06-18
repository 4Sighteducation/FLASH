# FLASH Lite Version & In-App Purchase Setup Guide

## Overview

This guide explains how to set up the Lite (Free) version of FLASH with in-app purchases to upgrade to the Full version.

## Lite Version Limitations

The Lite version includes:
- ✅ 1 Subject
- ✅ 1 Topic
- ✅ Maximum 10 Cards
- ❌ No AI card generation
- ❌ No voice answers
- ❌ No card export

## In-App Purchase Setup

### 1. Google Play Console Setup

1. **Create In-App Product**:
   - Go to your app in Play Console
   - Navigate to `Monetize > In-app products`
   - Click `Create product`
   - Product ID: `flash_full_version`
   - Product type: `One-time purchase`
   - Price: Set your desired price
   - Title: "FLASH Full Version"
   - Description: "Unlock unlimited subjects, topics, and cards with AI features"

2. **Complete Product Details**:
   - Add translations if needed
   - Set pricing for all countries
   - Save and activate the product

### 2. Apple App Store Connect Setup

1. **Create In-App Purchase**:
   - Go to your app in App Store Connect
   - Navigate to `Features > In-App Purchases`
   - Click the `+` button
   - Type: `Non-Consumable`
   - Reference Name: "FLASH Full Version"
   - Product ID: `com.foursighteducation.flash.full`

2. **Configure Purchase**:
   - Add display name and description
   - Set pricing tier
   - Add screenshots for review
   - Submit for review with your app

### 3. Testing In-App Purchases

#### Google Play Testing:
1. Add test accounts in Play Console
2. Join internal testing track
3. Install app from Play Store (test track)
4. Test purchases won't charge real money

#### Apple Testing:
1. Create Sandbox tester accounts in App Store Connect
2. Sign out of real Apple ID on device
3. Sign in with Sandbox account when prompted during purchase
4. Sandbox purchases are free

### 4. Database Setup

Run the subscription table creation SQL:

```bash
# In Supabase SQL editor
-- Run the contents of supabase/create-subscriptions-table.sql
```

### 5. Environment Configuration

No additional environment variables needed - the product IDs are hardcoded in the `SubscriptionContext.tsx` file.

## Implementation Details

### Key Files:
- `src/contexts/SubscriptionContext.tsx` - Manages subscription state and IAP
- `src/contexts/ThemeContext.tsx` - Handles theme switching (including Cyber mode)
- `src/screens/main/ProfileScreen.tsx` - Shows subscription status and upgrade options

### Enforcing Limits:

The app enforces limits in several places:

1. **Subject Selection** (`SubjectSelectionScreen.tsx`):
   ```typescript
   if (!subscription.checkLimits('subject', selectedSubjects.length + 1)) {
     Alert.alert('Upgrade Required', 'Free version limited to 1 subject');
     return;
   }
   ```

2. **Topic Selection** (`TopicCurationScreen.tsx`):
   ```typescript
   if (!subscription.checkLimits('topic', selectedTopics.length + 1)) {
     Alert.alert('Upgrade Required', 'Free version limited to 1 topic');
     return;
   }
   ```

3. **Card Creation** (`CreateCardScreen.tsx`):
   ```typescript
   if (!subscription.checkLimits('card', totalCards + 1)) {
     Alert.alert('Upgrade Required', 'Free version limited to 10 cards');
     return;
   }
   ```

## Revenue Verification

### Server-Side Verification (Recommended):

1. Create an API endpoint to verify purchases
2. Validate receipt with Apple/Google servers
3. Update user's subscription in database
4. Return success/failure to app

### Basic Client-Side (Current Implementation):

The current implementation stores purchase info client-side. For production:
1. Implement server verification
2. Add receipt validation
3. Handle subscription expiry
4. Implement restore purchases properly

## Pricing Strategy

Consider these pricing models:
- **One-time purchase**: $4.99 - $9.99 (current implementation)
- **Monthly subscription**: $1.99 - $2.99/month
- **Annual subscription**: $19.99/year (best value)

## Marketing the Upgrade

Show upgrade prompts when users hit limits:
- "You've reached the 10 card limit! Upgrade for unlimited cards"
- "Want to add more subjects? Upgrade to Full version"
- "Unlock AI-powered card generation with Full version"

## Important Notes

1. **App Store Guidelines**: 
   - Must provide restore purchase functionality ✅
   - Must clearly show what's included in purchase ✅
   - Cannot require purchase for basic functionality ✅

2. **Testing**: Always test the full purchase flow before release

3. **Support**: Be prepared to handle purchase-related support issues

## Next Steps

1. Create products in both stores
2. Test purchase flow thoroughly
3. Consider adding subscription options
4. Implement server-side receipt validation
5. Add analytics to track conversion rates 