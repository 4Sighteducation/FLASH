# User Tiers System - Implementation Handover

## Overview
This document outlines the implementation of a Lite (Free) vs Full (Paid) tier system for the FLASH app. The system allows users to try the app with limited features before purchasing the full version through in-app purchases.

## Current Status: ~30% Complete

### ✅ Completed
1. **Infrastructure Setup**
   - Created `SubscriptionContext` to manage user tiers
   - Integrated `expo-in-app-purchases` for payment processing
   - Created database schema for subscriptions
   - Added subscription UI to Profile screen

2. **Basic Enforcement**
   - Subject selection limits (SubjectSelectionScreen)
   - Card creation limits (CreateCardScreen)

### ❌ Not Yet Implemented
1. Topic limits enforcement
2. AI features blocking for lite users
3. Voice answer blocking for lite users
4. Server-side receipt validation
5. Proper testing of purchase flow

## Tier Specifications

### Lite (Free) Tier
- ✅ 1 Subject maximum
- ✅ 1 Topic per subject
- ✅ 10 Cards total
- ❌ No AI card generation
- ❌ No voice answers
- ❌ No card export

### Full (Paid) Tier
- ✅ Unlimited subjects
- ✅ Unlimited topics
- ✅ Unlimited cards
- ✅ AI card generation
- ✅ Voice answers
- ✅ Card export

## Key Files

### Core Implementation Files
1. **`src/contexts/SubscriptionContext.tsx`**
   - Main subscription management
   - In-app purchase integration
   - Tier checking logic
   - Product IDs: iOS: `com.foursighteducation.flash.full`, Android: `flash_full_version`

2. **`src/screens/main/ProfileScreen.tsx`**
   - Subscription status display
   - Upgrade button
   - Restore purchases button

3. **`supabase/create-subscriptions-table.sql`**
   - Database schema for tracking subscriptions
   - `user_subscriptions` table
   - `check_user_limits()` function

### Files With Partial Implementation
1. **`src/screens/onboarding/SubjectSelectionScreen.tsx`**
   - ✅ Subject limit enforcement added
   - Shows upgrade prompt when limit reached

2. **`src/screens/cards/CreateCardScreen.tsx`**
   - ✅ Card limit enforcement added
   - Checks total card count before creation

### Files Needing Implementation
1. **`src/screens/onboarding/TopicCurationScreen.tsx`**
   - Need to add topic limit enforcement (1 topic for lite users)

2. **`src/screens/cards/AIGeneratorScreen.tsx`**
   - Need to block AI features for lite users
   - Show upgrade prompt instead

3. **`src/components/VoiceAnswerModal.tsx`**
   - Need to block voice features for lite users
   - Show upgrade prompt

4. **`src/screens/cards/ImageCardGeneratorScreen.tsx`**
   - Need to block image-to-card features for lite users

## Implementation Pattern

When adding limits to a screen:

```typescript
// 1. Import the subscription context
import { useSubscription } from '../../contexts/SubscriptionContext';

// 2. Get tier and checkLimits function
const { tier, checkLimits } = useSubscription();

// 3. Before allowing action, check limits
if (tier === 'lite') {
  // Get current count from database
  const { data } = await supabase
    .from('relevant_table')
    .select('id')
    .eq('user_id', user?.id);
  
  const currentCount = data?.length || 0;
  
  if (!checkLimits('type', currentCount + 1)) {
    Alert.alert(
      'Upgrade Required',
      'Message about limit...',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => navigation.navigate('Profile') }
      ]
    );
    return;
  }
}
```

## Roadmap Forward

### Phase 1: Complete Basic Enforcement (Priority)
1. **Topic Limits** (TopicCurationScreen)
   - Add check when selecting topics
   - Limit to 1 topic total for lite users

2. **AI Features Block** (AIGeneratorScreen)
   - Check tier before allowing AI generation
   - Show "Upgrade to use AI" message

3. **Voice Features Block** (VoiceAnswerModal)
   - Check tier before recording
   - Show upgrade prompt

### Phase 2: Purchase Flow Testing
1. **Test Purchase Flow**
   - Create test products in app stores
   - Test with sandbox accounts
   - Verify tier upgrades correctly

2. **Handle Edge Cases**
   - Network failures
   - Purchase cancellations
   - Restore purchases

### Phase 3: Server-Side Validation
1. **Create API Endpoints**
   - Receipt validation endpoint
   - Subscription status endpoint

2. **Implement Receipt Validation**
   - Validate with Apple/Google servers
   - Store validated purchases
   - Handle subscription expiry

### Phase 4: Enhanced Features
1. **Subscription Analytics**
   - Track conversion rates
   - Monitor upgrade points
   - A/B test pricing

2. **Trial Period** (Optional)
   - 7-day full access trial
   - Automatic conversion to lite

## Testing Checklist

### Before Release
- [ ] Test purchase flow on iOS
- [ ] Test purchase flow on Android
- [ ] Test restore purchases
- [ ] Test all limit enforcements
- [ ] Test upgrade prompts
- [ ] Test offline behavior
- [ ] Test receipt validation

### App Store Setup
- [ ] Create products in App Store Connect
- [ ] Create products in Google Play Console
- [ ] Add required screenshots
- [ ] Write product descriptions
- [ ] Set pricing tiers

## Important Notes

1. **Current Implementation is Client-Side Only**
   - Purchases stored locally
   - No server validation
   - Vulnerable to tampering
   - OK for MVP, but need server validation for production

2. **Database Migration Required**
   - Run `create-subscriptions-table.sql` before deployment
   - Ensure all users start as 'lite' tier

3. **Pricing Strategy**
   - Currently set up as one-time purchase
   - Could convert to subscription model
   - Recommended price: $4.99-$9.99

4. **App Store Compliance**
   - Must provide restore functionality ✅
   - Must clearly show what's included ✅
   - Cannot require purchase for basic use ✅

## Code Snippets for Future Implementation

### Block AI Features (AIGeneratorScreen)
```typescript
const { tier } = useSubscription();

if (tier === 'lite') {
  return (
    <View style={styles.upgradeContainer}>
      <Ionicons name="lock" size={48} color="#666" />
      <Text style={styles.upgradeTitle}>AI Generation is a Premium Feature</Text>
      <Text style={styles.upgradeText}>
        Upgrade to FLASH Full to generate cards using AI
      </Text>
      <TouchableOpacity 
        style={styles.upgradeButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Topic Limit (TopicCurationScreen)
```typescript
const handleTopicToggle = async (topicId: string) => {
  if (tier === 'lite' && !selectedTopics.includes(topicId)) {
    const { data } = await supabase
      .from('topic_study_preferences')
      .select('id')
      .eq('user_id', user?.id)
      .eq('in_study_bank', true);
    
    if (data && data.length >= 1) {
      Alert.alert(
        'Upgrade Required',
        'Free version is limited to 1 topic. Upgrade for unlimited topics!',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Profile') }
        ]
      );
      return;
    }
  }
  // Continue with normal toggle logic
};
```

## Contact for Questions
This implementation was started on [current date]. For questions about the implementation approach or design decisions, refer to the git history and commit messages. 