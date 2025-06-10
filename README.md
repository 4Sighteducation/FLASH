# FLASH - AI-Powered Flashcard Learning App

A modern, gamified flashcard learning application built with React Native and Supabase, featuring AI-generated content and spaced repetition learning.

## 🚀 Features

- **Exam Board Specific Content**: Tailored curriculum for UK exam boards (AQA, Edexcel, OCR, WJEC, etc.)
- **AI-Generated Flashcards**: Smart card generation based on curriculum topics
- **Spaced Repetition**: Leitner box system with 5 review intervals
- **Gamification**: XP, levels, streaks, and achievements
- **Offline Support**: Study anywhere, sync when connected
- **Social Features**: Study groups and leaderboards
- **Push Notifications**: Smart study reminders

## 🛠️ Tech Stack

- **Frontend**: React Native (Expo)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Language**: TypeScript
- **Deployment**: Vercel (Web), App Store & Google Play (Mobile)

## 📱 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/4Sighteducation/FLASH.git
cd FLASH
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

4. Start the development server:
```bash
npm start
```

## 🗂️ Project Structure

```
FLASH/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # App screens
│   ├── navigation/     # Navigation configuration
│   ├── services/       # API and external services
│   ├── utils/          # Helper functions
│   └── types/          # TypeScript type definitions
├── assets/             # Images, fonts, etc.
├── app.json           # Expo configuration
└── package.json       # Dependencies
```

## 🔑 Environment Variables

Create a `.env` file with:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📊 Database Schema

- **users**: User profiles with gamification data
- **exam_boards**: UK exam board reference data
- **subjects**: Subject hierarchy
- **topics**: Curriculum topics (16,000+ records)
- **flashcards**: User-generated and AI cards
- **study_sessions**: Learning progress tracking

## 🚀 Deployment

### Web (Vercel)
```bash
vercel --prod
```

### Mobile
- iOS: `eas build --platform ios`
- Android: `eas build --platform android`

## 💰 Pricing Tiers

- **Free**: Basic features with limits
- **Premium** ($4.99/month): Unlimited cards, offline mode
- **Pro** ($9.99/month): AI generation, analytics, priority support

## 📄 License

Copyright © 2024 4Sight Education Ltd. All rights reserved.

## 🤝 Contributing

This is a commercial project. Please contact the team for contribution guidelines.

## 📧 Contact

For support or inquiries: support@4sighteducation.com
