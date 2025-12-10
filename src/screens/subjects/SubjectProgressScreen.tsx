import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import Icon from '../../components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { abbreviateTopicName } from '../../utils/topicNameUtils';
import TopicContextModal from '../../components/TopicContextModal';

interface DiscoveredTopic {
  id?: string;
  topic_id: string;
  topic_name: string;
  topic_level: number;
  parent_topic_id?: string;
  parent_name?: string;
  grandparent_name?: string;
  great_grandparent_name?: string;
  card_count: number;
  cards_mastered: number;
  is_newly_discovered?: boolean;
  last_studied?: string;
  // Legacy support
  full_path?: string[];
}

interface TopicGroup {
  level1: string;
  level2?: string;
  topics: DiscoveredTopic[];
}

interface SubjectProgressScreenProps {
  route: {
    params: {
      subjectId: string;
      subjectName: string;
      subjectColor: string;
      examBoard: string;
      examType: string;
    };
  };
  navigation: any;
}

export default function SubjectProgressScreen({ route, navigation }: SubjectProgressScreenProps) {
  const { subjectId, subjectName, subjectColor, examBoard, examType } = route.params;
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const safeSubjectColor = subjectColor || '#6366F1'; // Fallback color if null
  const styles = createStyles(colors, theme, safeSubjectColor);

  const [loading, setLoading] = useState(true);
  const [discoveredTopics, setDiscoveredTopics] = useState<DiscoveredTopic[]>([]);
  const [groupedTopics, setGroupedTopics] = useState<TopicGroup[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [stats, setStats] = useState({
    totalCards: 0,
    topicsDiscovered: 0,
    cardsMastered: 0,
  });
  const [showTopicOptions, setShowTopicOptions] = useState<DiscoveredTopic | null>(null);
  const [showContextModal, setShowContextModal] = useState<DiscoveredTopic | null>(null);

  useEffect(() => {
    fetchDiscoveredTopics();
  }, []);

  const fetchDiscoveredTopics = async () => {
    try {
      setLoading(true);

      // Fetch discovered topics with hierarchy built from parent relationships
      const { data: topics, error } = await supabase
        .rpc('get_user_topics_with_hierarchy', {
          p_user_id: user?.id,
          p_subject_name: subjectName,
        });

      if (error) {
        console.error('Error from RPC:', error);
        // Fallback to simple query if RPC not available
        // Fallback: Simple query if RPC fails
        const { data: fallbackTopics, error: fallbackError } = await supabase
          .from('flashcards')
          .select('topic_id, subject_name')
          .eq('user_id', user?.id);
        
        if (!fallbackError && fallbackTopics) {
          // Get unique topic IDs
          const topicIds = [...new Set(fallbackTopics.map(f => f.topic_id))];
          
          // Fetch full topic details with hierarchy
          const { data: topicDetails, error: detailsError } = await supabase
            .from('curriculum_topics')
            .select(`
              id,
              topic_name,
              display_name,
              topic_level,
              parent_topic_id,
              parent:curriculum_topics!parent_topic_id(
                topic_name,
                display_name,
                parent:curriculum_topics!parent_topic_id(
                  topic_name,
                  display_name,
                  parent:curriculum_topics!parent_topic_id(topic_name, display_name)
                )
              )
            `)
            .in('id', topicIds);
          
          if (!detailsError && topicDetails) {
            // Count cards per topic
            const cardCounts = new Map();
            fallbackTopics.forEach(f => {
              cardCounts.set(f.topic_id, (cardCounts.get(f.topic_id) || 0) + 1);
            });
            
            // Transform to match expected format
            const transformedTopics = topicDetails.map(t => ({
              topic_id: t.id,
              topic_name: t.display_name || t.topic_name,
              topic_level: t.topic_level,
              parent_topic_id: t.parent_topic_id,
              parent_name: t.parent?.display_name || t.parent?.topic_name || null,
              grandparent_name: t.parent?.parent?.display_name || t.parent?.parent?.topic_name || null,
              great_grandparent_name: t.parent?.parent?.parent?.display_name || t.parent?.parent?.parent?.topic_name || null,
              card_count: cardCounts.get(t.id) || 0,
              cards_mastered: 0,
            }));
            
            setDiscoveredTopics(transformedTopics as any);
          
          // Calculate stats
          const totalCards = transformedTopics.reduce((sum, t) => sum + (t.card_count || 0), 0);
          const cardsMastered = transformedTopics.reduce((sum, t) => sum + (t.cards_mastered || 0), 0);
          
          setStats({
            totalCards,
            topicsDiscovered: transformedTopics.length,
            cardsMastered,
          });

          // Group topics by parent
          const grouped = groupTopicsByHierarchy(transformedTopics as any);
          setGroupedTopics(grouped);
          
          if (grouped.length > 0) {
            setExpandedSections(new Set([grouped[0].level1]));
          }
        }
        return;
      }

      if (topics && topics.length > 0) {
        setDiscoveredTopics(topics);
        
        // Calculate stats
        const totalCards = topics.reduce((sum, t) => sum + (t.card_count || 0), 0);
        const cardsMastered = topics.reduce((sum, t) => sum + (t.cards_mastered || 0), 0);
        
        setStats({
          totalCards,
          topicsDiscovered: topics.length,
          cardsMastered,
        });

        // Group topics by parent name
        const grouped = groupTopicsByHierarchy(topics);
        setGroupedTopics(grouped);
        
        // Expand first section by default
        if (grouped.length > 0) {
          setExpandedSections(new Set([grouped[0].level1]));
        }
      }

      // Fetch completion percentage
      const { data: completion, error: completionError } = await supabase
        .rpc('calculate_subject_completion', {
          p_user_id: user?.id,
          p_subject_id: subjectId,
        });

      if (!completionError && completion !== null) {
        setCompletionPercentage(Math.round(completion));
      }

    } catch (error) {
      console.error('Error fetching discovered topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupTopicsByHierarchy = (topics: any[]): TopicGroup[] => {
    const groups: { [key: string]: TopicGroup } = {};

    topics.forEach((topic) => {
      // Build hierarchy with proper Level 0 parent:
      // Level 0: great_grandparent_name (e.g., "Physical Chemistry")
      // Level 1: grandparent_name (e.g., "Atomic Structure")
      // Level 2: parent_name (e.g., "Fundamental Particles")
      // Level 3+: topic itself (the cards)
      
      let level0Parent: string; // The root parent (collapsible section header)
      let level1Section: string | undefined; // Sub-section (optional second level)
      
      if (topic.topic_level >= 3) {
        // Level 3+ topics: Use great-grandparent as Level 0
        if (topic.great_grandparent_name) {
          level0Parent = topic.great_grandparent_name; // e.g., "Physical Chemistry"
          level1Section = topic.grandparent_name;      // e.g., "Atomic Structure"
        } else if (topic.grandparent_name) {
          // No great-grandparent, use grandparent as Level 0
          level0Parent = topic.grandparent_name;
          level1Section = topic.parent_name;
        } else {
          // Fallback
          level0Parent = topic.parent_name || topic.topic_name || 'Other Topics';
          level1Section = undefined;
        }
      } else if (topic.topic_level === 2) {
        // Level 2 topics: Use grandparent as Level 0
        level0Parent = topic.grandparent_name || topic.parent_name || topic.topic_name;
        level1Section = topic.grandparent_name ? topic.parent_name : undefined;
      } else if (topic.topic_level === 1) {
        // Level 1 topics: Use parent as Level 0
        level0Parent = topic.parent_name || topic.topic_name;
        level1Section = undefined;
      } else {
        // Fallback for orphan topics
        level0Parent = topic.topic_name || 'Other Topics';
        level1Section = undefined;
      }
      
      const groupKey = level1Section ? `${level0Parent}::${level1Section}` : level0Parent;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          level1: level0Parent,      // Level 0 parent name (e.g., "Physical Chemistry")
          level2: level1Section,     // Level 1 section name (e.g., "Atomic Structure")
          topics: [],
        };
      }

      groups[groupKey].topics.push(topic);
    });

    // Sort groups by Level 0 parent name
    const groupArray = Object.values(groups);
    groupArray.sort((a, b) => a.level1.localeCompare(b.level1));

    return groupArray;
  };

  const toggleSection = (level1: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(level1)) {
      newExpanded.delete(level1);
    } else {
      newExpanded.add(level1);
    }
    setExpandedSections(newExpanded);
  };

  const handleTopicPress = (topic: DiscoveredTopic) => {
    // Show options menu instead of directly studying
    setShowTopicOptions(topic);
  };
  
  const handleStudyTopic = () => {
    if (!showTopicOptions) return;
    setShowTopicOptions(null);
    navigation.navigate('StudyModal', {
      topicName: showTopicOptions.topic_name,
      subjectName: subjectName,
      subjectColor: safeSubjectColor,
      topicId: showTopicOptions.topic_id,
    });
  };
  
  const handleDiscoverRelated = () => {
    if (!showTopicOptions) return;
    setShowTopicOptions(null);
    // Navigate to SmartTopicDiscovery with pre-filled search
    navigation.navigate('SmartTopicDiscovery', {
      subjectId,
      subjectName,
      subjectColor: safeSubjectColor,
      examBoard,
      examType,
      initialSearch: showTopicOptions.parent_name || showTopicOptions.topic_name, // Parent topic or self
    });
  };
  
  const handleRevealContext = () => {
    if (!showTopicOptions) return;
    // Show the context modal for revealing curriculum structure
    setShowContextModal(showTopicOptions);
    setShowTopicOptions(null);
  };
  
  const handleCreateCardsFromContext = (topicId: string, topicName: string, isOverview: boolean, childrenTopics?: string[]) => {
    // Navigate to AI Generator for card creation
    navigation.navigate('AIGenerator', {
      topicId,
      topic: topicName, // AIGenerator expects 'topic' not 'topicName'
      subject: subjectName, // AIGenerator expects 'subject' not 'subjectName'
      subjectId,
      subjectName,
      subjectColor: safeSubjectColor,
      examBoard,
      examType,
      isOverviewCard: isOverview,
      childrenTopics: childrenTopics || [],
    });
  };
  
  const handleStudyTopicFromContext = (topicId: string, topicName: string) => {
    setShowContextModal(null);
    navigation.navigate('StudyModal', {
      topicName,
      subjectName,
      subjectColor: safeSubjectColor,
      topicId,
    });
  };

  const handleCreateOverviewForParent = async (group: TopicGroup) => {
    // Create overview cards for the Level 0 parent topic
    // Get all child topic names for context
    const childrenNames = group.topics.map(t => t.topic_name);
    
    // Find the parent topic ID - use first topic's parent_topic_id
    const firstTopic = group.topics[0];
    if (!firstTopic || !firstTopic.parent_topic_id) {
      Alert.alert('Error', 'Could not find parent topic information');
      return;
    }

    // Fetch the parent topic details
    const { data: parentTopic, error } = await supabase
      .from('curriculum_topics')
      .select('id, topic_name, topic_level')
      .eq('id', firstTopic.parent_topic_id)
      .single();

    if (error || !parentTopic) {
      Alert.alert('Error', 'Could not load parent topic details');
      return;
    }

    // Navigate to AI Generator with overview flag
    navigation.navigate('AIGenerator', {
      topicId: parentTopic.id,
      topic: parentTopic.topic_name,
      subject: subjectName,
      subjectId,
      subjectName,
      subjectColor: safeSubjectColor,
      examBoard,
      examType,
      isOverviewCard: true,
      childrenTopics: childrenNames,
    });
  };

  const handleDiscoverMore = () => {
    navigation.navigate('SmartTopicDiscovery', {
      subjectId,
      subjectName,
      subjectColor,
      examBoard,
      examType,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={subjectColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme === 'cyber' ? colors.text : '#333'} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{subjectName}</Text>
          <Text style={styles.headerSubtitle}>{examBoard} • {examType.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Progress Card */}
        <LinearGradient
          colors={[safeSubjectColor, adjustColor(safeSubjectColor, -30)]}
          style={styles.progressCard}
        >
          <View style={styles.progressContent}>
            {/* Completion Ring */}
            <View style={styles.completionRingContainer}>
              <View style={styles.completionRing}>
                <Text style={styles.completionPercentage}>{completionPercentage}%</Text>
                <Text style={styles.completionLabel}>Complete</Text>
              </View>
              {/* SVG ring would go here - simplified for now */}
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.topicsDiscovered}</Text>
                <Text style={styles.statLabel}>Topics</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalCards}</Text>
                <Text style={styles.statLabel}>Cards</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.cardsMastered}</Text>
                <Text style={styles.statLabel}>Mastered</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Empty State */}
        {discoveredTopics.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="telescope-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Start Your Journey!</Text>
            <Text style={styles.emptyText}>
              You haven't created any cards for {subjectName} yet.
            </Text>
            <Text style={styles.emptyText}>
              Search for topics you're studying and create flashcards to build your knowledge base.
            </Text>
            <TouchableOpacity style={[styles.discoverButton, { backgroundColor: safeSubjectColor }]} onPress={handleDiscoverMore}>
              <Icon name="search" size={20} color="#fff" />
              <Text style={styles.discoverButtonText}>Discover Topics</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Topic Tree */}
            <View style={styles.topicsSection}>
              <Text style={styles.sectionTitle}>Your Discovered Topics</Text>
              
              {groupedTopics.map((group, idx) => {
                const isExpanded = expandedSections.has(group.level1);
                const cardCount = group.topics.reduce((sum, t) => sum + (t.card_count || 0), 0);

                return (
                  <View key={idx} style={styles.topicGroup}>
                    {/* Level 1 Header */}
                    <TouchableOpacity
                      style={styles.groupHeader}
                      onPress={() => toggleSection(group.level1)}
                    >
                      <View style={styles.groupHeaderLeft}>
                        <Icon
                          name={isExpanded ? "folder-open" : "folder"}
                          size={24}
                          color={safeSubjectColor}
                        />
                        <View style={styles.groupHeaderText}>
                          <Text style={styles.groupTitle}>{group.level1}</Text>
                          {group.level2 && (
                            <Text style={styles.groupSubtitle}>{group.level2}</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.groupHeaderRight}>
                        <View style={styles.cardCountBadge}>
                          <Text style={styles.cardCountText}>{cardCount}</Text>
                          <Icon name="albums" size={14} color={safeSubjectColor} />
                        </View>
                        <Icon
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={20}
                          color="#666"
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Overview Cards Button - Create cards for Level 0 parent */}
                    {isExpanded && (
                      <TouchableOpacity
                        style={[styles.overviewButton, { borderColor: safeSubjectColor }]}
                        onPress={() => handleCreateOverviewForParent(group)}
                      >
                        <Icon name="layers-outline" size={20} color={safeSubjectColor} />
                        <View style={styles.overviewButtonContent}>
                          <Text style={[styles.overviewButtonTitle, { color: safeSubjectColor }]}>
                            💡 Create Overview Cards
                          </Text>
                          <Text style={styles.overviewButtonSubtitle}>
                            Compare all {group.topics.length} topics in this section
                          </Text>
                        </View>
                        <Icon name="arrow-forward" size={18} color={safeSubjectColor} />
                      </TouchableOpacity>
                    )}

                    {/* Expanded Topics */}
                    {isExpanded && (
                      <View style={styles.topicsList}>
                        {group.topics.map((topic) => {
                          // Generate subtle shade variation for visual differentiation
                          const topicIds = group.topics.map(t => t.topic_id);
                          const topicShade = getTopicShade(topic.topic_id, safeSubjectColor, topicIds);
                          
                          return (
                          <TouchableOpacity
                            key={topic.id}
                            style={styles.topicCard}
                            onPress={() => handleTopicPress(topic)}
                          >
                            <View style={styles.topicCardLeft}>
                              <View style={[styles.levelIndicator, { backgroundColor: topicShade }]}>
                                <Text style={styles.levelText}>L{topic.topic_level}</Text>
                              </View>
                              <View style={styles.topicInfo}>
                                <Text style={styles.topicName} numberOfLines={2}>
                                  {abbreviateTopicName(topic.topic_name)}
                                </Text>
                                <View style={styles.topicMeta}>
                                  <Text style={styles.topicMetaText}>
                                    {topic.card_count} cards
                                  </Text>
                                  {topic.cards_mastered > 0 && (
                                    <>
                                      <Text style={styles.topicMetaDivider}>•</Text>
                                      <Text style={styles.topicMetaTextMastered}>
                                        {topic.cards_mastered} mastered
                                      </Text>
                                    </>
                                  )}
                                </View>
                              </View>
                            </View>
                            {topic.is_newly_discovered && (
                              <View style={styles.newBadge}>
                                <Text style={styles.newBadgeText}>NEW</Text>
                              </View>
                            )}
                            <Icon name="chevron-forward" size={20} color="#999" />
                          </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Discover More CTA */}
            <TouchableOpacity
              style={styles.discoverMoreButton}
              onPress={handleDiscoverMore}
            >
              <Icon name="add-circle" size={24} color={safeSubjectColor} />
              <Text style={[styles.discoverMoreText, { color: safeSubjectColor }]}>
                Discover More Topics
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      
      {/* Topic Options Modal */}
      <Modal
        visible={showTopicOptions !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTopicOptions(null)}
      >
        <TouchableOpacity 
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setShowTopicOptions(null)}
        >
          <View style={styles.optionsCard}>
            <Text style={styles.optionsTitle}>
              {showTopicOptions?.topic_name}
            </Text>
            <Text style={styles.optionsSubtitle}>
              {showTopicOptions?.card_count} cards created
            </Text>
            
            <TouchableOpacity
              style={[styles.optionButton, styles.optionPrimary]}
              onPress={handleStudyTopic}
            >
              <Icon name="play-circle" size={24} color="#fff" />
              <Text style={styles.optionButtonText}>Study These Cards</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.optionButton, styles.optionSecondary]}
              onPress={handleRevealContext}
            >
              <Icon name="git-network" size={24} color={safeSubjectColor} />
              <Text style={[styles.optionButtonTextSecondary, { color: safeSubjectColor }]}>
                Reveal Context
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.optionButton, styles.optionSecondary]}
              onPress={handleDiscoverRelated}
            >
              <Icon name="search" size={24} color={safeSubjectColor} />
              <Text style={[styles.optionButtonTextSecondary, { color: safeSubjectColor }]}>
                Add More Topics
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.optionCancel}
              onPress={() => setShowTopicOptions(null)}
            >
              <Text style={styles.optionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Topic Context Modal */}
      {showContextModal && (
        <TopicContextModal
          visible={!!showContextModal}
          topicId={showContextModal.topic_id}
          topicName={showContextModal.topic_name}
          subjectId={subjectId}
          subjectName={subjectName}
          subjectColor={safeSubjectColor}
          examBoard={examBoard}
          examType={examType}
          onClose={() => setShowContextModal(null)}
          onCreateCards={handleCreateCardsFromContext}
          onStudyTopic={handleStudyTopicFromContext}
          onDiscoverMore={handleDiscoverMore}
        />
      )}
    </SafeAreaView>
  );
}

const adjustColor = (color: string | null | undefined, amount: number): string => {
  if (!color) return '#6366F1'; // Default fallback color
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Generate subtle shade variation for topics with similar names
// Uses topic_id hash to ensure consistency but differentiation
const getTopicShade = (topicId: string, baseColor: string, allTopicIds: string[]): string => {
  // Hash the topic ID to get a consistent number
  const hash = topicId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  
  // Get index in the list for relative variation
  const index = allTopicIds.indexOf(topicId);
  const totalTopics = allTopicIds.length;
  
  // Calculate subtle variation (±20 per topic, max ±40)
  const variation = ((index % 3) - 1) * 20; // -20, 0, or +20
  
  return adjustColor(baseColor, variation);
};

const createStyles = (colors: any, theme: string, subjectColor: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme === 'cyber' ? colors.background : '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme === 'cyber' ? colors.surface : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme === 'cyber' ? colors.border : '#e0e0e0',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme === 'cyber' ? colors.text : '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme === 'cyber' ? colors.textSecondary : '#666',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  progressCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completionRingContainer: {
    marginRight: 20,
  },
  completionRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionPercentage: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  completionLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    margin: 16,
    backgroundColor: theme === 'cyber' ? colors.surface : '#fff',
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme === 'cyber' ? colors.text : '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: theme === 'cyber' ? colors.textSecondary : '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
    gap: 8,
  },
  discoverButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topicsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme === 'cyber' ? colors.text : '#333',
    marginBottom: 12,
  },
  topicGroup: {
    marginBottom: 8,
    backgroundColor: theme === 'cyber' ? colors.surface : '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme === 'cyber' ? colors.surface : '#fff',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'cyber' ? colors.text : '#333',
  },
  groupSubtitle: {
    fontSize: 14,
    color: theme === 'cyber' ? colors.textSecondary : '#666',
    marginTop: 2,
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'cyber' ? 'rgba(0, 212, 255, 0.1)' : '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  cardCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: subjectColor || '#6366F1',
  },
  topicsList: {
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: theme === 'cyber' ? 'rgba(0, 0, 0, 0.2)' : '#f9f9f9',
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    backgroundColor: theme === 'cyber' ? colors.surface : '#fff',
    borderRadius: 8,
  },
  topicCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  levelIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  levelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  topicInfo: {
    flex: 1,
  },
  topicName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme === 'cyber' ? colors.text : '#333',
  },
  topicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  topicMetaText: {
    fontSize: 12,
    color: theme === 'cyber' ? colors.textSecondary : '#666',
  },
  topicMetaDivider: {
    fontSize: 12,
    color: theme === 'cyber' ? colors.textSecondary : '#999',
    marginHorizontal: 6,
  },
  topicMetaTextMastered: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  newBadge: {
    backgroundColor: '#00D4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  discoverMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: theme === 'cyber' ? colors.surface : '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: subjectColor || '#6366F1',
    borderStyle: 'dashed',
  },
  discoverMoreText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  optionsCard: {
    backgroundColor: theme === 'cyber' ? colors.surface : '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...( theme === 'cyber' && {
      borderWidth: 1,
      borderColor: colors.border,
    }),
  },
  optionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme === 'cyber' ? colors.text : '#333',
    marginBottom: 8,
  },
  optionsSubtitle: {
    fontSize: 14,
    color: theme === 'cyber' ? colors.textSecondary : '#666',
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  optionPrimary: {
    backgroundColor: subjectColor || '#6366F1',
  },
  optionSecondary: {
    backgroundColor: theme === 'cyber' ? 'rgba(0, 0, 0, 0.2)' : '#f5f5f5',
    borderWidth: 2,
    borderColor: subjectColor || '#6366F1',
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  optionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionCancel: {
    padding: 12,
    alignItems: 'center',
  },
  optionCancelText: {
    fontSize: 15,
    color: theme === 'cyber' ? colors.textSecondary : '#666',
  },
  overviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: theme === 'cyber' ? 'rgba(0, 245, 255, 0.05)' : 'rgba(99, 102, 241, 0.05)',
    gap: 12,
  },
  overviewButtonContent: {
    flex: 1,
  },
  overviewButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  overviewButtonSubtitle: {
    fontSize: 12,
    color: theme === 'cyber' ? colors.textSecondary : '#666',
  },
});

