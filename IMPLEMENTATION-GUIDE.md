# FL4SH Theme System v2.1 - Implementation Guide

## Overview

This theme system is designed to work **natively in React Native** across iOS, Android, and Web. It avoids CSS-only features and uses React Native's `Animated` API for all animations.

---

## Files Included

| File | Purpose |
|------|---------|
| `ThemeContext.tsx` | Core theme provider with colors, effects, and shadows |
| `useAnimations.ts` | RN-compatible animation hooks using `Animated` API |
| `ThemedComponents.tsx` | Example components showing proper theme usage |

---

## What Works Everywhere (iOS, Android, Web)

✅ **Colors** - All color values work universally  
✅ **Border Radius** - Standard RN property  
✅ **Shadows** - Using `shadowX` (iOS) + `elevation` (Android)  
✅ **Animated API** - Scale, opacity, translateY animations  
✅ **Press feedback** - Scale animations on touch  

---

## What Doesn't Work (And Alternatives)

| CSS Feature | RN Support | Alternative |
|-------------|-----------|-------------|
| `@keyframes` | ❌ None | Use `Animated.loop()` |
| `backdrop-filter: blur()` | ❌ None | Use `expo-blur` or skip |
| `mix-blend-mode` | ❌ None | Skip or use images |
| `mask-composite` | ❌ None | Skip |
| Linear gradients | ⚠️ Partial | Use `expo-linear-gradient` |
| Box shadow (Android) | ⚠️ Limited | Use `elevation` + colored underlay |

---

## Theme Progression Summary

| Theme | XP | Visual Identity | Animation Style |
|-------|-----|-----------------|-----------------|
| **Cyber** | 0 | Cyan/Pink, sharp corners | Subtle pulse, fast timing |
| **Pulse** | 1,000 | Orange/Amber, rounded | Breathing, heartbeat, slower |
| **Aurora** | 20,000 | Cyan/Purple/Green, soft | Floating, ethereal, slowest |
| **Singularity** | 200,000 | Gold/Pink, void black | Intense glow, dramatic timing |

---

## Quick Start

### 1. Install the Theme Provider

```tsx
// App.tsx
import { ThemeProvider } from './theme/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

### 2. Use the Theme in Components

```tsx
import { useTheme } from './theme/ThemeContext';

const MyComponent = () => {
  const { colors, effects } = useTheme();
  
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: effects.radiusLarge,
      borderWidth: 1,
      borderColor: colors.border,
      ...effects.shadow.medium,
    }}>
      <Text style={{ color: colors.text }}>Hello!</Text>
    </View>
  );
};
```

### 3. Add Animations

```tsx
import { usePulseAnimation, usePressAnimation } from './theme/useAnimations';

const AnimatedCard = () => {
  const pulseStyle = usePulseAnimation(true);
  
  return (
    <Animated.View style={[cardStyles, pulseStyle]}>
      {/* content */}
    </Animated.View>
  );
};

const AnimatedButton = ({ onPress, children }) => {
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation();
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};
```

---

## Implementation Phases

### Phase 1: Core Theme (2-4 hours)
- [ ] Replace existing ThemeContext with new version
- [ ] Update color references throughout app
- [ ] Test light/dark mode toggle
- [ ] Verify shadows work on both platforms

### Phase 2: Basic Animations (4-6 hours)
- [ ] Add `usePressAnimation` to all buttons
- [ ] Add `useFadeIn` to screen transitions
- [ ] Add `usePulseAnimation` to key cards
- [ ] Test performance on lower-end device

### Phase 3: Theme-Specific Effects (6-8 hours)
- [ ] Implement `useHeartbeatAnimation` for Pulse
- [ ] Add `useFloatAnimation` for Aurora/Singularity
- [ ] Create glow border overlay for premium themes
- [ ] Add staggered list animations

### Phase 4: Progressive Enhancement - Web Only (Optional)
- [ ] Add CSS keyframes for web builds
- [ ] Implement backdrop blur with `expo-blur`
- [ ] Add gradient backgrounds with `expo-linear-gradient`
- [ ] Consider starfield as static image or reduced particles

---

## Shadow System Explained

React Native shadows work differently on iOS vs Android:

```tsx
// This is how effects.shadow.medium is structured:
{
  // iOS uses these:
  shadowColor: '#00F5FF',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  
  // Android uses this:
  elevation: 4,
}
```

**Problem:** Android's `elevation` doesn't support colored shadows.

**Solution for colored "glow" on Android:**
```tsx
const GlowingCard = () => {
  const { colors, effects } = useTheme();
  
  return (
    <View>
      {/* Colored underlay for Android glow effect */}
      {Platform.OS === 'android' && (
        <View style={{
          position: 'absolute',
          top: 4, left: 4, right: 4, bottom: -4,
          backgroundColor: colors.glowPrimary,
          borderRadius: effects.radiusLarge,
          opacity: 0.3,
        }} />
      )}
      <View style={[cardStyle, effects.shadow.glow]}>
        {/* content */}
      </View>
    </View>
  );
};
```

---

## Animation Performance Tips

1. **Always use `useNativeDriver: true`** - Already done in all hooks
2. **Limit simultaneous animations** - Don't animate everything at once
3. **Reduce particle counts** - If you add starfield, use <20 particles on mobile
4. **Test on real devices** - Simulators don't show true performance
5. **Use `React.memo`** - Prevent unnecessary re-renders of animated components

---

## Theme Switching UX

Recommended approach for your settings screen:

```tsx
const ThemeSelector = ({ currentXP }) => {
  const { themeMode, setThemeMode, isThemeUnlocked } = useTheme();
  
  const themes = [
    { id: 'cyber', name: 'Cyber', xp: 0 },
    { id: 'pulse', name: 'Pulse', xp: 1000 },
    { id: 'aurora', name: 'Aurora', xp: 20000 },
    { id: 'singularity', name: 'Singularity', xp: 200000 },
  ];
  
  return (
    <View>
      {themes.map(theme => {
        const unlocked = isThemeUnlocked(theme.id, currentXP);
        const active = themeMode === theme.id;
        
        return (
          <TouchableOpacity
            key={theme.id}
            onPress={() => unlocked && setThemeMode(theme.id)}
            disabled={!unlocked}
            style={{ opacity: unlocked ? 1 : 0.5 }}
          >
            <Text>{theme.name}</Text>
            {!unlocked && <Text>{theme.xp.toLocaleString()} XP to unlock</Text>}
            {active && <Text>✓ Active</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
```

---

## Color Scheme (Light/Dark) Considerations

The system supports both light and dark modes for each theme. Options for handling this:

### Option A: Follow System Setting
```tsx
import { useColorScheme } from 'react-native';

// In ThemeProvider, detect system preference
const systemScheme = useColorScheme(); // 'light' | 'dark'
```

### Option B: User Choice (Independent)
Let users choose their color scheme separately from the OS setting.

### Option C: Theme-Locked
Some themes only look good in dark mode (Singularity especially). You could lock certain themes to dark mode.

**Recommendation:** Start with Option B (user choice), defaulting to dark.

---

## Gradients (Requires Extra Package)

For gradient backgrounds or buttons, install:
```bash
npx expo install expo-linear-gradient
```

Then use:
```tsx
import { LinearGradient } from 'expo-linear-gradient';

const GradientButton = () => {
  const { colors } = useTheme();
  
  return (
    <LinearGradient
      colors={[colors.primary, colors.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={buttonStyle}
    >
      <Text>Gradient Button</Text>
    </LinearGradient>
  );
};
```

---

## Blur Effects (Requires Extra Package)

For glass morphism / blur effects (Aurora theme), install:
```bash
npx expo install expo-blur
```

Then use:
```tsx
import { BlurView } from 'expo-blur';

const GlassCard = () => {
  const { colorScheme } = useTheme();
  
  return (
    <BlurView 
      intensity={20} 
      tint={colorScheme === 'dark' ? 'dark' : 'light'}
      style={cardStyle}
    >
      {/* content */}
    </BlurView>
  );
};
```

**Note:** Blur can impact performance. Use sparingly.

---

## Testing Checklist

- [ ] Cyber dark mode looks correct
- [ ] Cyber light mode looks correct
- [ ] Theme persists after app restart
- [ ] Color scheme persists after app restart
- [ ] Animations run smoothly on iPhone SE (oldest supported)
- [ ] Animations run smoothly on mid-range Android
- [ ] Shadow/glow visible on iOS
- [ ] Elevation visible on Android
- [ ] No layout shift when changing themes
- [ ] Locked themes show as unavailable
- [ ] XP thresholds work correctly

---

## Questions?

This system is designed to grow with your app. Start with Phase 1, get it solid, then progressively add more effects as time permits.
