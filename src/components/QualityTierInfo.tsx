import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';

const { width } = Dimensions.get('window');

interface QualityTierInfoProps {
  visible: boolean;
  onClose: () => void;
}

export default function QualityTierInfo({ visible, onClose }: QualityTierInfoProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Quality Tiers Explained</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#E2E8F0" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Tier 1 */}
            <View style={[styles.tierCard, { borderColor: '#10B981' }]}>
              <View style={styles.tierHeader}>
                <Text style={styles.tierEmoji}>✅</Text>
                <View style={styles.tierHeaderText}>
                  <Text style={styles.tierTitle}>VERIFIED</Text>
                  <Text style={styles.tierSubtitle}>Highest Quality</Text>
                </View>
              </View>
              <Text style={styles.tierDescription}>
                These papers have the complete set: Question Paper, Official Mark Scheme, AND Examiner Report.
              </Text>
              <View style={styles.features}>
                <View style={styles.featureRow}>
                  <Icon name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.featureText}>Most accurate AI marking</Text>
                </View>
                <View style={styles.featureRow}>
                  <Icon name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.featureText}>Real examiner insights</Text>
                </View>
                <View style={styles.featureRow}>
                  <Icon name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.featureText}>Common mistakes highlighted</Text>
                </View>
                <View style={styles.featureRow}>
                  <Icon name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.featureText}>Pro tips from examiners</Text>
                </View>
              </View>
            </View>

            {/* Tier 2 */}
            <View style={[styles.tierCard, { borderColor: '#3B82F6' }]}>
              <View style={styles.tierHeader}>
                <Text style={styles.tierEmoji}>⭐</Text>
                <View style={styles.tierHeaderText}>
                  <Text style={styles.tierTitle}>OFFICIAL</Text>
                  <Text style={styles.tierSubtitle}>High Quality</Text>
                </View>
              </View>
              <Text style={styles.tierDescription}>
                Question Paper with Official Mark Scheme. No examiner report available.
              </Text>
              <View style={styles.features}>
                <View style={styles.featureRow}>
                  <Icon name="checkmark-circle" size={16} color="#3B82F6" />
                  <Text style={styles.featureText}>Accurate AI marking</Text>
                </View>
                <View style={styles.featureRow}>
                  <Icon name="checkmark-circle" size={16} color="#3B82F6" />
                  <Text style={styles.featureText}>Real marking criteria</Text>
                </View>
                <View style={styles.featureRow}>
                  <Icon name="checkmark-circle" size={16} color="#3B82F6" />
                  <Text style={styles.featureText}>Standard feedback</Text>
                </View>
              </View>
            </View>

            {/* Tier 3 */}
            <View style={[styles.tierCard, { borderColor: '#8B5CF6' }]}>
              <View style={styles.tierHeader}>
                <Text style={styles.tierEmoji}>🤖</Text>
                <View style={styles.tierHeaderText}>
                  <Text style={styles.tierTitle}>AI-ASSISTED</Text>
                  <Text style={styles.tierSubtitle}>Good for Practice</Text>
                </View>
              </View>
              <Text style={styles.tierDescription}>
                Question Paper only. Mark scheme is AI-generated based on similar questions.
              </Text>
              <View style={styles.features}>
                <View style={styles.featureRow}>
                  <Icon name="checkmark-circle" size={16} color="#8B5CF6" />
                  <Text style={styles.featureText}>Still valuable practice</Text>
                </View>
                <View style={styles.featureRow}>
                  <Icon name="checkmark-circle" size={16} color="#8B5CF6" />
                  <Text style={styles.featureText}>AI infers marking criteria</Text>
                </View>
                <View style={styles.featureRow}>
                  <Icon name="checkmark-circle" size={16} color="#8B5CF6" />
                  <Text style={styles.featureText}>Basic feedback</Text>
                </View>
                <View style={styles.featureRow}>
                  <Icon name="information-circle" size={16} color="#F59E0B" />
                  <Text style={[styles.featureText, { color: '#F59E0B' }]}>
                    Transparent about quality
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom tip */}
            <View style={styles.tipCard}>
              <Icon name="lightbulb" size={20} color="#F59E0B" />
              <Text style={styles.tipText}>
                💡 Tip: Start with Verified papers for the best practice experience!
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.doneGradient}
            >
              <Text style={styles.doneButtonText}>Got it! ✓</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.92,
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tierCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  tierHeaderText: {
    flex: 1,
  },
  tierTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  tierSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  tierDescription: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    marginBottom: 12,
  },
  features: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#CBD5E1',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#F59E0B',
    lineHeight: 18,
  },
  doneButton: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  doneGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

