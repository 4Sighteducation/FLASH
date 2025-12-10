import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { abbreviateTopicName } from '../utils/topicNameUtils';
import RevealContextTutorial from './RevealContextTutorial';
import { TopicNameEnhancementService } from '../services/topicNameEnhancement';

const { width: screenWidth } = Dimensions.get('window');
const IS_MOBILE = screenWidth < 768;

interface Topic {
  id: string;
  name: string;
  level: number;
  card_count: number;
  has_cards: boolean;
  parent_id?: string;
  full_path?: string[];
}

interface TopicContext {
  current_topic: Topic;
  siblings: Topic[];
  children: Topic[];
  parent: Topic | null;
  grandparent: Topic | null;
}

interface TopicContextModalProps {
  visible: boolean;
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  examBoard: string;
  examType: string;
  onClose: () => void;
  onCreateCards: (topicId: string, topicName: string, isOverview: boolean, childrenTopics?: string[]) => void;
  onStudyTopic: (topicId: string, topicName: string) => void;
  onDiscoverMore?: () => void;
}

export default function TopicContextModal({
  visible,
  topicId,
  topicName,
  subjectId,
  subjectName,
  subjectColor,
  examBoard,
  examType,
  onClose,
  onCreateCards,
  onStudyTopic,
  onDiscoverMore,
}: TopicContextModalProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<TopicContext | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([topicId]));
  const [generating, setGenerating] = useState<string | null>(null); // Topic being generated
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHelpButton, setShowHelpButton] = useState(false);

  useEffect(() => {
    if (visible && topicId) {
      fetchContext();
      checkTutorialStatus();
    }
  }, [visible, topicId]);

  const checkTutorialStatus = async () => {
    try {
      // Check if user has seen tutorial before
      const { data, error } = await supabase
        .from('users')
        .select('has_seen_reveal_context_tutorial')
        .eq('id', user?.id)
        .single();

      if (!error && data) {
        const hasSeenTutorial = data.has_seen_reveal_context_tutorial || false;
        setShowHelpButton(hasSeenTutorial); // Show help button if they've seen it
        
        if (!hasSeenTutorial) {
          // First time - show tutorial after context loads
          setShowTutorial(true);
        }
      }
    } catch (error) {
      console.log('Tutorial status check failed (non-critical):', error);
      // If check fails, don't show tutorial to avoid annoying users
      setShowHelpButton(true);
    }
  };

  const handleTutorialComplete = async () => {
    setShowTutorial(false);
    setShowHelpButton(true);
    
    // Mark tutorial as seen
    try {
      await supabase
        .from('users')
        .update({ has_seen_reveal_context_tutorial: true })
        .eq('id', user?.id);
    } catch (error) {
      console.log('Could not save tutorial status (non-critical):', error);
    }
  };

  const handleShowTutorialAgain = () => {
    setShowTutorial(true);
  };

  const fetchContext = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_topic_context', {
        p_topic_id: topicId,
        p_user_id: user?.id,
      });

      if (error) throw error;
      
      if (data) {
        setContext(data as TopicContext);
        // Auto-expand current topic's parent
        if (data.parent) {
          setExpandedSections(new Set([topicId, data.parent.id]));
        }

        // Auto-enhance poor topic names in background
        enhancePoorNamesInContext(data);
      }
    } catch (error) {
      console.error('Error fetching topic context:', error);
    } finally {
      setLoading(false);
    }
  };

  const enhancePoorNamesInContext = async (contextData: TopicContext) => {
    // Collect all topics that might need enhancement
    const topicsToCheck: any[] = [
      contextData.current_topic,
      ...(contextData.siblings || []),
      ...(contextData.children || []),
    ].filter(t => t && TopicNameEnhancementService.needsEnhancement(t.name));

    if (topicsToCheck.length === 0) return;

    console.log(`🔄 Enhancing ${topicsToCheck.length} poor topic names...`);

    // Enhance each topic in background (don't block UI)
    topicsToCheck.forEach(async (topic) => {
      const enhancedName = await TopicNameEnhancementService.enhanceTopicName({
        topicId: topic.id,
        topicName: topic.name,
        subjectName,
        parentName: contextData.parent?.name,
        grandparentName: contextData.grandparent?.name,
        siblings: contextData.siblings?.map(s => s.name) || [],
      });

      // Refresh context after enhancement completes
      if (enhancedName !== topic.name) {
        setTimeout(() => fetchContext(), 500);
      }
    });
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleQuickCreate = async (topic: Topic, isOverview: boolean = false) => {
    setGenerating(topic.id);
    
    // Fetch children if creating overview cards
    let childrenNames: string[] = [];
    if (isOverview) {
      try {
        const { data: children, error } = await supabase
          .from('curriculum_topics')
          .select('topic_name')
          .eq('parent_topic_id', topic.id);
        
        if (error) throw error;
        childrenNames = children?.map(c => c.topic_name) || [];
      } catch (error) {
        console.error('Error fetching children for overview:', error);
      }
    }
    
    // Small delay to show "Creating..." state, then close modal and navigate
    setTimeout(() => {
      onClose(); // Close modal first for better UX
      
      // Navigate to AI Generator after modal closes
      setTimeout(() => {
        onCreateCards(topic.id, topic.name, isOverview, childrenNames);
        setGenerating(null);
      }, 300);
    }, 500);
  };

  const renderTopicItem = (topic: Topic, type: 'current' | 'sibling' | 'child' | 'parent') => {
    const isActive = topic.has_cards || topic.card_count > 0;
    const isCurrent = type === 'current';
    const isGenerating = generating === topic.id;

    return (
      <View
        key={topic.id}
        style={[
          styles.topicItem,
          isCurrent && styles.topicItemCurrent,
        ]}
      >
        <View style={styles.topicLeft}>
          {/* Status Icon */}
          <View style={[
            styles.statusIcon,
            isActive ? styles.statusActive : styles.statusInactive,
            { borderColor: isActive ? subjectColor : colors.border },
          ]}>
            {isActive ? (
              <Icon name="checkmark" size={18} color={subjectColor} />
            ) : (
              <View style={[styles.statusDot, { backgroundColor: colors.border }]} />
            )}
          </View>

          {/* Topic Info */}
          <View style={styles.topicInfo}>
            <Text 
              style={[
                styles.topicName,
                isActive ? styles.topicNameActive : styles.topicNameInactive,
              ]}
              numberOfLines={2}
            >
              {abbreviateTopicName(topic.name)}
            </Text>
            <Text style={styles.topicMeta}>
              Level {topic.level} • {topic.card_count || 0} cards
            </Text>
          </View>
        </View>

        {/* Action Button */}
        {isGenerating ? (
          <View style={styles.generatingIndicator}>
            <ActivityIndicator size="small" color={subjectColor} />
            <Text style={[styles.generatingText, { color: subjectColor }]}>
              Creating...
            </Text>
          </View>
        ) : isActive ? (
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: subjectColor }]}
            onPress={() => onStudyTopic(topic.id, topic.name)}
          >
            <Icon name="play-circle" size={20} color={subjectColor} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: subjectColor + '20', borderColor: subjectColor }]}
            onPress={() => handleQuickCreate(topic, false)}
          >
            <Icon name="add-circle" size={18} color={subjectColor} />
            <Text style={[styles.createButtonText, { color: subjectColor }]}>
              Create
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSection = (title: string, topics: Topic[], type: 'siblings' | 'children', parentId?: string) => {
    if (!topics || topics.length === 0) return null;

    const isExpanded = parentId ? expandedSections.has(parentId) : true;
    const discoveredCount = topics.filter(t => t.has_cards).length;

    return (
      <View style={styles.section}>
        {parentId && (
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection(parentId)}
          >
            <View style={styles.sectionHeaderLeft}>
              <Icon 
                name={isExpanded ? "chevron-down" : "chevron-forward"} 
                size={20} 
                color={colors.primary} 
              />
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={[styles.progressText, { color: subjectColor }]}>
                {discoveredCount}/{topics.length}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {isExpanded && (
          <View style={styles.sectionContent}>
            {topics.map(topic => renderTopicItem(topic, type))}
          </View>
        )}
      </View>
    );
  };

  if (!context) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <LinearGradient
          colors={[subjectColor, subjectColor + 'CC']}
          style={styles.header}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {showHelpButton && (
            <TouchableOpacity onPress={handleShowTutorialAgain} style={styles.helpButton}>
              <Icon name="help-circle-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>🗺️ Curriculum Map</Text>
            <Text style={styles.headerSubtitle}>{abbreviateTopicName(topicName)}</Text>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={subjectColor} />
            <Text style={styles.loadingText}>Loading context...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Breadcrumb Context */}
            {context.grandparent && (
              <View style={styles.breadcrumbContainer}>
                <Text style={styles.breadcrumbText}>
                  {abbreviateTopicName(context.grandparent.name)}
                  {context.parent && ` › ${abbreviateTopicName(context.parent.name)}`}
                </Text>
              </View>
            )}

            {/* Current Topic */}
            <View style={styles.currentSection}>
              <Text style={styles.youAreHereLabel}>📍 YOU ARE HERE</Text>
              {renderTopicItem(context.current_topic, 'current')}
            </View>

            {/* Children (Drill Down) */}
            {context.children && context.children.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>↓ Subtopics (More Specific)</Text>
                {renderSection('', context.children, 'children')}
              </>
            )}

            {/* Siblings (Same Level) */}
            {context.siblings && context.siblings.length > 0 && context.parent && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>
                  ↔️ Related Topics ({abbreviateTopicName(context.parent.name)})
                </Text>
                {renderSection(
                  abbreviateTopicName(context.parent.name),
                  context.siblings,
                  'siblings',
                  context.parent.id
                )}

                {/* Parent Overview Option */}
                {context.parent && (
                  <TouchableOpacity
                    style={[styles.overviewButton, { borderColor: subjectColor }]}
                    onPress={() => handleQuickCreate(context.parent!, true)}
                    disabled={generating === context.parent.id}
                  >
                    <Icon name="layers" size={24} color={subjectColor} />
                    <View style={styles.overviewButtonText}>
                      <Text style={[styles.overviewTitle, { color: subjectColor }]}>
                        Generate Overview Cards
                      </Text>
                      <Text style={styles.overviewSubtitle}>
                        Big picture: Compare all {context.siblings.length + 1} topics
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* No Siblings/Children - Suggest Inspiration */}
            {(!context.siblings || context.siblings.length === 0) && 
             (!context.children || context.children.length === 0) && (
              <>
                <View style={styles.divider} />
                <View style={styles.inspirationSection}>
                  <Text style={[styles.inspirationLabel, { color: colors.textSecondary }]}>
                    This topic doesn't have related siblings yet.
                  </Text>
                  <TouchableOpacity
                    style={[styles.inspirationButton, { borderColor: subjectColor }]}
                    onPress={() => {
                      onClose();
                      // Navigate to discovery
                      if (onDiscoverMore) {
                        setTimeout(() => onDiscoverMore(), 300);
                      }
                    }}
                  >
                    <Icon name="bulb-outline" size={24} color={subjectColor} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inspirationTitle, { color: subjectColor }]}>
                        💡 Looking for Inspiration?
                      </Text>
                      <Text style={styles.inspirationSubtitle}>
                        Discover related topics from {subjectName}
                      </Text>
                    </View>
                    <Icon name="arrow-forward" size={20} color={subjectColor} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Explore Broader */}
            {context.grandparent && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={[styles.exploreButton, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    // TODO: Show parent's siblings (uncles/aunts)
                  }}
                >
                  <Icon name="git-network" size={24} color={colors.primary} />
                  <Text style={styles.exploreText}>
                    Explore Related Sections
                  </Text>
                  <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}

            {/* Bottom padding */}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* Creating Overlay */}
        {generating && (
          <View style={styles.creatingOverlay}>
            <View style={[styles.creatingCard, { backgroundColor: colors.surface }]}>
              <ActivityIndicator size="large" color={subjectColor} />
              <Text style={[styles.creatingTitle, { color: colors.text }]}>
                Creating Cards...
              </Text>
              <Text style={[styles.creatingSubtitle, { color: colors.textSecondary }]}>
                Generating your flashcards
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Tutorial */}
      <RevealContextTutorial
        visible={showTutorial}
        onComplete={handleTutorialComplete}
        subjectColor={subjectColor}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButton: {
    position: 'absolute',
    top: IS_MOBILE ? 12 : 16,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  helpButton: {
    position: 'absolute',
    top: IS_MOBILE ? 12 : 16,
    right: 70,
    padding: 8,
    zIndex: 10,
  },
  headerContent: {
    marginTop: IS_MOBILE ? 0 : 8,
  },
  headerTitle: {
    fontSize: IS_MOBILE ? 20 : 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: IS_MOBILE ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  breadcrumbContainer: {
    padding: 16,
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.1)',
  },
  breadcrumbText: {
    fontSize: 13,
    color: '#00F5FF',
    fontWeight: '500',
  },
  currentSection: {
    padding: 20,
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderLeftWidth: 4,
    borderLeftColor: '#00F5FF',
  },
  youAreHereLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00F5FF',
    marginBottom: 12,
    letterSpacing: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00F5FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  section: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  progressBadge: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topicItemCurrent: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderColor: '#00F5FF',
    borderWidth: 2,
  },
  topicLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
  },
  statusInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  topicInfo: {
    flex: 1,
  },
  topicName: {
    fontSize: IS_MOBILE ? 15 : 16,
    marginBottom: 4,
  },
  topicNameActive: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  topicNameInactive: {
    fontWeight: '500',
    color: '#9CA3B8',
  },
  topicMeta: {
    fontSize: 12,
    color: '#666',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  generatingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  generatingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  overviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    gap: 16,
  },
  overviewButtonText: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 13,
    color: '#9CA3B8',
  },
  inspirationSection: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  inspirationLabel: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  inspirationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    gap: 12,
  },
  inspirationTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  inspirationSubtitle: {
    fontSize: 13,
    color: '#9CA3B8',
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  exploreText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    marginVertical: 16,
    marginHorizontal: 20,
  },
  creatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  creatingCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  creatingTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
  },
  creatingSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});


