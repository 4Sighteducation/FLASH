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
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import Icon from '../../components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { abbreviateTopicName } from '../../utils/topicNameUtils';
import TopicContextModal from '../../components/TopicContextModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateHierarchyPalette, getHierarchyColor } from '../../utils/colorPaletteGenerator';

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
  priority?: number | null;
  // Legacy support
  full_path?: string[];
}

interface TopicGroup {
  level0: string;           // Exam paper (great_grandparent)
  level1: string;           // Main section (grandparent)
  level2?: string;          // Sub-section (parent)
  level3?: string;          // Topic header (for Level 4+ grouping)
  topics: DiscoveredTopic[];
}

// Keep props broad so React Navigation can pass through its own route typing without conflicts.
// (Strict param typing belongs on the navigator's ParamList, not here.)
type SubjectProgressScreenProps = any;

// Priority levels configuration - REVERSED (1 = highest priority!)
const PRIORITY_LEVELS = [
  { value: 1, label: "🔥 Urgent", number: '1', color: '#EF4444', description: 'Top priority! Critical for exams.' }, // Red - #1!
  { value: 2, label: '⚡ High Priority', number: '2', color: '#FF006E', description: 'Important topic - needs focus.' }, // Pink
  { value: 3, label: '📌 Medium Priority', number: '3', color: '#F59E0B', description: 'Useful to know - review when ready.' }, // Orange
  { value: 4, label: '✅ Low Priority', number: '4', color: '#10B981', description: 'Good to know - review occasionally.' }, // Green
];

const getPriorityInfo = (priority: number | null | undefined) => {
  if (!priority) return null;
  return PRIORITY_LEVELS.find(p => p.value === priority);
};

export default function SubjectProgressScreen({ route, navigation }: SubjectProgressScreenProps) {
  const { subjectId, subjectName, subjectColor, examBoard, examType } = route?.params || {};
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const safeSubjectColor = subjectColor || '#6366F1'; // Fallback color if null
  const styles = createStyles(colors, theme, safeSubjectColor);
  
  // Generate color palette for hierarchy
  const colorPalette = generateHierarchyPalette(safeSubjectColor);

  const [loading, setLoading] = useState(true);
  const [discoveredTopics, setDiscoveredTopics] = useState<DiscoveredTopic[]>([]);
  const [groupedTopics, setGroupedTopics] = useState<TopicGroup[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [completionPercentage, setCompletionPercentage] = useState(0);
  
  // Multi-level collapse state (for 4-tier hierarchy)
  const [collapsedL0, setCollapsedL0] = useState<Set<string>>(new Set());
  const [collapsedL1, setCollapsedL1] = useState<Set<string>>(new Set());
  const [collapsedL2, setCollapsedL2] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    totalCards: 0,
    topicsDiscovered: 0,
    cardsMastered: 0,
  });
  const [showTopicOptions, setShowTopicOptions] = useState<DiscoveredTopic | null>(null);
  const [showContextModal, setShowContextModal] = useState<DiscoveredTopic | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null); // null = show all
  const [showPriorityTooltip, setShowPriorityTooltip] = useState<number | null>(null);

  useEffect(() => {
    loadPriorityFilter();
    fetchDiscoveredTopics();
  }, []);

  useEffect(() => {
    if (priorityFilter !== null || priorityFilter === null) {
      savePriorityFilter();
    }
  }, [priorityFilter]);

  const loadPriorityFilter = async () => {
    try {
      const saved = await AsyncStorage.getItem(`priorityFilter_${subjectId}`);
      if (saved) {
        setPriorityFilter(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading priority filter:', error);
    }
  };

  const savePriorityFilter = async () => {
    try {
      await AsyncStorage.setItem(`priorityFilter_${subjectId}`, JSON.stringify(priorityFilter));
    } catch (error) {
      console.error('Error saving priority filter:', error);
    }
  };

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

            // Filter and group topics by parent
            const filteredTopics = filterTopicsByPriority(transformedTopics as any);
            const grouped = groupTopicsByHierarchy(filteredTopics);
            setGroupedTopics(grouped);
            
            if (grouped.length > 0) {
              setExpandedSections(new Set([grouped[0].level1]));
            }
          }
        }
        return;
      }

      if (topics && topics.length > 0) {
        // Fetch priorities for all topics
        const topicIds = topics.map(t => t.topic_id);
        const { data: priorities } = await supabase
          .from('user_topic_priorities')
          .select('topic_id, priority')
          .eq('user_id', user?.id)
          .in('topic_id', topicIds);

        // Merge priorities into topics
        const topicsWithPriorities = topics.map(topic => ({
          ...topic,
          priority: priorities?.find(p => p.topic_id === topic.topic_id)?.priority || null
        }));

        setDiscoveredTopics(topicsWithPriorities);
        
        // Calculate stats
        const totalCards = topicsWithPriorities.reduce((sum, t) => sum + (t.card_count || 0), 0);
        const cardsMastered = topicsWithPriorities.reduce((sum, t) => sum + (t.cards_mastered || 0), 0);
        
        setStats({
          totalCards,
          topicsDiscovered: topicsWithPriorities.length,
          cardsMastered,
        });

        // Filter and group topics by parent name
        const filteredTopics = filterTopicsByPriority(topicsWithPriorities);
        const grouped = groupTopicsByHierarchy(filteredTopics);
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

  const filterTopicsByPriority = (topics: any[]): any[] => {
    if (priorityFilter === null) return topics;
    return topics.filter(t => t.priority === priorityFilter);
  };

  const groupTopicsByHierarchy = (topics: any[]): TopicGroup[] => {
    const groups: { [key: string]: TopicGroup } = {};

    topics.forEach((topic) => {
      // Four-tier progressive discovery hierarchy:
      // Level 0: Exam Paper (great_grandparent) - e.g., "Paper 1: Factors affecting..."
      // Level 1: Main Section (grandparent) - e.g., "Applied anatomy and physiology"
      // Level 2: Sub-section (parent) - e.g., "Musculo-skeletal system"
      // Level 3: Topic Header (for Level 4+) - e.g., "Levers"
      // Level 4-5: Card Topics - e.g., "1st class lever"
      
      const level0 = topic.great_grandparent_name || topic.grandparent_name || topic.parent_name || topic.topic_name || 'Other Topics';
      const level1 = topic.great_grandparent_name ? topic.grandparent_name : (topic.grandparent_name ? topic.parent_name : null);
      const level2 = topic.great_grandparent_name && topic.grandparent_name ? topic.parent_name : null;
      
      // For Level 4+ topics, use parent name as Level 3 grouping header
      const level3 = topic.topic_level >= 4 ? topic.parent_name : null;
      
      // Create composite key for unique grouping
      let groupKey = level0;
      if (level1) groupKey += `||${level1}`;
      if (level2) groupKey += `||${level2}`;
      if (level3) groupKey += `||${level3}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          level0: level0,
          level1: level1 || '',
          level2: level2 || undefined,
          level3: level3 || undefined,
          topics: [],
        };
      }

      groups[groupKey].topics.push(topic);
    });

    // Sort hierarchically: Level 0 > Level 1 > Level 2 > Level 3
    const groupArray = Object.values(groups);
    groupArray.sort((a, b) => {
      if (a.level0 !== b.level0) return a.level0.localeCompare(b.level0);
      if (a.level1 !== b.level1) return a.level1.localeCompare(b.level1);
      if ((a.level2 || '') !== (b.level2 || '')) return (a.level2 || '').localeCompare(b.level2 || '');
      if ((a.level3 || '') !== (b.level3 || '')) return (a.level3 || '').localeCompare(b.level3 || '');
      return 0;
    });

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

  // Toggle functions for each hierarchy level
  const toggleLevel0 = (sectionName: string) => {
    const newCollapsed = new Set(collapsedL0);
    if (newCollapsed.has(sectionName)) {
      newCollapsed.delete(sectionName);
    } else {
      newCollapsed.add(sectionName);
    }
    setCollapsedL0(newCollapsed);
  };

  const toggleLevel1 = (sectionName: string) => {
    const newCollapsed = new Set(collapsedL1);
    if (newCollapsed.has(sectionName)) {
      newCollapsed.delete(sectionName);
    } else {
      newCollapsed.add(sectionName);
    }
    setCollapsedL1(newCollapsed);
  };

  const toggleLevel2 = (sectionName: string) => {
    const newCollapsed = new Set(collapsedL2);
    if (newCollapsed.has(sectionName)) {
      newCollapsed.delete(sectionName);
    } else {
      newCollapsed.add(sectionName);
    }
    setCollapsedL2(newCollapsed);
  };

  // Organize flat groups into hierarchical structure for rendering
  const organizeHierarchy = (groups: TopicGroup[]) => {
    const hierarchy: { [level0: string]: { [level1: string]: { [level2: string]: TopicGroup[] } } } = {};

    groups.forEach(group => {
      if (!hierarchy[group.level0]) hierarchy[group.level0] = {};
      if (!hierarchy[group.level0][group.level1]) hierarchy[group.level0][group.level1] = {};
      if (!hierarchy[group.level0][group.level1][group.level2 || 'direct']) {
        hierarchy[group.level0][group.level1][group.level2 || 'direct'] = [];
      }
      hierarchy[group.level0][group.level1][group.level2 || 'direct'].push(group);
    });

    return hierarchy;
  };

  // Render individual topic card
  const renderTopicCard = (topic: DiscoveredTopic, baseColor: string, group: TopicGroup) => {
    const topicIds = group.topics.map(t => t.topic_id);
    const topicShade = getTopicShade(topic.topic_id, baseColor, topicIds);
    const priorityInfo = getPriorityInfo(topic.priority);

    return (
      <TouchableOpacity
        key={topic.topic_id}
        style={styles.topicCard}
        onPress={() => handleTopicPress(topic)}
      >
        <View style={styles.topicCardLeft}>
          <View style={[styles.levelIndicator, { backgroundColor: topicShade }]}>
            <Text style={styles.levelText}>L{topic.topic_level}</Text>
          </View>
          <View style={styles.topicInfo}>
            <View style={styles.topicNameRow}>
              <Text style={styles.topicName} numberOfLines={2}>
                {abbreviateTopicName(topic.topic_name)}
              </Text>
              {priorityInfo && (
                <View 
                  style={[styles.priorityStar, { backgroundColor: priorityInfo.color }]}
                  title={`Priority: ${priorityInfo.label}`}
                >
                  <Text style={styles.priorityStarText}>⭐</Text>
                </View>
              )}
            </View>
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
              {priorityInfo && (
                <>
                  <Text style={styles.topicMetaDivider}>•</Text>
                  <Text style={[styles.priorityLabel, { color: priorityInfo.color }]}>
                    {priorityInfo.emoji} {priorityInfo.label}
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
          <Icon name="arrow-back" size={24} color={theme !== 'default' ? colors.text : '#333'} />
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
            {/* Priority Filter Buttons - Compact Number System */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>FILTER BY PRIORITY</Text>
              <View style={styles.filterButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterNumberButton,
                    priorityFilter === null && styles.filterNumberButtonActive
                  ]}
                  onPress={() => setPriorityFilter(null)}
                >
                  <Text style={[
                    styles.filterNumberText,
                    priorityFilter === null && styles.filterNumberTextActive
                  ]}>
                    ALL
                  </Text>
                </TouchableOpacity>
                {PRIORITY_LEVELS.map(level => (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      styles.filterNumberButton,
                      { borderColor: level.color },
                      priorityFilter === level.value && [
                        styles.filterNumberButtonActive, 
                        { backgroundColor: level.color, borderColor: level.color }
                      ]
                    ]}
                    onPress={() => setPriorityFilter(level.value)}
                    onLongPress={() => {
                      setShowPriorityTooltip(level.value);
                      setTimeout(() => setShowPriorityTooltip(null), 2500);
                    }}
                  >
                    <Text style={[
                      styles.filterNumberText,
                      { color: level.color },
                      priorityFilter === level.value && styles.filterNumberTextActive
                    ]}>
                      {level.number}
                    </Text>
                    {showPriorityTooltip === level.value && (
                      <View style={[styles.priorityTooltip, { backgroundColor: level.color }]}>
                        <Text style={styles.priorityTooltipText}>{level.description}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Topic Tree - 4-Tier Progressive Discovery */}
            <View style={styles.topicsSection}>
              <Text style={styles.sectionTitle}>Your Discovered Topics</Text>
              
              {(() => {
                const hierarchy = organizeHierarchy(groupedTopics);
                
                return Object.keys(hierarchy).sort().map((level0Name, level0Index) => {
                  const level0Collapsed = collapsedL0.has(level0Name);
                  const level0CardCount = groupedTopics
                    .filter(g => g.level0 === level0Name)
                    .reduce((sum, g) => sum + g.topics.reduce((s, t) => s + (t.card_count || 0), 0), 0);
                  
                  // Get unique color for this Level 0 section
                  const level0Color = colorPalette.level0[level0Index % colorPalette.level0.length];

                  return (
                    <View key={level0Name} style={styles.topicGroup}>
                      {/* LEVEL 0: Exam Paper */}
                      <TouchableOpacity
                        style={[
                          styles.groupHeader, 
                          styles.level0Header,
                          { 
                            backgroundColor: `${level0Color}35`,  // 35% opacity - clearly visible!
                            borderLeftColor: level0Color, 
                            borderLeftWidth: 5 
                          }
                        ]}
                        onPress={() => toggleLevel0(level0Name)}
                      >
                        <View style={styles.groupHeaderLeft}>
                          <Icon
                            name={level0Collapsed ? "document-text" : "document-text-outline"}
                            size={24}
                            color={level0Color}
                          />
                          <Text style={[styles.groupTitle, styles.level0Title]}>
                            {abbreviateTopicName(level0Name)}
                          </Text>
                        </View>
                        <View style={styles.groupHeaderRight}>
                          <View style={[styles.cardCountBadge, { backgroundColor: '#00F5FF', borderColor: level0Color, borderWidth: 2 }]}>
                            <Text style={[styles.cardCountText, { color: '#000', fontWeight: '700' }]}>{level0CardCount}</Text>
                          </View>
                          <Icon
                            name={level0Collapsed ? "chevron-down" : "chevron-up"}
                            size={20}
                            color={level0Color}
                          />
                        </View>
                      </TouchableOpacity>

                      {/* LEVEL 0 CONTENT */}
                      {!level0Collapsed && (
                        <View style={styles.level0Content}>
                          {Object.keys(hierarchy[level0Name]).sort().map((level1Name, level1Index) => {
                            if (!level1Name) return null;
                            
                            const level1Collapsed = collapsedL1.has(`${level0Name}||${level1Name}`);
                            const level1CardCount = groupedTopics
                              .filter(g => g.level0 === level0Name && g.level1 === level1Name)
                              .reduce((sum, g) => sum + g.topics.reduce((s, t) => s + (t.card_count || 0), 0), 0);
                            
                            // Get unique color for this Level 1 section
                            const level1Color = colorPalette.level1[level1Index % colorPalette.level1.length];

                            return (
                              <View key={level1Name} style={styles.level1Section}>
                                {/* LEVEL 1: Main Section */}
                                <TouchableOpacity
                                  style={[
                                    styles.groupHeader, 
                                    styles.level1Header,
                                    { 
                                      backgroundColor: `${level1Color}30`,  // 30% opacity - clearly visible!
                                      borderLeftColor: level1Color, 
                                      borderLeftWidth: 4 
                                    }
                                  ]}
                                  onPress={() => toggleLevel1(`${level0Name}||${level1Name}`)}
                                >
                                  <View style={styles.groupHeaderLeft}>
                                    <Icon
                                      name={level1Collapsed ? "folder" : "folder-open"}
                                      size={22}
                                      color={level1Color}
                                    />
                                    <Text style={[styles.groupTitle, styles.level1Title]}>
                                      {abbreviateTopicName(level1Name)}
                                    </Text>
                                  </View>
                                  <View style={styles.groupHeaderRight}>
                                    <View style={[styles.cardCountBadge, { backgroundColor: '#00F5FF', borderColor: level1Color, borderWidth: 1.5 }]}>
                                      <Text style={[styles.cardCountText, { color: '#000', fontWeight: '700' }]}>{level1CardCount}</Text>
                                    </View>
                                    <Icon
                                      name={level1Collapsed ? "chevron-down" : "chevron-up"}
                                      size={18}
                                      color={level1Color}
                                    />
                                  </View>
                                </TouchableOpacity>

                                {/* LEVEL 1 CONTENT */}
                                {!level1Collapsed && (
                                  <View style={styles.level1Content}>
                                    {Object.keys(hierarchy[level0Name][level1Name]).sort().map((level2Name, level2Index) => {
                                      const level2Groups = hierarchy[level0Name][level1Name][level2Name];
                                      const level2Collapsed = collapsedL2.has(`${level0Name}||${level1Name}||${level2Name}`);
                                      const level2CardCount = level2Groups.reduce((sum, g) => 
                                        sum + g.topics.reduce((s, t) => s + (t.card_count || 0), 0), 0);
                                      
                                      // Get unique color for this Level 2 section
                                      const level2Color = colorPalette.level2[level2Index % colorPalette.level2.length];

                                      // Skip "direct" if no Level 2 exists
                                      if (level2Name === 'direct' && level2Groups[0]?.level2 === undefined) {
                                        // Render topics directly without Level 2 wrapper (use level1 color)
                                        return level2Groups.map(group => 
                                          group.topics.map(topic => renderTopicCard(topic, level1Color, group))
                                        );
                                      }

                                      return (
                                        <View key={level2Name} style={styles.level2Section}>
                                          {/* LEVEL 2: Sub-section */}
                                          <TouchableOpacity
                                            style={[
                                              styles.groupHeader, 
                                              styles.level2Header,
                                              { 
                                                backgroundColor: `${level2Color}25`,  // 25% opacity - clearly visible!
                                                borderLeftColor: level2Color, 
                                                borderLeftWidth: 3 
                                              }
                                            ]}
                                            onPress={() => toggleLevel2(`${level0Name}||${level1Name}||${level2Name}`)}
                                          >
                                            <View style={styles.groupHeaderLeft}>
                                              <Icon
                                                name={level2Collapsed ? "list" : "list-outline"}
                                                size={20}
                                                color={level2Color}
                                              />
                                              <Text style={[styles.groupTitle, styles.level2Title]}>
                                                {abbreviateTopicName(level2Name)}
                                              </Text>
                                            </View>
                                            <View style={styles.groupHeaderRight}>
                                              <Text style={[styles.cardCountText, { color: '#00F5FF', fontWeight: '700' }]}>{level2CardCount}</Text>
                                              <Icon
                                                name={level2Collapsed ? "add" : "remove"}
                                                size={16}
                                                color={level2Color}
                                              />
                                            </View>
                                          </TouchableOpacity>

                                          {/* LEVEL 2 CONTENT */}
                                          {!level2Collapsed && (
                                            <View style={styles.level2Content}>
                                              {level2Groups.map(group => 
                                                group.topics.map(topic => renderTopicCard(topic, level2Color, group))
                                              )}
                                            </View>
                                          )}
                                        </View>
                                      );
                                    })}
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                });
              })()}
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
              style={[styles.optionButton, styles.optionSecondary]}
              onPress={() => {
                setShowTopicOptions(null);
                navigation.navigate('ManageTopic', {
                  topicId: showTopicOptions?.topic_id,
                  topicName: showTopicOptions?.topic_name,
                  subjectName,
                  subjectColor: safeSubjectColor,
                  examBoard,
                  examType,
                });
              }}
            >
              <Icon name="settings-outline" size={24} color={safeSubjectColor} />
              <Text style={[styles.optionButtonTextSecondary, { color: safeSubjectColor }]}>
                Manage & Prioritize
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
    backgroundColor: theme !== 'default' ? colors.background : '#f5f5f5',
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
    backgroundColor: theme !== 'default' ? colors.surface : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme !== 'default' ? colors.border : '#e0e0e0',
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
    color: theme !== 'default' ? colors.text : '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme !== 'default' ? colors.textSecondary : '#666',
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
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme === 'cyber' ? colors.surface : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme === 'cyber' ? colors.border : '#e0e0e0',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'cyber' ? colors.text : '#333',
    marginBottom: 8,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  filterNumberButton: {
    width: 40,  // Reduced from 56 (30% smaller)
    height: 40,  // Reduced from 56
    borderRadius: 20,  // Half of width/height
    borderWidth: 2,
    borderColor: theme === 'cyber' ? colors.border : '#D1D5DB',
    backgroundColor: theme === 'cyber' ? colors.surface : '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        borderWidth: 2,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }
    }),
  },
  filterNumberButtonActive: {
    ...Platform.select({
      web: {
        borderWidth: 3,
      },
      default: {
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      }
    }),
  },
  filterNumberText: {
    fontSize: 20,
    fontWeight: '700',
  },
  filterNumberTextActive: {
    color: '#FFFFFF',
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
  level0Header: {
    backgroundColor: theme === 'cyber' ? 'rgba(99, 102, 241, 0.15)' : '#f0f0ff',
    borderLeftWidth: 4,
    borderLeftColor: subjectColor || '#6366F1',
    marginBottom: 4,
  },
  level0Title: {
    fontSize: 16,
    fontWeight: '700',
  },
  level0Content: {
    paddingLeft: 8,
  },
  level1Header: {
    backgroundColor: theme === 'cyber' ? 'rgba(99, 102, 241, 0.08)' : '#f8f8ff',
    paddingLeft: 20,
    borderLeftWidth: 3,
    borderLeftColor: subjectColor || '#6366F1',
  },
  level1Title: {
    fontSize: 15,
    fontWeight: '600',
  },
  level1Content: {
    paddingLeft: 16,
  },
  level1Section: {
    marginBottom: 8,
  },
  level2Header: {
    backgroundColor: theme === 'cyber' ? colors.surface : '#fff',
    paddingLeft: 32,
    paddingVertical: 12,
    borderLeftWidth: 2,
    borderLeftColor: theme === 'cyber' ? 'rgba(0, 245, 255, 0.3)' : '#ddd',
  },
  level2Title: {
    fontSize: 14,
    fontWeight: '500',
    color: theme === 'cyber' ? colors.text : '#555',
  },
  level2Content: {
    paddingLeft: 20,
  },
  level2Section: {
    marginBottom: 4,
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
  topicNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme === 'cyber' ? colors.text : '#333',
    flex: 1,
  },
  priorityStar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  priorityStarText: {
    fontSize: 10,
  },
  priorityLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  topicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 4,
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

