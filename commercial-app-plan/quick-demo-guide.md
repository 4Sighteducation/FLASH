# 🚀 Quick Demo Development Guide

## Fast Track to Working Demo (2-3 weeks)

### Week 1: Core Setup & Basic Features

#### Day 1-2: Project Initialization
```bash
# Create Expo React Native app (faster than bare React Native)
npx create-expo-app flashcard-demo --template
cd flashcard-demo

# Install core dependencies
npm install @supabase/supabase-js zustand react-native-gesture-handler
npm install react-native-reanimated react-native-safe-area-context
npm install @react-navigation/native @react-navigation/stack
```

#### Day 3-4: Supabase Setup
1. Create Supabase project at https://supabase.com
2. Run simplified schema:
```sql
-- Minimal schema for demo
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT,
    username TEXT,
    xp_total INTEGER DEFAULT 0,
    streak_current INTEGER DEFAULT 0
);

CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    box_number INTEGER DEFAULT 1,
    next_review_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Users can manage own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own cards" ON flashcards
    FOR ALL USING (auth.uid() = user_id);
```

#### Day 5-7: Core Features
- Authentication screen
- Basic card creation
- Swipeable study interface
- Simple box progression

### Week 2: Polish & Deploy

#### Day 8-10: Essential Features
- Basic gamification (XP only)
- Simple AI card generation
- Offline support
- Push notifications setup

#### Day 11-14: Testing & Deployment
- Fix critical bugs
- Deploy web preview
- Create demo video
- Prepare for app stores

## 🌐 Deployment Options for Supabase

### 1. **Vercel** (Recommended for Web Demo)
```json
// vercel.json
{
  "buildCommand": "expo export:web",
  "outputDirectory": "web-build",
  "framework": "expo"
}
```

**Pros:**
- Zero-config deployment
- Excellent Supabase integration
- Free tier generous
- Preview deployments
- Edge functions support

**Setup:**
```bash
npm i -g vercel
vercel --prod
```

### 2. **Netlify**
```toml
# netlify.toml
[build]
  command = "expo export:web"
  publish = "web-build"

[build.environment]
  REACT_APP_SUPABASE_URL = "your-url"
  REACT_APP_SUPABASE_ANON_KEY = "your-key"
```

**Pros:**
- Great for static sites
- Form handling
- Split testing
- Good free tier

### 3. **Railway** (Heroku Alternative)
```yaml
# railway.yaml
services:
  web:
    build:
      dockerfile: Dockerfile
    env:
      PORT: ${{PORT}}
      NODE_ENV: production
```

**Pros:**
- Heroku-like experience
- Better pricing
- Automatic SSL
- Database hosting too

### 4. **Render**
```yaml
# render.yaml
services:
  - type: web
    name: flashcard-app
    env: node
    buildCommand: npm run build
    startCommand: npm start
```

**Pros:**
- Simple setup
- Free SSL
- Background workers
- Good for full-stack

### 5. **Fly.io** (For Global Distribution)
```toml
# fly.toml
app = "flashcard-demo"

[build]
  builder = "heroku/buildpacks:20"

[[services]]
  http_checks = []
  internal_port = 8080
  protocol = "tcp"
```

**Pros:**
- Edge deployment
- WebSocket support
- Global CDN
- Docker-based

## 📱 Quick Demo Features Priority

### Must Have (Week 1)
1. **Auth**: Email/password login
2. **Cards**: Create, view, study
3. **Leitner**: Basic 5-box system
4. **Swipe**: Left/right gestures
5. **Progress**: Simple XP counter

### Nice to Have (Week 2)
1. **AI Generation**: Basic OpenAI integration
2. **Animations**: Card flip, success
3. **Offline**: Basic caching
4. **PWA**: Installable web app
5. **Share**: Export card sets

### Post-Demo (Future)
1. Full gamification
2. Social features
3. Premium tiers
4. Native apps

## 🔧 Quick Start Code

### 1. Supabase Client Setup
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

### 2. Simple Auth Hook
```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
```

### 3. Basic Card Store
```typescript
// stores/cardStore.ts
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface CardStore {
  cards: Card[]
  loading: boolean
  fetchCards: () => Promise<void>
  addCard: (card: Partial<Card>) => Promise<void>
  updateBox: (cardId: string, newBox: number) => Promise<void>
}

export const useCardStore = create<CardStore>((set, get) => ({
  cards: [],
  loading: false,
  
  fetchCards: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error) set({ cards: data })
    set({ loading: false })
  },
  
  addCard: async (card) => {
    const { data, error } = await supabase
      .from('flashcards')
      .insert([card])
      .select()
      .single()
    
    if (!error) {
      set({ cards: [data, ...get().cards] })
    }
  },
  
  updateBox: async (cardId, newBox) => {
    const nextReview = calculateNextReview(newBox)
    
    const { error } = await supabase
      .from('flashcards')
      .update({ 
        box_number: newBox,
        next_review_at: nextReview
      })
      .eq('id', cardId)
    
    if (!error) {
      get().fetchCards()
    }
  }
}))
```

## 🚢 Deployment Steps

### For Vercel (Recommended for Demo)
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Build for web
expo export:web

# 3. Deploy
vercel --prod

# 4. Set environment variables in Vercel dashboard
# EXPO_PUBLIC_SUPABASE_URL
# EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### For Expo + Web Demo
```bash
# 1. Configure app.json
{
  "expo": {
    "name": "Flashcard Demo",
    "slug": "flashcard-demo",
    "web": {
      "bundler": "metro",
      "output": "static"
    }
  }
}

# 2. Build and deploy
expo export:web
vercel web-build --prod
```

## 📊 Demo Metrics to Track

1. **User Engagement**
   - Sign-ups per day
   - Cards created
   - Study sessions
   - Return rate

2. **Performance**
   - Load time
   - Crash rate
   - API response time

3. **Feature Usage**
   - Most used features
   - AI generation usage
   - Gesture completion rate

## 🎯 Demo Success Criteria

- [ ] 100 beta users signed up
- [ ] 1000+ cards created
- [ ] 90% positive feedback
- [ ] <2s load time
- [ ] Works offline
- [ ] Shareable web link

## 💡 Pro Tips for Quick Demo

1. **Use Expo Go** for rapid mobile testing
2. **Deploy web version first** for easy sharing
3. **Focus on core loop**: Create → Study → Progress
4. **Add sample data** for new users
5. **Create demo video** for investors/users
6. **Set up analytics early** (Mixpanel free tier)

## 🔗 Resources

- [Supabase + Expo Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo)
- [Vercel + Supabase](https://vercel.com/guides/using-supabase-with-vercel)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [Expo Web Deployment](https://docs.expo.dev/distribution/publishing-websites/) 