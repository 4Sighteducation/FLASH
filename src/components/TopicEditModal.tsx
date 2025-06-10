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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  useEffect(() => {
    if (visible) {
      loadTopics();
    }
  }, [visible, subject]);

  const loadTopics = async () => {
    try {
      setLoading(true);
      
      // First check if user already has custom topics for this subject
      const { data: customTopics, error: customError } = await supabase
        .from('user_custom_topics')
        .select('*')
        .eq('user_id', user?.id)
        .eq('subject_id', subject.subjectId)
        .order('sort_order');

      if (customError) throw customError;

      if (customTopics && customTopics.length > 0) {
        // User already has custom topics
        setTopics(customTopics.map((t: any) => ({
          id: t.id,
          title: t.title,
          parentId: t.parent_topic_id,
          isCustom: t.is_custom,
          isDeleted: t.is_deleted,
          sortOrder: t.sort_order,
        })));
      } else {
        // Load curriculum topics for this subject
        const { data: curriculumTopics, error: curriculumError } = await supabase
          .from('curriculum_topics')
          .select('*')
          .eq('exam_board_subject_id', subject.subjectId)
          .order('sort_order');

        if (curriculumError) throw curriculumError;

        // Convert to our Topic format
        const formattedTopics = curriculumTopics?.map((t: any, index: number) => ({
          id: t.id,
          title: t.name,
          parentId: t.parent_id,
          isCustom: false,
          sortOrder: index,
        })) || [];

        setTopics(formattedTopics);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      Alert.alert('Error', 'Failed to load topics');
    } finally {
      setLoading(false);
    }
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
    if (topic?.isCustom) {
      // Actually remove custom topics
      setTopics(topics.filter(t => t.id !== topicId && t.parentId !== topicId));
    } else {
      // Mark curriculum topics as deleted
      setTopics(topics.map(t => 
        t.id === topicId ? { ...t, isDeleted: true } : t
      ));
    }
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

    return (
      <View key={topic.id}>
        <View style={[styles.topicItem, { marginLeft: level * 20 }]}>
          {editingTopic === topic.id ? (
            <View style={styles.editingContainer}>
              <TextInput
                style={styles.editInput}
                value={editingText}
                onChangeText={setEditingText}
                autoFocus
              />
              <TouchableOpacity onPress={handleSaveEdit}>
                <Ionicons name="checkmark" size={20} color="#10B981" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingTopic(null)}>
                <Ionicons name="close" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <View style={styles.topicActions}>
                <TouchableOpacity
                  onPress={() => handleEditTopic(topic.id, topic.title)}
                  style={styles.actionButton}
                >
                  <Ionicons name="pencil" size={16} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAddTopic(topic.id)}
                  style={styles.actionButton}
                >
                  <Ionicons name="add" size={16} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteTopic(topic.id)}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
        {childTopics.map(child => renderTopic(child, level + 1))}
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
          <View style={styles.header}>
            <Text style={styles.title}>{subject.subjectName}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6366F1" style={styles.loader} />
          ) : (
            <>
              <ScrollView style={styles.topicsList}>
                {topics.filter(t => !t.parentId && !t.isDeleted).map(topic => renderTopic(topic))}
                
                {addingTopic && !addingToParent && (
                  <View style={styles.addTopicContainer}>
                    <TextInput
                      style={styles.addTopicInput}
                      placeholder="New topic name"
                      value={newTopicText}
                      onChangeText={setNewTopicText}
                      autoFocus
                    />
                    <TouchableOpacity onPress={handleSaveNewTopic}>
                      <Ionicons name="checkmark" size={20} color="#10B981" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setAddingTopic(false)}>
                      <Ionicons name="close" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleAddTopic(null)}
                >
                  <Ionicons name="add-circle" size={20} color="#6366F1" />
                  <Text style={styles.addButtonText}>Add Topic</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveTopics}
                >
                  <Text style={styles.saveButtonText}>Save Topics</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  loader: {
    marginTop: 50,
  },
  topicsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topicTitle: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  topicActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  editingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#6366F1',
    paddingVertical: 4,
  },
  addTopicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addTopicInput: {
    flex: 1,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#6366F1',
    paddingVertical: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },
  addButtonText: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 