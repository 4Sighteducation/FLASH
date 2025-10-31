import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from './Icon';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SelectedSubject, Topic } from '../types';

interface TopicEditModalProps {
  visible: boolean;
  subject: SelectedSubject;
  onClose: () => void;
  onSave: () => void;
}

export default function TopicEditModal({
  visible,
  subject,
  onClose,
  onSave,
}: TopicEditModalProps) {
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);
  const [newTopicText, setNewTopicText] = useState('');
  const [addingToParent, setAddingToParent] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadTopics();
      setShowHelp(true);
    }
  }, [visible, subject]);

  const loadTopics = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Loading topics for subject:', subject.subjectName, subject.subjectId);
      
      // First check if user already has custom topics for this subject
      const { data: customTopics, error: customError } = await supabase
        .from('user_custom_topics')
        .select('*')
        .eq('user_id', user?.id)
        .eq('subject_id', subject.subjectId)
        .order('sort_order');

      if (customError) throw customError;

      console.log('📚 Custom topics found:', customTopics?.length || 0);

      if (customTopics && customTopics.length > 0) {
        // User already has custom topics
        const formattedTopics = customTopics.map((t: any) => ({
          id: t.id,
          title: t.title,
          parentId: t.parent_topic_id,
          isCustom: t.is_custom,
          isDeleted: t.is_deleted,
          sortOrder: t.sort_order,
        }));
        setTopics(formattedTopics);
        // Auto-expand all main topics
        const mainTopicIds = new Set(formattedTopics.filter(t => !t.parentId).map(t => t.id));
        setExpandedTopics(mainTopicIds);
      } else {
        // Load curriculum topics for this subject
        const { data: curriculumTopics, error: curriculumError } = await supabase
          .from('curriculum_topics')
          .select('*')
          .eq('exam_board_subject_id', subject.subjectId)
          .order('sort_order');

        if (curriculumError) throw curriculumError;

        console.log('📚 Curriculum topics found:', curriculumTopics?.length || 0);
        if (curriculumTopics && curriculumTopics.length > 0) {
          console.log('📋 Sample topic:', curriculumTopics[0]);
        }

        // Convert to our Topic format
        const formattedTopics = curriculumTopics?.map((t: any, index: number) => ({
          id: t.id,
          title: t.topic_name,
          parentId: t.parent_topic_id,
          isCustom: false,
          sortOrder: t.sort_order || index,
        })) || [];

        setTopics(formattedTopics);
        // Auto-expand all main topics
        const mainTopicIds = new Set(formattedTopics.filter(t => !t.parentId).map(t => t.id));
        setExpandedTopics(mainTopicIds);
      }
    } catch (error) {
      console.error('❌ Error loading topics:', error);
      Alert.alert('Error', 'Failed to load topics');
    } finally {
      setLoading(false);
    }
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

  const capitalizeFirst = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  const handleEditTopic = (topicId: string, currentTitle: string) => {
    setEditingTopic(topicId);
    setEditingText(currentTitle);
  };

  const handleSaveEdit = () => {
    if (editingTopic && editingText.trim()) {
      setTopics(topics.map(t => 
        t.id === editingTopic ? { ...t, title: editingText.trim() } : t
      ));
      setEditingTopic(null);
      setEditingText('');
    }
  };

  const handleDeleteTopic = (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    Alert.alert(
      'Delete Topic',
      `Are you sure you want to remove "${topic?.title}"? This won't affect your flashcards.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (topic?.isCustom) {
              // Actually remove custom topics
              setTopics(topics.filter(t => t.id !== topicId && t.parentId !== topicId));
            } else {
              // Mark curriculum topics as deleted
              setTopics(topics.map(t => 
                t.id === topicId ? { ...t, isDeleted: true } : t
              ));
            }
          },
        },
      ]
    );
  };

  const handleAddTopic = (parentId: string | null = null) => {
    setAddingTopic(true);
    setAddingToParent(parentId);
    setNewTopicText('');
  };

  const handleSaveNewTopic = () => {
    if (newTopicText.trim()) {
      const newTopic: Topic = {
        id: `temp_${Date.now()}`,
        title: newTopicText.trim(),
        parentId: addingToParent || undefined,
        isCustom: true,
        sortOrder: topics.length,
      };
      setTopics([...topics, newTopic]);
      setAddingTopic(false);
      setNewTopicText('');
      setAddingToParent(null);
    }
  };

  const handleSaveTopics = async () => {
    try {
      // Delete existing custom topics for this subject
      await supabase
        .from('user_custom_topics')
        .delete()
        .eq('user_id', user?.id)
        .eq('subject_id', subject.subjectId);

      // Save all topics as custom topics
      const topicsToSave = topics.map((t, index) => ({
        user_id: user?.id,
        subject_id: subject.subjectId,
        parent_topic_id: t.parentId || null,
        original_topic_id: t.isCustom ? null : t.id,
        title: t.title,
        is_custom: t.isCustom,
        is_deleted: t.isDeleted || false,
        sort_order: index,
      }));

      const { error } = await supabase
        .from('user_custom_topics')
        .insert(topicsToSave);

      if (error) throw error;

      onSave();
    } catch (error) {
      console.error('Error saving topics:', error);
      Alert.alert('Error', 'Failed to save topics');
    }
  };

  const renderTopic = (topic: Topic, level: number = 0) => {
    if (topic.isDeleted) return null;

    const childTopics = topics.filter(t => t.parentId === topic.id && !t.isDeleted);
    const isMainTopic = level === 0;
    const isModule = level === 1;
    const isSubtopic = level >= 2;
    const isExpanded = expandedTopics.has(topic.id);
    const hasChildren = childTopics.length > 0;

    return (
      <View key={topic.id}>
        <View style={[
          styles.topicItem,
          isMainTopic && styles.mainTopicItem,
          isModule && styles.moduleItem,
          isSubtopic && styles.subTopicItem,
          { marginLeft: level * 16 }
        ]}>
          {editingTopic === topic.id ? (
            <View style={styles.editingContainer}>
              <TextInput
                style={[
                  styles.editInput,
                  isMainTopic && styles.editInputMain,
                  isModule && styles.editInputModule
                ]}
                value={editingText}
                onChangeText={setEditingText}
                autoFocus
                placeholderTextColor="#64748B"
              />
              <TouchableOpacity 
                onPress={handleSaveEdit}
                style={styles.iconButton}
              >
                <Ionicons name="checkmark-circle" size={24} color="#00F5FF" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setEditingTopic(null)}
                style={styles.iconButton}
              >
                <Ionicons name="close-circle" size={24} color="#FF006E" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.topicLeft}>
                {hasChildren && (
                  <TouchableOpacity
                    onPress={() => toggleExpanded(topic.id)}
                    style={styles.expandButton}
                  >
                    <Ionicons
                      name={isExpanded ? "chevron-down" : "chevron-forward"}
                      size={20}
                      color={isMainTopic ? "#00F5FF" : isModule ? "#94A3B8" : "#64748B"}
                    />
                  </TouchableOpacity>
                )}
                <View style={styles.topicTextContainer}>
                  <Text style={[
                    styles.topicTitle,
                    isMainTopic && styles.mainTopicTitle,
                    isModule && styles.moduleTitle,
                    isSubtopic && styles.subTopicTitle
                  ]}>
                    {isMainTopic ? topic.title.toUpperCase() : isModule ? topic.title : capitalizeFirst(topic.title)}
                  </Text>
                  {topic.isCustom && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>Custom</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.topicActions}>
                <TouchableOpacity
                  onPress={() => handleEditTopic(topic.id, topic.title)}
                  style={styles.actionButton}
                >
                  <Ionicons name="create-outline" size={20} color="#94A3B8" />
                </TouchableOpacity>
                {(isMainTopic || isModule) && (
                  <TouchableOpacity
                    onPress={() => handleAddTopic(topic.id)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={isMainTopic ? "#00F5FF" : "#94A3B8"} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleDeleteTopic(topic.id)}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF006E" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
        {hasChildren && isExpanded && childTopics.map(child => renderTopic(child, level + 1))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.subjectIconContainer}>
                <Ionicons name="book" size={24} color="#00F5FF" />
              </View>
              <Text style={styles.title}>{subject.subjectName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Help Banner */}
          {showHelp && (
            <View style={styles.helpBanner}>
              <View style={styles.helpContent}>
                <Ionicons name="information-circle" size={24} color="#00F5FF" />
                <View style={styles.helpTextContainer}>
                  <Text style={styles.helpTitle}>Customize Your Topics 📚</Text>
                  <Text style={styles.helpText}>
                    ✏️ Rename topics you're studying{'\n'}
                    🗑️ Remove topics you don't need{'\n'}
                    ➕ Add custom topics{'\n'}
                    📋 <Text style={styles.helpBold}>BOLD CAPS</Text> = Main Topics, <Text style={styles.helpBold}>Bold</Text> = Modules, Regular = Subtopics
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowHelp(false)}
                style={styles.helpClose}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {!showHelp && (
            <TouchableOpacity
              style={styles.showHelpButton}
              onPress={() => setShowHelp(true)}
            >
              <Ionicons name="help-circle-outline" size={20} color="#00F5FF" />
              <Text style={styles.showHelpText}>Show help</Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#00F5FF" />
              <Text style={styles.loadingText}>Loading topics...</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.topicsList} showsVerticalScrollIndicator={false}>
                {topics.filter(t => !t.parentId && !t.isDeleted).length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="folder-open-outline" size={64} color="#64748B" />
                    <Text style={styles.emptyStateTitle}>No topics yet</Text>
                    <Text style={styles.emptyStateText}>
                      Add your first topic to get started
                    </Text>
                  </View>
                ) : (
                  topics.filter(t => !t.parentId && !t.isDeleted).map(topic => renderTopic(topic))
                )}
                
                {addingTopic && !addingToParent && (
                  <View style={styles.addTopicContainer}>
                    <Ionicons name="add-circle" size={24} color="#00F5FF" />
                    <TextInput
                      style={styles.addTopicInput}
                      placeholder="Enter new topic name..."
                      placeholderTextColor="#64748B"
                      value={newTopicText}
                      onChangeText={setNewTopicText}
                      autoFocus
                    />
                    <TouchableOpacity 
                      onPress={handleSaveNewTopic}
                      style={styles.iconButton}
                    >
                      <Ionicons name="checkmark-circle" size={28} color="#00F5FF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setAddingTopic(false)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="close-circle" size={28} color="#FF006E" />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.addMainTopicButton}
                  onPress={() => handleAddTopic(null)}
                >
                  <Ionicons name="add-circle" size={22} color="#00F5FF" />
                  <Text style={styles.addMainTopicText}>Add Main Topic</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveTopics}
                >
                  <Text style={styles.saveButtonText}>Save Topics →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0a0f1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    paddingTop: 20,
    ...(Platform.OS === 'web' && {
      backgroundImage: `
        linear-gradient(rgba(0, 245, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 245, 255, 0.02) 1px, transparent 1px)
      `,
      backgroundSize: '30px 30px',
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectIconContainer: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 12,
    padding: 8,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  helpBanner: {
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  helpContent: {
    flexDirection: 'row',
  },
  helpTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00F5FF',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  helpBold: {
    fontWeight: 'bold',
    color: '#E2E8F0',
  },
  helpClose: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  showHelpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
  },
  showHelpText: {
    color: '#00F5FF',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
  topicsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  mainTopicItem: {
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  moduleItem: {
    backgroundColor: 'rgba(255, 0, 110, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 110, 0.15)',
  },
  subTopicItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  topicLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandButton: {
    marginRight: 8,
    padding: 4,
  },
  topicTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicTitle: {
    flex: 1,
  },
  mainTopicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
    letterSpacing: 0.3,
  },
  subTopicTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#94A3B8',
  },
  customBadge: {
    backgroundColor: 'rgba(255, 0, 110, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  customBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF006E',
  },
  topicActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  iconButton: {
    padding: 4,
  },
  editingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: '#E2E8F0',
    borderBottomWidth: 2,
    borderBottomColor: '#00F5FF',
    paddingVertical: 4,
    marginRight: 8,
  },
  editInputMain: {
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  editInputModule: {
    fontSize: 16,
    fontWeight: '600',
  },
  addTopicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addTopicInput: {
    flex: 1,
    fontSize: 16,
    color: '#E2E8F0',
    paddingVertical: 4,
    marginLeft: 12,
    marginRight: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  addMainTopicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
  },
  addMainTopicText: {
    fontSize: 16,
    color: '#00F5FF',
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#00F5FF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 20px rgba(0, 245, 255, 0.6)',
    } : {
      shadowColor: '#00F5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 8,
    }),
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a0f1e',
    letterSpacing: 0.5,
  },
});
