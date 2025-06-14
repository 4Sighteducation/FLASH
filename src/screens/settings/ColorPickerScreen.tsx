import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = [
  // Primary Colors
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#3B82F6', // Blue
  '#6B7280', // Gray
  '#F97316', // Orange
  // Additional Colors
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#A855F7', // Violet
  '#F43F5E', // Rose
  '#0EA5E9', // Sky
  '#22C55E', // Green
  '#FACC15', // Yellow
  '#DC2626', // Red-600
  '#7C3AED', // Violet-600
  '#0891B2', // Cyan-600
];

const GRADIENT_PRESETS = [
  { name: 'Sunset', colors: ['#FF6B6B', '#FF8E53'] },
  { name: 'Ocean', colors: ['#4ECDC4', '#44A08D'] },
  { name: 'Purple Dream', colors: ['#9333EA', '#DB2777'] },
  { name: 'Forest', colors: ['#96CEB4', '#4CAF50'] },
  { name: 'Fire', colors: ['#F97316', '#DC2626'] },
  { name: 'Sky', colors: ['#45B7D1', '#2196F3'] },
  { name: 'Lavender', colors: ['#DDA0DD', '#9C27B0'] },
  { name: 'Mint', colors: ['#84CC16', '#10B981'] },
];

export default function ColorPickerScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { subjectId, subjectName, currentColor } = route.params as any;
  
  const [selectedColor, setSelectedColor] = useState(currentColor || '#6366F1');
  const [saving, setSaving] = useState(false);
  const [colorMode, setColorMode] = useState<'solid' | 'gradient'>('solid');

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_subjects')
        .update({ color: selectedColor })
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
        colors={[selectedColor, adjustColor(selectedColor, -20)]}
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

      <View style={styles.content}>
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
            style={[styles.modeButton, colorMode === 'gradient' && styles.activeModeButton]}
            onPress={() => setColorMode('gradient')}
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
              {GRADIENT_PRESETS.map((gradient) => (
                <TouchableOpacity
                  key={gradient.name}
                  style={styles.gradientOption}
                  onPress={() => setSelectedColor(gradient.colors[0])}
                >
                  <LinearGradient
                    colors={gradient.colors as any}
                    style={[
                      styles.gradientPreview,
                      selectedColor === gradient.colors[0] && styles.selectedGradient,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {selectedColor === gradient.colors[0] && (
                      <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                    )}
                  </LinearGradient>
                  <Text style={styles.gradientName}>{gradient.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  activeModeButtonText: {
    color: '#FFFFFF',
  },
  gradientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gradientOption: {
    width: '30%',
    alignItems: 'center',
  },
  gradientPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
}); 