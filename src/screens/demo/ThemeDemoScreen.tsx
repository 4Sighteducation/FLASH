import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme, ThemeMode, ColorScheme } from '../../contexts/ThemeContext';
import {
  ThemedCard,
  ThemedButton,
  ThemedProgressBar,
  ThemedBadge,
  ThemedFlashcard,
  ThemedSectionHeader,
} from '../../components/themed/ThemedComponents';
import Icon from '../../components/Icon';

/**
 * THEME DEMO SCREEN
 * 
 * Purpose: Test and showcase all theme variations and components
 * Usage: Navigate to this screen to see all 8 theme variations in action
 * 
 * To add to navigation:
 * 1. Import this screen in your navigator
 * 2. Add a route: <Stack.Screen name="ThemeDemo" component={ThemeDemoScreen} />
 * 3. Add a button in ProfileScreen or AdminDashboard to navigate here
 */

export default function ThemeDemoScreen() {
  const { 
    themeMode, 
    colorScheme, 
    colors, 
    effects,
    setThemeMode, 
    setColorScheme,
    isWeb 
  } = useTheme();
  
  const [progress, setProgress] = useState(72);

  const themes: ThemeMode[] = ['cyber', 'pulse', 'aurora', 'singularity'];
  const colorSchemes: ColorScheme[] = ['dark', 'light'];

  const incrementProgress = () => {
    setProgress((prev) => (prev >= 100 ? 0 : prev + 10));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary }]}>
            FL4SH Theme Demo
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Test all themes • {isWeb ? 'Web' : Platform.OS === 'ios' ? 'iOS' : 'Android'}
          </Text>
        </View>

        {/* Current Theme Info */}
        <ThemedCard elevated style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Current Theme:
            </Text>
            <Text style={[styles.infoValue, { color: colors.primary }]}>
              {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)} ({colorScheme})
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Border Radius:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {effects.radiusMedium}px
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Animation Speed:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {effects.timing.medium}ms
            </Text>
          </View>
        </ThemedCard>

        {/* Theme Selector */}
        <ThemedSectionHeader 
          title="Select Theme" 
          subtitle="Test all 4 themes instantly"
        />
        <View style={styles.themeGrid}>
          {themes.map((theme) => (
            <TouchableOpacity
              key={theme}
              onPress={() => setThemeMode(theme)}
              style={[
                styles.themeButton,
                {
                  backgroundColor: themeMode === theme ? colors.primary : colors.surface,
                  borderColor: themeMode === theme ? colors.primary : colors.border,
                  borderRadius: effects.radiusMedium,
                  ...effects.shadow.small,
                },
              ]}
            >
              <Text
                style={[
                  styles.themeButtonText,
                  {
                    color: themeMode === theme ? colors.textOnPrimary : colors.text,
                    fontWeight: themeMode === theme ? '700' : '600',
                  },
                ]}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Color Scheme Selector */}
        <ThemedSectionHeader 
          title="Color Scheme" 
          subtitle="Switch between light and dark"
        />
        <View style={styles.schemeContainer}>
          <View
            style={[
              styles.schemeToggle,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: effects.radiusFull,
              },
            ]}
          >
            {colorSchemes.map((scheme) => (
              <TouchableOpacity
                key={scheme}
                onPress={() => setColorScheme(scheme)}
                style={[
                  styles.schemeOption,
                  {
                    backgroundColor: colorScheme === scheme ? colors.primary : 'transparent',
                    borderRadius: effects.radiusFull,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.schemeOptionText,
                    {
                      color: colorScheme === scheme ? colors.textOnPrimary : colors.textSecondary,
                    },
                  ]}
                >
                  {scheme === 'dark' ? '🌙' : '☀️'} {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Buttons */}
        <ThemedSectionHeader title="Buttons" subtitle="All button variants" />
        <View style={styles.buttonGroup}>
          <ThemedButton
            title="Primary Button"
            onPress={() => console.log('Primary pressed')}
            variant="primary"
            size="medium"
          />
          <ThemedButton
            title="Secondary Button"
            onPress={() => console.log('Secondary pressed')}
            variant="secondary"
            size="medium"
          />
          <ThemedButton
            title="Ghost Button"
            onPress={() => console.log('Ghost pressed')}
            variant="ghost"
            size="medium"
          />
        </View>

        {/* Button Sizes */}
        <View style={styles.buttonGroup}>
          <ThemedButton
            title="Small"
            onPress={() => {}}
            variant="primary"
            size="small"
          />
          <ThemedButton
            title="Medium"
            onPress={() => {}}
            variant="primary"
            size="medium"
          />
          <ThemedButton
            title="Large"
            onPress={() => {}}
            variant="primary"
            size="large"
          />
        </View>

        {/* Progress Bars */}
        <ThemedSectionHeader 
          title="Progress Bars" 
          subtitle="Animated progress indicators"
        />
        <ThemedCard style={styles.progressCard}>
          <ThemedProgressBar 
            progress={progress} 
            label="Daily Progress" 
            showLabel 
          />
          <ThemedButton
            title="Increment Progress"
            onPress={incrementProgress}
            variant="secondary"
            size="small"
            style={{ marginTop: 16 }}
          />
        </ThemedCard>

        <ThemedCard style={styles.progressCard}>
          <ThemedProgressBar progress={100} label="Completed" showLabel />
        </ThemedCard>

        <ThemedCard style={styles.progressCard}>
          <ThemedProgressBar progress={0} label="Not Started" showLabel />
        </ThemedCard>

        {/* Badges */}
        <ThemedSectionHeader title="Badges" subtitle="XP and status indicators" />
        <View style={styles.badgeRow}>
          <ThemedBadge value="1,000" icon="⚡" />
          <ThemedBadge value="20K" icon="🔥" />
          <ThemedBadge value="200K" icon="✨" />
        </View>

        {/* Cards */}
        <ThemedSectionHeader 
          title="Cards" 
          subtitle="Standard and elevated cards"
        />
        <ThemedCard style={styles.demoCard}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Standard Card
          </Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            This is a standard themed card with default elevation.
          </Text>
        </ThemedCard>

        <ThemedCard elevated style={styles.demoCard}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Elevated Card
          </Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            This card has higher elevation for emphasis.
          </Text>
        </ThemedCard>

        <ThemedCard glowing style={styles.demoCard}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Glowing Card
          </Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            Premium themes (Aurora, Singularity) show a glowing border animation.
          </Text>
        </ThemedCard>

        {/* Flashcard */}
        <ThemedSectionHeader 
          title="Flashcard Preview" 
          subtitle="Example flashcard component"
        />
        <ThemedFlashcard
          question="What is the powerhouse of the cell?"
          subject="Biology"
          cardNumber={1}
          totalCards={24}
          onPress={() => console.log('Flashcard tapped')}
        />

        {/* Color Palette */}
        <ThemedSectionHeader 
          title="Color Palette" 
          subtitle="Current theme colors"
        />
        <ThemedCard style={styles.paletteCard}>
          <View style={styles.paletteRow}>
            <View style={styles.paletteItem}>
              <View style={[styles.colorSwatch, { backgroundColor: colors.primary }]} />
              <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>
                Primary
              </Text>
            </View>
            <View style={styles.paletteItem}>
              <View style={[styles.colorSwatch, { backgroundColor: colors.secondary }]} />
              <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>
                Secondary
              </Text>
            </View>
            <View style={styles.paletteItem}>
              <View style={[styles.colorSwatch, { backgroundColor: colors.tertiary }]} />
              <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>
                Tertiary
              </Text>
            </View>
          </View>
          <View style={styles.paletteRow}>
            <View style={styles.paletteItem}>
              <View style={[styles.colorSwatch, { backgroundColor: colors.background }]} />
              <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>
                Background
              </Text>
            </View>
            <View style={styles.paletteItem}>
              <View style={[styles.colorSwatch, { backgroundColor: colors.surface }]} />
              <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>
                Surface
              </Text>
            </View>
            <View style={styles.paletteItem}>
              <View style={[styles.colorSwatch, { backgroundColor: colors.text }]} />
              <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>
                Text
              </Text>
            </View>
          </View>
        </ThemedCard>

        {/* Info Footer */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            All components use React Native Animated API for 60fps performance
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  themeButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    alignItems: 'center',
  },
  themeButtonText: {
    fontSize: 15,
  },
  schemeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  schemeToggle: {
    flexDirection: 'row',
    padding: 4,
    borderWidth: 1,
  },
  schemeOption: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  schemeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 24,
  },
  progressCard: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  demoCard: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  paletteCard: {
    marginBottom: 24,
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  paletteItem: {
    alignItems: 'center',
  },
  colorSwatch: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  colorLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
