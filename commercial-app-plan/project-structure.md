# Commercial Flashcard App - Project Structure

## Tech Stack
- **Frontend**: React Native (iOS & Android)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **AI Integration**: OpenAI API / Custom AI Service
- **Push Notifications**: OneSignal / Firebase Cloud Messaging
- **State Management**: Redux Toolkit / Zustand
- **UI Framework**: NativeBase / Tamagui (for beautiful, consistent mobile UI)
- **Analytics**: Mixpanel / Amplitude
- **Payments**: RevenueCat (for App Store/Play Store subscriptions)

## Project Structure
```
flashcard-app/
├── apps/
│   ├── mobile/          # React Native app
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   └── utils/
│   │   └── app.json
│   └── web/            # Optional web app
├── packages/
│   ├── shared/         # Shared logic between platforms
│   ├── ui/             # Shared UI components
│   └── types/          # TypeScript types
├── supabase/
│   ├── migrations/
│   ├── functions/      # Edge functions
│   └── seed.sql
└── services/
    ├── ai-generator/   # AI flashcard generation
    └── notifications/  # Push notification service
```

## Key Features to Implement

### 1. **Enhanced Topic Selector**
- Beautiful, searchable UI with exam board logos
- AI-powered topic suggestions based on user's curriculum
- Quick-add popular topics
- Custom topic creation

### 2. **Smart Card Bank**
- Swipeable card interface (Tinder-style for reviewing)
- Advanced filtering and search
- Bulk operations
- Card templates

### 3. **Gamified Study Zone**
- Daily streaks with rewards
- XP system for studying
- Achievements and badges
- Leaderboards (optional)
- Study challenges with friends

### 4. **Leitner Box 2.0**
- Visual progress indicators
- Smart scheduling algorithm
- Push notifications with preview
- "Surprise Review" from Box 5
- Study statistics and insights

### 5. **AI Features**
- Smart card generation with quality control
- Personalized difficulty adjustment
- Study recommendations
- Weak area detection

### 6. **Social Features**
- Share card sets
- Study groups
- Collaborative decks
- Teacher/student modes

### 7. **Premium Features**
- Unlimited AI generation
- Advanced analytics
- Custom themes
- Offline mode
- Priority support 