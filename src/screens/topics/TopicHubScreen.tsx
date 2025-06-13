import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

interface Topic {
  id: string;
  topic_name: string;
  topic_level: number;
  parent_topic_id: string | null;
  priority?: number;
  is_custom?: boolean;
  children?: Topic[];
}

const PRIORITY_LEVELS = [
  { value: 1, label: 'Netflix & Chill', color: '#10B981', emoji: '😎' },
  { value: 2, label: 'Casual Review', color: '#3B82F6', emoji: '📚' },
  { value: 3, label: 'Getting Serious', color: '#F59E0B', emoji: '🎯' },
  { value: 4, label: 'Crunch Time', color: '#F97316', emoji: '⏰' },
  { value: 5, label: 'Emergency Mode!', color: '#EF4444', emoji: '🚨' },
];

const LEVEL_NAMES = {
  1: 'Module',
  2: 'Topic',
  3: 'Sub-topic',
};

export default function TopicHubScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { subjectId, subjectName, subjectColor } = route.params as any;

  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicTree, setTopicTree] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [selectedPriorities, setSelectedPriorities] = useState<Map<string, number>>(new Map());
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    topic: Topic | null;
  }>({ visible: false, topic: null });
  const [editModal, setEditModal] = useState<{
    visible: boolean;
    topic: Topic | null;
    newName: string;
  }>({ visible: false, topic: null, newName: '' });
  const [viewMode, setViewMode] = useState<'hierarchy' | 'priority'>('hierarchy');

  useEffect(() => {
    loadTopics();
  }, [subjectId]);

  const loadTopics = async () => {
    try {
      setLoading(true);
      
      // Load curriculum topics
      const { data, error } = await supabase
        .from('curriculum_topics')
        .select('*')
        .eq('exam_board_subject_id', subjectId)
        .order('topic_level')
        .order('sort_order');

      if (error) throw error;
      
      // Load user priorities
      const { data: priorities } = await supabase
        .from('user_topic_priorities')
        .select('topic_id, priority')
        .eq('user_id', user?.id);

      const priorityMap = new Map();
      priorities?.forEach(p => priorityMap.set(p.topic_id, p.priority));
      
      setTopics(data || []);
      setSelectedPriorities(priorityMap);
      
      // Build tree structure
      if (data) {
        const tree = buildTopicTree(data);
        setTopicTree(tree);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      Alert.alert('Error', 'Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const buildTopicTree = (topics: Topic[]): Topic[] => {
    const topicMap = new Map<string, Topic>();
    const rootTopics: Topic[] = [];

    // First pass: create all topics
    topics.forEach(topic => {
      topicMap.set(topic.id, { ...topic, children: [] });
    });

    // Second pass: build tree
    topics.forEach(topic => {
      const currentTopic = topicMap.get(topic.id)!;
      if (topic.parent_topic_id) {
        const parent = topicMap.get(topic.parent_topic_id);
        if (parent) {
          parent.children!.push(currentTopic);
        }
      } else {
        rootTopics.push(currentTopic);
      }
    });

    return rootTopics;
  };

  const toggleExpanded = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const handleSaveEdit = async () => {
    if (!editModal.topic || !editModal.newName.trim()) return;

    try {
      // For custom topics, update in database
      const { error } = await supabase
        .from('user_custom_topics')
        .upsert({
          user_id: user?.id,
          subject_id: subjectId,
          original_topic_id: editModal.topic.id,
          title: editModal.newName.trim(),
          is_custom: true,
        });

      if (error) throw error;

      await loadTopics();
      setEditModal({ visible: false, topic: null, newName: '' });
    } catch (error) {
      console.error('Error updating topic:', error);
      Alert.alert('Error', 'Failed to update topic');
    }
  };

  const handleDeleteTopic = async () => {
    if (!deleteModal.topic) return;

    try {
      // Mark as deleted in user_custom_topics
      const { error } = await supabase
        .from('user_custom_topics')
        .upsert({
          user_id: user?.id,
          subject_id: subjectId,
          original_topic_id: deleteModal.topic.id,
          title: deleteModal.topic.topic_name,
          is_deleted: true,
        });

      if (error) throw error;

      await loadTopics();
      setDeleteModal({ visible: false, topic: null });
    } catch (error) {
      console.error('Error deleting topic:', error);
      Alert.alert('Error', 'Failed to delete topic');
    }
  };

  const handlePriorityChange = async (topicId: string, priority: number) => {
    try {
      const currentPriority = selectedPriorities.get(topicId);
      
      if (currentPriority === priority) {
        // Remove priority
        await supabase
          .from('user_topic_priorities')
          .delete()
          .eq('user_id', user?.id)
          .eq('topic_id', topicId);
        
        const newPriorities = new Map(selectedPriorities);
        newPriorities.delete(topicId);
        setSelectedPriorities(newPriorities);
      } else {
        // Set priority
        await supabase
          .from('user_topic_priorities')
          .upsert({
            user_id: user?.id,
            topic_id: topicId,
            priority: priority,
          });
        
        setSelectedPriorities(new Map(selectedPriorities).set(topicId, priority));
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      Alert.alert('Error', 'Failed to update priority');
    }
  };

  const renderTopic = (topic: Topic, depth: number = 0) => {
    const hasChildren = topic.children && topic.children.length > 0;
    const isExpanded = expandedTopics.has(topic.id);
    const priority = selectedPriorities.get(topic.id);
    const priorityInfo = priority ? PRIORITY_LEVELS.find(p => p.value === priority) : null;
    const levelName = LEVEL_NAMES[topic.topic_level as keyof typeof LEVEL_NAMES] || 'Item';

    return (
      <View key={topic.id}>
        <TouchableOpacity
          style={[
            styles.topicItem,
            { marginLeft: depth * 20 },
            priorityInfo && { borderLeftColor: priorityInfo.color, borderLeftWidth: 4 }
          ]}
          onPress={() => hasChildren && toggleExpanded(topic.id)}
        >
          <View style={styles.topicHeader}>
            {hasChildren && (
              <Ionicons
                name={isExpanded ? "chevron-down" : "chevron-forward"}
                size={20}
                color="#6B7280"
                style={styles.expandIcon}
              />
            )}
            <View style={styles.topicContent}>
              <View style={styles.topicTitleRow}>
                <Text style={[
                  styles.topicName,
                  depth === 0 && styles.moduleName,
                  depth === 1 && styles.topicNameText,
                  depth === 2 && styles.subTopicName,
                ]}>
                  {topic.topic_name}
                </Text>
                <Text style={styles.levelLabel}>{levelName}</Text>
              </View>
              {priorityInfo && (
                <View style={[styles.priorityBadge, { backgroundColor: priorityInfo.color }]}>
                  <Text style={styles.priorityEmoji}>{priorityInfo.emoji}</Text>
                  <Text style={styles.priorityText}>{priorityInfo.label}</Text>
                </View>
              )}
            </View>
            <View style={styles.topicActions}>
              <TouchableOpacity
                onPress={() => setEditModal({ 
                  visible: true, 
                  topic, 
                  newName: topic.topic_name 
                })}
                style={styles.actionButton}
              >
                <Ionicons name="pencil" size={18} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDeleteModal({ visible: true, topic })}
                style={styles.actionButton}
              >
                <Ionicons name="trash" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Priority selector for leaf nodes */}
        {!hasChildren && (
          <View style={[styles.prioritySelector, { marginLeft: depth * 20 + 20 }]}>
            {PRIORITY_LEVELS.map(level => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.priorityButton,
                  { backgroundColor: level.color },
                  selectedPriorities.get(topic.id) === level.value && styles.selectedPriority
                ]}
                onPress={() => handlePriorityChange(topic.id, level.value)}
              >
                <Text style={styles.priorityButtonText}>{level.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {isExpanded && topic.children?.map(child => renderTopic(child, depth + 1))}
      </View>
    );
  };

  const renderPriorityView = () => {
    // Flatten all topics and sort by priority
    const flattenTopics = (topics: Topic[]): Topic[] => {
      let result: Topic[] = [];
      topics.forEach(topic => {
        if (!topic.children || topic.children.length === 0) {
          result.push(topic);
        }
        if (topic.children) {
          result = result.concat(flattenTopics(topic.children));
        }
      });
      return result;
    };

    const allTopics = flattenTopics(topicTree);
    const prioritizedTopics = allTopics
      .filter(t => selectedPriorities.has(t.id))
      .sort((a, b) => {
        const priorityA = selectedPriorities.get(a.id) || 0;
        const priorityB = selectedPriorities.get(b.id) || 0;
        return priorityB - priorityA; // Higher priority first
      });

    return prioritizedTopics.map(topic => {
      const priority = selectedPriorities.get(topic.id);
      const priorityInfo = PRIORITY_LEVELS.find(p => p.value === priority);
      
      return (
        <View key={topic.id} style={[
          styles.priorityItem,
          { borderLeftColor: priorityInfo?.color, borderLeftWidth: 4 }
        ]}>
          <View style={styles.priorityItemContent}>
            <Text style={styles.priorityItemName}>{topic.topic_name}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityInfo?.color }]}>
              <Text style={styles.priorityEmoji}>{priorityInfo?.emoji}</Text>
              <Text style={styles.priorityText}>{priorityInfo?.label}</Text>
            </View>
          </View>
        </View>
      );
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[subjectColor || '#6366F1', '#8B5CF6']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Topic Hub</Text>
            <Text style={styles.subjectName}>{subjectName}</Text>
          </View>
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'hierarchy' ? 'priority' : 'hierarchy')}>
            <Ionicons 
              name={viewMode === 'hierarchy' ? 'list' : 'git-branch'} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.viewModeToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'hierarchy' && styles.activeToggle]}
          onPress={() => setViewMode('hierarchy')}
        >
          <Ionicons name="git-branch" size={20} color={viewMode === 'hierarchy' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.toggleText, viewMode === 'hierarchy' && styles.activeToggleText]}>
            Hierarchy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'priority' && styles.activeToggle]}
          onPress={() => setViewMode('priority')}
        >
          <Ionicons name="list" size={20} color={viewMode === 'priority' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.toggleText, viewMode === 'priority' && styles.activeToggleText]}>
            Priority
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.priorityLegend}>
        <Text style={styles.legendTitle}>Priority Levels:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {PRIORITY_LEVELS.map(level => (
            <View key={level.value} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: level.color }]} />
              <Text style={styles.legendText}>{level.emoji} {level.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        {viewMode === 'hierarchy' ? (
          topicTree.map(topic => renderTopic(topic))
        ) : (
          renderPriorityView()
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModal({ visible: false, topic: null, newName: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.modalTitle}>
              Edit {editModal.topic && LEVEL_NAMES[editModal.topic.topic_level as keyof typeof LEVEL_NAMES]}
            </Text>
            <TextInput
              style={styles.editInput}
              value={editModal.newName}
              onChangeText={(text) => setEditModal({ ...editModal, newName: text })}
              placeholder="Enter new name"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModal({ visible: false, topic: null, newName: '' })}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DeleteConfirmationModal
        visible={deleteModal.visible}
        onClose={() => setDeleteModal({ visible: false, topic: null })}
        onConfirm={handleDeleteTopic}
        itemType={deleteModal.topic ? LEVEL_NAMES[deleteModal.topic.topic_level as keyof typeof LEVEL_NAMES] : 'Topic'}
        itemName={deleteModal.topic?.topic_name || ''}
        warningMessage="This will hide this item from your study list."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subjectName: {
    fontSize: 14,
    color: '#E0E7FF',
    marginTop: 4,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  activeToggle: {
    backgroundColor: '#6366F1',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeToggleText: {
    color: '#FFFFFF',
  },
  priorityLegend: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  topicItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  expandIcon: {
    marginRight: 8,
  },
  topicContent: {
    flex: 1,
  },
  topicTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topicName: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  moduleName: {
    fontSize: 18,
    fontWeight: '600',
  },
  topicNameText: {
    fontSize: 16,
    fontWeight: '500',
  },
  subTopicName: {
    fontSize: 14,
    color: '#4B5563',
  },
  levelLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  priorityEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  priorityText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  topicActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  priorityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  selectedPriority: {
    opacity: 1,
    borderWidth: 3,
    borderColor: '#1F2937',
  },
  priorityButtonText: {
    fontSize: 16,
  },
  priorityItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  priorityItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priorityItemName: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveButton: {
    backgroundColor: '#6366F1',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 