# Cyber Theme Implementation

## Overview
The Cyber theme is a futuristic, Matrix-inspired visual theme for the FLASH app featuring neon colors and dark backgrounds.

## Current Status: ~20% Complete

### ✅ Implemented
1. **Theme Context** (`src/contexts/ThemeContext.tsx`)
   - Created theme switching infrastructure
   - Defined cyber color palette
   - Theme preference saved locally

2. **Profile Screen** (`src/screens/main/ProfileScreen.tsx`)
   - Added theme toggle switch
   - Users can switch between default and cyber themes

3. **Partial Screen Updates**
   - LoginScreen: Uses cyber gradient colors
   - HomeScreen: Partially updated with dynamic styles
   - StudyScreen: Basic gradient updates

### 🎨 Cyber Color Palette
```typescript
cyber: {
  primary: '#00FF88',        // Neon green
  secondary: '#FF0080',      // Hot pink
  background: '#000000',     // Pure black
  surface: 'rgba(0, 255, 136, 0.1)', // Translucent green
  text: '#00FF88',          // Neon green text
  textSecondary: '#FF0080', // Hot pink secondary
  border: 'rgba(0, 255, 136, 0.3)',
  accent: '#FFFF00',        // Yellow
  gradient: ['#000000', '#0A0A0A', '#1A0A1A'], // Dark gradient
  cardGradient: ['#1A0A1A', '#2A0A2A'],
  buttonGradient: ['#00FF88', '#00CC66'],
}
```

## What Makes It "Cyber"
- **Neon Colors**: Bright greens and pinks on black backgrounds
- **Glow Effects**: Text shadows and border glows
- **Dark Backgrounds**: Pure blacks and dark gradients
- **Futuristic Feel**: Matrix-style color scheme

## Implementation Pattern

### To Apply Cyber Theme to a Screen:

1. **Import the theme context**:
```typescript
import { useTheme } from '../../contexts/ThemeContext';
```

2. **Get theme values in component**:
```typescript
const { colors, theme } = useTheme();
```

3. **Update styles conditionally**:
```typescript
// For colors
color: theme === 'cyber' ? colors.text : '#333'

// For backgrounds
backgroundColor: theme === 'cyber' ? colors.background : '#f0f0f0'

// For gradients
colors={theme === 'cyber' ? colors.gradient : ['#6366F1', '#8B5CF6']}
```

4. **Add glow effects for cyber theme**:
```typescript
...(theme === 'cyber' && {
  textShadowColor: colors.primary,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 4,
})
```

## Screens Needing Cyber Theme

### High Priority (Most Visible)
1. **FlashcardsScreen** - Main card browsing
2. **StudyModal** - Active studying interface
3. **CreateCardScreen** - Card creation
4. **TopicListScreen** - Topic navigation

### Medium Priority
5. **AIGeneratorScreen** - AI features
6. **ProfileScreen** - Additional styling
7. **SignUpScreen** - Registration flow
8. **TopicHubScreen** - Topic management

### Low Priority
9. All modal components
10. Settings screens
11. Onboarding screens

## Visual Examples

### Default Theme
- Blue/purple gradients
- White backgrounds
- Dark text on light backgrounds
- Subtle shadows

### Cyber Theme
- Black backgrounds
- Neon green primary text
- Hot pink accents
- Glowing borders and text
- Matrix-style aesthetic

## Code Example - Full Screen Implementation

```typescript
// Complete cyber theme implementation for a screen
const ScreenName = () => {
  const { colors, theme } = useTheme();
  const styles = createStyles(colors, theme);
  
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={theme === 'cyber' ? colors.gradient : ['#6366F1', '#8B5CF6']}
        style={styles.header}
      >
        <Text style={styles.title}>Screen Title</Text>
      </LinearGradient>
    </SafeAreaView>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme === 'cyber' ? colors.background : '#f0f0f0',
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme === 'cyber' ? colors.text : '#333',
    ...(theme === 'cyber' && {
      textShadowColor: colors.primary,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 8,
    }),
  },
});
```

## Next Steps

1. **Complete HomeScreen** - Fix TypeScript issues and complete styling
2. **Update StudyModal** - Most important for user experience
3. **Theme FlashcardsScreen** - Main card browsing interface
4. **Add animations** - Glowing/pulsing effects for cyber theme
5. **Create cyber-themed icons** - Custom icon colors
6. **Add sound effects** - Optional: cyber sounds for interactions

## Testing the Theme

1. Go to Profile > Settings
2. Toggle "Cyber Mode" switch
3. Navigate through app to see changes
4. Check both light and dark environments

## Notes for Future Implementation

- Consider adding a "preview" in the Profile screen
- Could add more themes (Retro, Minimal, etc.)
- Animation transitions between themes would be cool
- Cyber theme could have special effects for correct/incorrect answers
- Consider accessibility - ensure sufficient contrast in cyber mode 