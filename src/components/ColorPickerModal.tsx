import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ColorPickerModalProps {
  visible: boolean;
  subjectName: string;
  onClose: () => void;
  onColorSelected: (color: string) => void;
}

const colors = [
  { name: 'Indigo', hex: '#6366F1', light: '#E0E7FF' },
  { name: 'Purple', hex: '#8B5CF6', light: '#EDE9FE' },
  { name: 'Pink', hex: '#EC4899', light: '#FCE7F3' },
  { name: 'Red', hex: '#EF4444', light: '#FEE2E2' },
  { name: 'Orange', hex: '#F97316', light: '#FED7AA' },
  { name: 'Yellow', hex: '#F59E0B', light: '#FEF3C7' },
  { name: 'Green', hex: '#10B981', light: '#D1FAE5' },
  { name: 'Teal', hex: '#14B8A6', light: '#CCFBF1' },
  { name: 'Blue', hex: '#3B82F6', light: '#DBEAFE' },
  { name: 'Sky', hex: '#0EA5E9', light: '#E0F2FE' },
];

export default function ColorPickerModal({
  visible,
  subjectName,
  onClose,
  onColorSelected,
}: ColorPickerModalProps) {
  const { user } = useAuth();
  const [selectedColor, setSelectedColor] = useState(colors[0]);

  const handleConfirm = async () => {
    try {
      // Update the subject color in the database
      const { error } = await supabase
        .from('user_subjects')
        .update({ color: selectedColor.hex })
        .eq('user_id', user?.id)
        .eq('subject_name', subjectName);

      if (error) throw error;

      // Also update the color for all topics under this subject
      const { error: topicsError } = await supabase
        .from('user_custom_topics')
        .update({ color: selectedColor.light })
        .eq('user_id', user?.id)
        .eq('subject_id', subjectName);

      if (topicsError) console.error('Error updating topic colors:', topicsError);

      onColorSelected(selectedColor.hex);
    } catch (error) {
      console.error('Error saving color:', error);
      // Still call the callback even if save fails
      onColorSelected(selectedColor.hex);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose a color for</Text>
            <Text style={styles.subjectName}>{subjectName}</Text>
          </View>

          <ScrollView style={styles.colorGrid}>
            <View style={styles.colorRow}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color.hex}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color.hex },
                    selectedColor.hex === color.hex && styles.selectedColor,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor.hex === color.hex && (
                    <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.preview}>
            <View style={[styles.previewSubject, { backgroundColor: selectedColor.hex }]}>
              <Text style={styles.previewSubjectText}>{subjectName}</Text>
            </View>
            <View style={[styles.previewTopic, { backgroundColor: selectedColor.light }]}>
              <Text style={styles.previewTopicText}>Sample Topic</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxWidth: 400,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 4,
  },
  subjectName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  colorGrid: {
    maxHeight: 200,
    marginBottom: 24,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#1F2937',
  },
  preview: {
    marginBottom: 24,
    gap: 8,
  },
  previewSubject: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewSubjectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewTopic: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewTopicText: {
    fontSize: 14,
    color: '#1F2937',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#6366F1',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 