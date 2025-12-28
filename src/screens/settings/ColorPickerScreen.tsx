import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { gamificationConfig } from '../../services/gamificationService';
import { showUpgradePrompt } from '../../utils/upgradePrompt';

// Source of truth: `assets/flash-color-palettes.jsx`
// 28 distinct solids (ordered to look good in a grid)
const COLORS = [
  '#3B82F6', // Royal Blue
  '#8B5CF6', // Violet
  '#D946EF', // Fuchsia
  '#F43F5E', // Rose
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#6366F1', // Indigo
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#93C5FD', // Soft Blue
  '#C4B5FD', // Soft Purple
  '#F9A8D4', // Soft Pink
  '#FDBA74', // Soft Peach
  '#FB7185', // Coral
  '#FCA5A5', // Salmon
  '#6EE7B7', // Mint
  '#67E8F9', // Aqua
  '#64748B', // Slate
  '#475569', // Graphite
  '#334155', // Charcoal
  '#1E293B', // Midnight
];

// Gradients: we persist up to 3 colors (`gradient_color_1/_2/_3`).
const GRADIENT_PRESETS = [
  { name: 'Sunset', colors: ['#FCA5A5', '#FB923C'] },
  { name: 'Ocean', colors: ['#5EEAD4', '#3B82F6'] },
  { name: 'Purple Dream', colors: ['#C084FC', '#EC4899'] },
  { name: 'Forest', colors: ['#86EFAC', '#22C55E'] },
  { name: 'Fire', colors: ['#FDBA74', '#F97316'] },
  { name: 'Sky', colors: ['#7DD3FC', '#38BDF8'] },
  { name: 'Lavender', colors: ['#DDD6FE', '#A78BFA'] },
  { name: 'Mint', colors: ['#A7F3D0', '#6EE7B7'] },
  { name: 'Neon Wave', colors: ['#67E8F9', '#F0ABFC'] },
  { name: 'Cyber Ice', colors: ['#BAE6FD', '#38BDF8'] },
  { name: 'Midnight', colors: ['#475569', '#1E293B'] },
  { name: 'Steel', colors: ['#94A3B8', '#64748B'] },
  // New (2-stop)
  { name: 'Candy', colors: ['#F472B6', '#FB923C'] },
  { name: 'Electric', colors: ['#3B82F6', '#8B5CF6'] },
  { name: 'Deep Sea', colors: ['#0EA5E9', '#1E3A5F'] },
  { name: 'Grape', colors: ['#7C3AED', '#DB2777'] },
  { name: 'Mojito', colors: ['#BEF264', '#22C55E'] },
  { name: 'Peach', colors: ['#FECACA', '#FCD34D'] },
  { name: 'Berry', colors: ['#BE185D', '#7C3AED'] },
  { name: 'Glacier', colors: ['#E0F2FE', '#0284C7'] },
  { name: 'Ember', colors: ['#F87171', '#B91C1C'] },
  // 3-stop
  { name: 'Aurora', colors: ['#22D3EE', '#A855F7', '#EC4899'] },
  { name: 'Sunrise', colors: ['#FDE047', '#FB923C', '#F43F5E'] },
  { name: 'Cosmic', colors: ['#1E1B4B', '#7C3AED', '#EC4899'] },
];

const THEME_GRADIENTS = [
  {
    key: 'pulse' as const,
    name: 'Pulse (Theme)',
    requiredXp: gamificationConfig.themeUnlocks.pulse,
    colors: ['#FF006E', '#00F5FF', '#FF006E'],
  },
  {
    key: 'aurora' as const,
    name: 'Aurora (Theme)',
    requiredXp: gamificationConfig.themeUnlocks.aurora,
    colors: ['#22D3EE', '#A855F7', '#EC4899'],
  },
  {
    key: 'singularity' as const,
    name: 'Singularity (Theme)',
    requiredXp: gamificationConfig.themeUnlocks.singularity,
    colors: ['#000000', '#0a0f1e', '#00F5FF'],
  },
];

export default function ColorPickerScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { tier } = useSubscription();
  const { subjectId, subjectName, currentColor, currentGradient, useGradient } = route.params as any;
  
  const [selectedColor, setSelectedColor] = useState(currentColor || '#6366F1');
  const [selectedGradient, setSelectedGradient] = useState<{ color1: string; color2: string; color3?: string | null } | null>(
    currentGradient || null
  );
  const [saving, setSaving] = useState(false);
  const [colorMode, setColorMode] = useState<'solid' | 'gradient'>(useGradient ? 'gradient' : 'solid');
  const [totalPoints, setTotalPoints] = useState(0);

  const canUseGradients = tier !== 'free';

  useEffect(() => {
    let cancelled = false;
    async function loadUserPoints() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('user_stats')
        .select('total_points')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.warn('[ColorPicker] Failed to load user_stats.total_points', error);
        return;
      }
      setTotalPoints(data?.total_points ?? 0);
    }
    loadUserPoints();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const unlockedThemeGradients = useMemo(() => {
    const xp = Number(totalPoints || 0);
    return {
      pulse: xp >= gamificationConfig.themeUnlocks.pulse,
      aurora: xp >= gamificationConfig.themeUnlocks.aurora,
      singularity: xp >= gamificationConfig.themeUnlocks.singularity,
    };
  }, [totalPoints]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let updateData: any;
      
      if (colorMode === 'gradient' && selectedGradient) {
        if (!canUseGradients) {
          showUpgradePrompt({
            title: 'Premium feature',
            message: 'Gradients are available on Premium and Pro plans.',
          });
          return;
        }
        // Save gradient colors
        updateData = {
          gradient_color_1: selectedGradient.color1,
          gradient_color_2: selectedGradient.color2,
          gradient_color_3: selectedGradient.color3 || null,
          use_gradient: true,
          color: selectedGradient.color1, // Keep for backwards compatibility
        };
      } else {
        // Save solid color
        updateData = {
          color: selectedColor,
          use_gradient: false,
          gradient_color_1: null,
          gradient_color_2: null,
          gradient_color_3: null,
        };
      }

      const { error } = await supabase
        .from('user_subjects')
        .update(updateData)
        .eq('user_id', user?.id)
        .eq('subject_id', subjectId);

      if (error) throw error;

      navigation.goBack();
    } catch (error) {
      console.error('Error updating color:', error);
      Alert.alert('Error', 'Failed to update color');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={
          colorMode === 'gradient' && selectedGradient
            ? ([
                selectedGradient.color1,
                selectedGradient.color2,
                selectedGradient.color3,
              ].filter(Boolean) as string[])
            : [selectedColor, adjustColor(selectedColor, -20)]
        }
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Color</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.preview}>
          <Text style={styles.previewSubject}>{subjectName}</Text>
          <Text style={styles.previewText}>Preview of your subject color</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, colorMode === 'solid' && styles.activeModeButton]}
            onPress={() => setColorMode('solid')}
          >
            <Text style={[styles.modeButtonText, colorMode === 'solid' && styles.activeModeButtonText]}>
              Solid Colors
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              colorMode === 'gradient' && styles.activeModeButton,
              !canUseGradients && styles.disabledModeButton,
            ]}
            onPress={() => {
              if (!canUseGradients) {
                showUpgradePrompt({
                  title: 'Premium feature',
                  message: 'Gradients are available on Premium and Pro plans.',
                });
                return;
              }
              setColorMode('gradient');
            }}
          >
            <Text style={[styles.modeButtonText, colorMode === 'gradient' && styles.activeModeButtonText]}>
              Gradients
            </Text>
          </TouchableOpacity>
        </View>

        {colorMode === 'solid' ? (
          <>
            <Text style={styles.sectionTitle}>Select a color:</Text>
            <View style={styles.colorGrid}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColor,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Select a gradient:</Text>
            <View style={styles.gradientGrid}>
              {GRADIENT_PRESETS.map((gradient) => {
                const isSelected = selectedGradient?.color1 === gradient.colors[0] && 
                                  selectedGradient?.color2 === gradient.colors[1] &&
                                  (gradient.colors.length < 3 || selectedGradient?.color3 === gradient.colors[2]);
                return (
                  <TouchableOpacity
                    key={gradient.name}
                    style={styles.gradientOption}
                    onPress={() =>
                      setSelectedGradient({
                        color1: gradient.colors[0],
                        color2: gradient.colors[1],
                        color3: gradient.colors.length >= 3 ? gradient.colors[2] : null,
                      })
                    }
                  >
                    <LinearGradient
                      colors={gradient.colors as any}
                      style={[
                        styles.gradientPreview,
                        isSelected && styles.selectedGradient,
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                      )}
                    </LinearGradient>
                    <Text style={styles.gradientName}>{gradient.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Theme gradients (XP unlocks):</Text>
            <View style={styles.gradientGrid}>
              {THEME_GRADIENTS.map((g) => {
                const unlocked = unlockedThemeGradients[g.key];
                const isSelected =
                  selectedGradient?.color1 === g.colors[0] &&
                  selectedGradient?.color2 === g.colors[1] &&
                  (g.colors.length < 3 || selectedGradient?.color3 === g.colors[2]);

                return (
                  <TouchableOpacity
                    key={g.key}
                    style={styles.gradientOption}
                    onPress={() => {
                      if (!unlocked) {
                        Alert.alert('Locked', `Unlock at ${g.requiredXp.toLocaleString()} XP.`);
                        return;
                      }
                      setSelectedGradient({
                        color1: g.colors[0],
                        color2: g.colors[1],
                        color3: g.colors.length >= 3 ? g.colors[2] : null,
                      });
                    }}
                  >
                    <LinearGradient
                      colors={g.colors as any}
                      style={[
                        styles.gradientPreview,
                        isSelected && styles.selectedGradient,
                        !unlocked && styles.lockedGradient,
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {!unlocked ? (
                        <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                      ) : isSelected ? (
                        <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                      ) : null}
                    </LinearGradient>
                    <Text style={styles.gradientName}>{g.name}</Text>
                    {!unlocked ? (
                      <Text style={styles.lockedText}>{g.requiredXp.toLocaleString()} XP</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const adjustColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  saveButton: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  preview: {
    paddingHorizontal: 20,
  },
  previewSubject: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#1F2937',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeModeButton: {
    backgroundColor: '#6366F1',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  disabledModeButton: {
    opacity: 0.55,
  },
  activeModeButtonText: {
    color: '#FFFFFF',
  },
  gradientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gradientOption: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 18,
  },
  gradientPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedGradient: {
    borderWidth: 3,
    borderColor: '#1F2937',
  },
  gradientName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    textAlign: 'center',
  },
  lockedGradient: {
    opacity: 0.55,
  },
  lockedText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },
}); 