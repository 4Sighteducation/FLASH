import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from './Icon';

interface DetailedAnswerModalProps {
  visible: boolean;
  onClose: () => void;
  detailedAnswer?: string;
  keyPoints?: string[];
  cardType: string;
  color: string;
}

export default function DetailedAnswerModal({
  visible,
  onClose,
  detailedAnswer,
  keyPoints,
  cardType,
  color,
}: DetailedAnswerModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color }]}>Detailed Explanation</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close-circle" size={28} color={color} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {detailedAnswer && (
              <View style={styles.section}>
                <Text style={styles.detailedText}>{detailedAnswer}</Text>
              </View>
            )}
            
            {cardType === 'short_answer' && keyPoints && keyPoints.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color }]}>Key Points:</Text>
                {keyPoints.map((point, index) => (
                  <View key={index} style={styles.keyPoint}>
                    <Text style={[styles.bulletPoint, { color }]}>•</Text>
                    <Text style={styles.keyPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailedText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  keyPoint: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: '600',
  },
  keyPointText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: '#374151',
  },
}); 