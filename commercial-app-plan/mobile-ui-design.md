# Mobile UI/UX Design Specifications

## Design Principles
1. **Mobile-First**: Every interaction optimized for touch
2. **Gesture-Driven**: Swipe, pinch, drag interactions
3. **Minimal Cognitive Load**: Clear visual hierarchy
4. **Delightful Animations**: Smooth, purposeful transitions
5. **Accessibility**: WCAG 2.1 AA compliant

## Color Palette & Theming

### Light Theme
```css
--primary: #6366F1;        /* Indigo - Main actions */
--secondary: #8B5CF6;      /* Purple - Accents */
--success: #10B981;        /* Green - Correct answers */
--error: #EF4444;          /* Red - Incorrect answers */
--warning: #F59E0B;        /* Amber - Warnings */
--background: #FFFFFF;     /* White - Main background */
--surface: #F9FAFB;        /* Light gray - Cards */
--text-primary: #111827;   /* Dark gray - Main text */
--text-secondary: #6B7280; /* Medium gray - Secondary text */
```

### Dark Theme
```css
--primary: #818CF8;        /* Light indigo */
--secondary: #A78BFA;      /* Light purple */
--success: #34D399;        /* Light green */
--error: #F87171;          /* Light red */
--warning: #FBBF24;        /* Light amber */
--background: #111827;     /* Dark blue-gray */
--surface: #1F2937;        /* Lighter blue-gray */
--text-primary: #F9FAFB;   /* Light gray */
--text-secondary: #D1D5DB; /* Medium light gray */
```

## Key Screens & Components

### 1. Onboarding Flow
```
┌─────────────────┐
│   Welcome       │
│                 │
│  [App Logo]     │
│                 │
│ "Master Any     │
│  Subject with   │
│  Smart Cards"   │
│                 │
│ [Get Started]   │
└─────────────────┘
```

**Features:**
- Animated illustrations
- Progress indicators
- Skip option
- Personalization questions

### 2. Home Dashboard
```
┌─────────────────┐
│ Good Morning!   │
│ Sarah 🔥12      │
├─────────────────┤
│ Daily Progress  │
│ ████████░░ 80%  │
├─────────────────┤
│ Study Now       │
│ 📚 25 cards due │
│                 │
│ Quick Actions   │
│ [+] [🎯] [📊]  │
├─────────────────┤
│ Your Subjects   │
│ ┌───┐ ┌───┐    │
│ │Mat│ │Phy│    │
│ └───┘ └───┘    │
└─────────────────┘
```

**Components:**
- Greeting with streak counter
- Circular progress indicator
- Study reminder card
- Quick action buttons
- Subject grid with progress

### 3. Topic Selector (Enhanced)
```
┌─────────────────┐
│ Select Topics   │
│ [Search...]     │
├─────────────────┤
│ Popular         │
│ ┌─────────────┐ │
│ │ GCSE Maths  │ │
│ │ [AQA] [OCR] │ │
│ └─────────────┘ │
│                 │
│ Your Curriculum │
│ ┌─────────────┐ │
│ │ 📐 Algebra  │ │
│ │ 15 topics   │ │
│ └─────────────┘ │
└─────────────────┘
```

**Features:**
- Smart search with filters
- Exam board badges
- Topic preview cards
- AI suggestions
- Quick add buttons

### 4. Card Bank (Swipeable)
```
┌─────────────────┐
│ Card Bank       │
│ [Filter] [Sort] │
├─────────────────┤
│   ← Swipe →     │
│ ┌─────────────┐ │
│ │             │ │
│ │  What is    │ │
│ │  2 + 2?     │ │
│ │             │ │
│ │ [Tap to     │ │
│ │  flip]      │ │
│ └─────────────┘ │
│ ● ○ ○ ○ ○       │
└─────────────────┘
```

**Interactions:**
- Swipe left/right to navigate
- Tap to flip card
- Long press for options
- Pinch to zoom
- Pull down to refresh

### 5. Study Zone (Gamified)
```
┌─────────────────┐
│ Study Zone  💎  │
│ Level 5 → 6     │
│ ████████░░ 450XP│
├─────────────────┤
│     Box 2       │
│   12 cards      │
│                 │
│ ┌─────────────┐ │
│ │   Question  │ │
│ │   appears   │ │
│ │    here     │ │
│ └─────────────┘ │
│                 │
│ [Show Answer]   │
│                 │
│ Time: 0:15 ⏱️   │
└─────────────────┘
```

**Gamification Elements:**
- XP progress bar
- Level indicator
- Combo counter
- Time bonus
- Achievement popups

### 6. AI Card Generator
```
┌─────────────────┐
│ Generate Cards  │
├─────────────────┤
│ Topic:          │
│ [Photosynthesis]│
│                 │
│ Difficulty:     │
│ [●●●○○]         │
│                 │
│ Card Types:     │
│ ☑ Multiple      │
│ ☑ Short Answer  │
│ ☐ Essay         │
│                 │
│ [Generate 10]   │
├─────────────────┤
│ Preview:        │
│ ┌─────────────┐ │
│ │ Generated   │ │
│ │ cards here  │ │
│ └─────────────┘ │
└─────────────────┘
```

**Features:**
- Smart topic suggestions
- Difficulty slider
- Type selection
- Live preview
- Bulk edit options

## Gesture Library

### Card Interactions
- **Swipe Right**: Mark as known/correct
- **Swipe Left**: Mark as unknown/incorrect
- **Swipe Up**: Add to favorites
- **Swipe Down**: Skip card
- **Tap**: Flip card
- **Double Tap**: Zoom in
- **Long Press**: Show options menu
- **Pinch**: Zoom in/out

### Navigation
- **Edge Swipe**: Go back
- **Pull Down**: Refresh
- **Pull Up**: Load more
- **3D Touch/Long Press**: Preview

## Animations & Transitions

### Card Flip Animation
```javascript
{
  transform: [
    { rotateY: '0deg' },
    { rotateY: '180deg' }
  ],
  duration: 600,
  easing: 'ease-in-out'
}
```

### Success Animation
- Confetti burst
- XP counter increment
- Streak flame animation
- Achievement slide-in

### Box Progression
- Card flies from current box to next
- Box glows and scales
- Progress bar fills smoothly

## Notification Design

### Daily Reminder
```
┌─────────────────────┐
│ 📚 Time to Study!   │
│ You have 15 cards   │
│ waiting in Box 2    │
│                     │
│ [Study Now] [Later] │
└─────────────────────┘
```

### Achievement Unlocked
```
┌─────────────────────┐
│ 🏆 Achievement!     │
│ "Speed Demon"       │
│ Complete 50 cards   │
│ in under 10 mins    │
│ +100 XP            │
└─────────────────────┘
```

## Accessibility Features

1. **Visual**
   - High contrast mode
   - Adjustable font sizes
   - Color blind friendly palettes
   - Clear focus indicators

2. **Motor**
   - Large touch targets (min 44x44)
   - Gesture alternatives
   - Adjustable time limits
   - One-handed mode

3. **Cognitive**
   - Simple language
   - Clear instructions
   - Progress indicators
   - Undo functionality

## Performance Optimizations

1. **Image Loading**
   - Lazy loading
   - Progressive JPEGs
   - WebP format
   - Thumbnail previews

2. **Animations**
   - 60 FPS target
   - GPU acceleration
   - Reduced motion option
   - Preload critical animations

3. **Data**
   - Offline first
   - Smart caching
   - Background sync
   - Incremental updates 