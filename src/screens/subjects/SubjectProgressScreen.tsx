import React, { useCallback, useState, useEffect } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import Icon from '../../components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { abbreviateTopicName, getTopicLabel, sanitizeTopicLabel } from '../../utils/topicNameUtils';
import TopicContextModal from '../../components/TopicContextModal';
import TopicChildrenPickerModal from '../../components/TopicChildrenPickerModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateHierarchyPalette } from '../../utils/colorPaletteGenerator';
import { TOPIC_PRIORITY_LEVELS, getTopicPriorityInfo } from '../../constants/topicPriorities';

interface CurriculumTopic {
  id: string;
  topic_name: string;
  display_name?: string | null;
  topic_level: number;
  parent_topic_id: string | null;
  sort_order?: number | null;
}

interface DiscoveredTopicRow {
  topic_id: string;
  card_count: number;
  cards_mastered: number;
  is_newly_discovered?: boolean | null;
}

// Keep props broad so React Navigation can pass through its own route typing without conflicts.
// (Strict param typing belongs on the navigator's ParamList, not here.)
type SubjectProgressScreenProps = any;

// Priority config is shared across the app (1 = highest).

export default function SubjectProgressScreen({ route, navigation }: SubjectProgressScreenProps) {
  const { subjectId, subjectName, subjectColor, examBoard, examType } = route?.params || {};
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const safeSubjectColor = subjectColor || '#6366F1'; // Fallback color if null
  const styles = createStyles(colors, theme, safeSubjectColor);
  
  // Generate color palette for hierarchy
  const colorPalette = generateHierarchyPalette(safeSubjectColor);

  const [loading, setLoading] = useState(true);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  
  const [stats, setStats] = useState({
    totalCards: 0,
    topicsDiscovered: 0,
    cardsMastered: 0,
  });

  // Curriculum + discovery state (IDs, not names)
  const [topicsById, setTopicsById] = useState<Map<string, CurriculumTopic>>(new Map());
  const [childrenIndex, setChildrenIndex] = useState<Map<string | null, string[]>>(new Map());
  const [rootTopicIds, setRootTopicIds] = useState<string[]>([]);
  const [discoveredTopicIds, setDiscoveredTopicIds] = useState<Set<string>>(new Set());
  const [topicProgress, setTopicProgress] = useState<Map<string, DiscoveredTopicRow>>(new Map());
  const [topicPriorities, setTopicPriorities] = useState<Map<string, number | null>>(new Map());
  const [overviewCounts, setOverviewCounts] = useState<Map<string, number>>(new Map());

  // UI state (fully closed by default)
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(new Set());

  const [showTopicOptions, setShowTopicOptions] = useState<{
    topicId: string;
    topicName: string;
    topicLevel: number;
    cardCount: number;
    overviewCount: number;
    hasChildren: boolean;
    priority: number | null;
  } | null>(null);
  const [showContextModal, setShowContextModal] = useState<{ topicId: string; topicName: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState<{ topicId: string; topicName: string } | null>(null);

  const [priorityFilter, setPriorityFilter] = useState<number | null>(null); // null = show all
  const [showPriorityTooltip, setShowPriorityTooltip] = useState<number | null>(null);
  const [showPriorityExplainer, setShowPriorityExplainer] = useState(false);

  useEffect(() => {
    loadPriorityFilter();
    fetchDiscoveredTopics();
  }, []);

  // Refresh when returning from Manage & Prioritize / other flows.
  useFocusEffect(
    useCallback(() => {
      fetchDiscoveredTopics();
    }, [subjectId, user?.id])
  );

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

      if (!user?.id || !subjectId) {
        setLoading(false);
        return;
      }

      // 1) Fetch full curriculum for this subject (no artificial depth cap)
      const { data: curriculum, error: curriculumError } = await supabase
        .from('curriculum_topics')
        .select('id, topic_name, display_name, topic_level, parent_topic_id, sort_order')
        .eq('exam_board_subject_id', subjectId)
        .order('topic_level', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('topic_name', { ascending: true });

      if (curriculumError) throw curriculumError;
      const topics = (curriculum || []) as CurriculumTopic[];

      const byId = new Map<string, CurriculumTopic>();
      const children = new Map<string | null, string[]>();
      topics.forEach((t) => {
        byId.set(t.id, t);
        const key = t.parent_topic_id ?? null;
        const arr = children.get(key) || [];
        arr.push(t.id);
        children.set(key, arr);
      });

      // Root topics = Level 0 by your definition (parent_topic_id IS NULL)
      const roots = (children.get(null) || []).slice();

      setTopicsById(byId);
      setChildrenIndex(children);
      setRootTopicIds(roots);

      // 2) Fetch discovered topics (includes "added to tree" even with 0 cards)
      const { data: discovered, error: discoveredError } = await supabase
        .from('user_discovered_topics')
        .select('topic_id, card_count, cards_mastered, is_newly_discovered')
        .eq('user_id', user.id)
        .eq('subject_id', subjectId);

      if (discoveredError) throw discoveredError;

      const discoveredIds = new Set<string>();
      const progress = new Map<string, DiscoveredTopicRow>();
      (discovered || []).forEach((row: any) => {
        discoveredIds.add(row.topic_id);
        progress.set(row.topic_id, {
          topic_id: row.topic_id,
          card_count: Number(row.card_count || 0),
          cards_mastered: Number(row.cards_mastered || 0),
          is_newly_discovered: !!row.is_newly_discovered,
        });
      });

      // 3) Fallback: include legacy card topics even if discovery row missing
      const { data: cards, error: cardsError } = await supabase
        .from('flashcards')
        .select('topic_id, box_number, is_overview')
        .eq('user_id', user.id)
        .eq('subject_name', subjectName);

      if (cardsError) throw cardsError;

      const cardCounts = new Map<string, number>();
      const masteredCounts = new Map<string, number>();
      const overviewCountMap = new Map<string, number>();

      // IMPORTANT:
      // Treat overview cards as a separate count. Do not include them in normal card_count,
      // otherwise we double-count when we also display overviewCount separately.
      (cards || []).forEach((c: any) => {
        const tid = c.topic_id;
        if (!tid) return;
        if (c.is_overview) {
          overviewCountMap.set(tid, (overviewCountMap.get(tid) || 0) + 1);
          return;
        }
        cardCounts.set(tid, (cardCounts.get(tid) || 0) + 1);
        if (Number(c.box_number || 0) >= 4) {
          masteredCounts.set(tid, (masteredCounts.get(tid) || 0) + 1);
        }
      });

      // Ensure any card topics appear in the tree and stats are accurate
      cardCounts.forEach((count, tid) => {
        discoveredIds.add(tid);
        const existing = progress.get(tid);
        progress.set(tid, {
          topic_id: tid,
          card_count: count,
          cards_mastered: masteredCounts.get(tid) || 0,
          is_newly_discovered: existing?.is_newly_discovered || false,
        });
      });

      setDiscoveredTopicIds(discoveredIds);
      setTopicProgress(progress);
      setOverviewCounts(overviewCountMap);

      // 4) Priorities for discovered topics (and any card topics)
      const idsForPriorities = Array.from(discoveredIds);
      if (idsForPriorities.length > 0) {
        const { data: priorities, error: prioritiesError } = await supabase
          .from('user_topic_priorities')
          .select('topic_id, priority')
          .eq('user_id', user.id)
          .in('topic_id', idsForPriorities);

        if (prioritiesError) throw prioritiesError;
        const pMap = new Map<string, number | null>();
        (priorities || []).forEach((p: any) => {
          pMap.set(p.topic_id, p.priority ?? null);
        });
        setTopicPriorities(pMap);
      } else {
        setTopicPriorities(new Map());
      }

      // 5) Stats + completion
      const totalCards = (cards || []).length;
      const cardsMastered = Array.from(masteredCounts.values()).reduce((s, n) => s + n, 0);
      const topicsDiscovered = (discovered || []).length;

      setStats({
        totalCards,
        topicsDiscovered,
        cardsMastered,
      });

      const { data: completion, error: completionError } = await supabase.rpc('calculate_subject_completion', {
        p_user_id: user.id,
        p_subject_id: subjectId,
      });

      if (!completionError && completion !== null) {
        setCompletionPercentage(Math.round(completion));
      }
    } catch (error) {
      console.error('Error fetching subject tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (topicId: string) => {
    setExpandedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const getDirectChildrenIds = (topicId: string): string[] => {
    return childrenIndex.get(topicId) || [];
  };

  const getHasAnyChildren = (topicId: string): boolean => {
    return (childrenIndex.get(topicId) || []).length > 0;
  };

  const computeVisibleIds = (): Set<string> => {
    const visible = new Set<string>();

    // Always include Level 0 roots
    rootTopicIds.forEach((id) => visible.add(id));

    // Include all discovered topics + their ancestors for context
    discoveredTopicIds.forEach((id) => {
      visible.add(id);
      let currentId = id;
      while (true) {
        const t = topicsById.get(currentId);
        const parentId = t?.parent_topic_id || null;
        if (!parentId) break;
        visible.add(parentId);
        currentId = parentId;
      }
    });

    // Apply priority filter (hide whole branches)
    if (priorityFilter !== null) {
      const matches: string[] = [];
      visible.forEach((id) => {
        if (topicPriorities.get(id) === priorityFilter) matches.push(id);
      });

      const filtered = new Set<string>();
      matches.forEach((id) => {
        filtered.add(id);
        let currentId = id;
        while (true) {
          const t = topicsById.get(currentId);
          const parentId = t?.parent_topic_id || null;
          if (!parentId) break;
          filtered.add(parentId);
          currentId = parentId;
        }
      });

      // Only keep roots that have at least one matching descendant
      const rootsToKeep = new Set<string>();
      filtered.forEach((id) => {
        let currentId = id;
        while (true) {
          const t = topicsById.get(currentId);
          const parentId = t?.parent_topic_id || null;
          if (!parentId) {
            rootsToKeep.add(currentId);
            break;
          }
          currentId = parentId;
        }
      });
      const out = new Set<string>();
      filtered.forEach((id) => out.add(id));
      rootsToKeep.forEach((id) => out.add(id));
      return out;
    }

    return visible;
  };

  const visibleIds = computeVisibleIds();

  // Aggregate counts (descendants; excludes overview cards).
  const aggregateCountMemo = new Map<string, number>();
  const getAggregateCount = (topicId: string): number => {
    if (aggregateCountMemo.has(topicId)) return aggregateCountMemo.get(topicId)!;
    const ownCards = topicProgress.get(topicId)?.card_count || 0;
    const childIds = getDirectChildrenIds(topicId).filter((id) => visibleIds.has(id));
    const sumChildren = childIds.reduce((s, cid) => s + getAggregateCount(cid), 0);
    const total = ownCards + sumChildren;
    aggregateCountMemo.set(topicId, total);
    return total;
  };

  const getOverviewCapForLevel = (level: number) => {
    if (level <= 1) return 30;
    if (level === 2) return 20;
    return 10;
  };

  const getOverviewChildrenTopics = async (parentTopicId: string, parentLevel: number): Promise<string[]> => {
    const cap = getOverviewCapForLevel(parentLevel);

    const { data: children, error } = await supabase
      .from('curriculum_topics')
      .select('id, topic_name, display_name, sort_order')
      .eq('parent_topic_id', parentTopicId)
      .order('sort_order', { ascending: true })
      .order('topic_name', { ascending: true });

    if (error) throw error;

    const list = (children || []) as any[];
    if (list.length === 0) return [];

    let selected = list;
    const omitted = Math.max(0, list.length - cap);

    if (list.length > cap) {
      // Prefer the most exam-important children when metadata exists
      const ids = list.map((c) => c.id);
      const { data: meta } = await supabase
        .from('topic_ai_metadata')
        .select('topic_id, exam_importance')
        .in('topic_id', ids)
        .order('exam_importance', { ascending: false })
        .limit(cap);

      if (meta && meta.length > 0) {
        const topIds = new Set(meta.map((m: any) => m.topic_id));
        selected = list.filter((c) => topIds.has(c.id)).slice(0, cap);
      } else {
        selected = list.slice(0, cap);
      }
    } else {
      selected = list.slice(0, cap);
    }

    const names = selected.map((c) => getTopicLabel(c));
    if (omitted > 0) {
      names.push(`(+${omitted} more subtopics not listed)`); // helps the model understand the list is capped
    }
    return names;
  };

  const handleDiscoverMore = () => {
    navigation.navigate('SmartTopicDiscovery', {
      subjectId,
      subjectName,
      subjectColor: safeSubjectColor,
      examBoard,
      examType,
    });
  };

  const handleRevealContext = () => {
    if (!showTopicOptions) return;
    setShowContextModal({ topicId: showTopicOptions.topicId, topicName: showTopicOptions.topicName });
    setShowTopicOptions(null);
  };

  const handleOpenAddModal = () => {
    if (!showTopicOptions) return;
    setShowAddModal({ topicId: showTopicOptions.topicId, topicName: showTopicOptions.topicName });
    setShowTopicOptions(null);
  };

  const handleCreateCardsFromContext = (topicId: string, topicName: string, isOverview: boolean, childrenTopics?: string[]) => {
    navigation.navigate('AIGenerator', {
      topicId,
      topic: topicName,
      subject: subjectName,
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

  const openTopicOptionsForId = (topicId: string) => {
    const t = topicsById.get(topicId);
    if (!t) return;
    const label = getTopicLabel(t as any);
    const progress = topicProgress.get(topicId);
    const cardCount = Number(progress?.card_count || 0);
    const overviewCount = Number(overviewCounts.get(topicId) || 0);
    const hasChildren = getHasAnyChildren(topicId);
    const priority = (topicPriorities.get(topicId) ?? null) as any;

    setShowTopicOptions({
      topicId,
      topicName: label,
      topicLevel: t.topic_level,
      cardCount,
      overviewCount,
      hasChildren,
      priority,
    });
  };

  const handlePressNode = (topicId: string) => {
    const visibleChildren = getDirectChildrenIds(topicId).filter((id) => visibleIds.has(id));
    const hasVisibleChildren = visibleChildren.length > 0;
    const hasAnyChildren = getHasAnyChildren(topicId);

    if (hasVisibleChildren) {
      toggleExpanded(topicId);
      return;
    }

    if (hasAnyChildren) {
      const t = topicsById.get(topicId);
      const label = t ? getTopicLabel(t as any) : 'Topic';
      setShowAddModal({ topicId, topicName: label });
      return;
    }

    openTopicOptionsForId(topicId);
  };

  const handleLongPressNode = (topicId: string) => {
    // Long press should always surface the "topic options" sheet so users can:
    // - study leaf cards
    // - study overview cards
    // - create overview cards
    // - manage/prioritise
    // (previous production behavior)
    openTopicOptionsForId(topicId);
  };

  const handleStudyLeafCards = () => {
    if (!showTopicOptions) return;
    const { topicId, topicName } = showTopicOptions;
    setShowTopicOptions(null);
    navigation.navigate('StudyModal', {
      topicId,
      topicName,
      subjectName,
      subjectColor: safeSubjectColor,
    });
  };

  const handleCreateLeafCards = () => {
    if (!showTopicOptions) return;
    const { topicId, topicName } = showTopicOptions;
    setShowTopicOptions(null);
    navigation.navigate('CardCreationChoice', {
      topicId,
      topicName,
      subjectName,
      examBoard,
      examType,
      subjectId,
      discoveryMethod: 'tree',
    });
  };

  const handleStudyOverviewCards = () => {
    if (!showTopicOptions) return;
    const { topicId, topicName } = showTopicOptions;
    setShowTopicOptions(null);
    navigation.navigate('StudyModal', {
      topicId,
      topicName,
      subjectName,
      subjectColor: safeSubjectColor,
      overviewOnly: true,
    });
  };

  const handleCreateOverviewCards = async () => {
    if (!showTopicOptions) return;
    const { topicId, topicName, topicLevel } = showTopicOptions;
    setShowTopicOptions(null);
    try {
      const childrenTopics = await getOverviewChildrenTopics(topicId, topicLevel);
      navigation.navigate('AIGenerator', {
        topicId,
        topic: topicName,
        subject: subjectName,
        subjectId,
        subjectName,
        subjectColor: safeSubjectColor,
        examBoard,
        examType,
        isOverviewCard: true,
        childrenTopics,
      });
    } catch (e) {
      console.error('Error preparing overview generation:', e);
      Alert.alert('Error', 'Could not load subtopics for overview generation.');
    }
  };

  const renderTreeNode = (topicId: string, depth: number, siblingIndex: number): React.ReactNode => {
    const t = topicsById.get(topicId);
    if (!t) return null;

    if (!visibleIds.has(topicId)) return null;

    const progress = topicProgress.get(topicId);
    const isNew = !!progress?.is_newly_discovered;
    const cardCount = Number(progress?.card_count || 0);
    const mastered = Number(progress?.cards_mastered || 0);
    const overviewCount = Number(overviewCounts.get(topicId) || 0);
    const priority = (topicPriorities.get(topicId) ?? null) as any;
    const priorityInfo = getTopicPriorityInfo(priority);

    const anyChildren = getDirectChildrenIds(topicId);
    const visibleChildren = anyChildren.filter((id) => visibleIds.has(id));
    const hasVisibleChildren = visibleChildren.length > 0;
    const hasAnyChildren = anyChildren.length > 0;
    const isExpanded = expandedTopicIds.has(topicId);

    const label = getTopicLabel(t as any);
    const badgeCount = getAggregateCount(topicId);

    const depthPalette =
      depth === 0
        ? colorPalette.level0
        : depth === 1
          ? colorPalette.level1
          : colorPalette.level2;
    const baseColor = depthPalette[siblingIndex % depthPalette.length];

    const rowStyle =
      depth === 0
        ? [
            styles.groupHeader,
            styles.level0Header,
            {
              backgroundColor: `${baseColor}35`,
              borderLeftColor: baseColor,
              borderLeftWidth: 5,
            },
          ]
        : [
            styles.topicCard,
            {
              marginLeft: Math.min(48, depth * 14),
              borderLeftWidth: 3,
              borderLeftColor: baseColor,
            },
          ];

    return (
      <View key={topicId} style={depth === 0 ? styles.topicGroup : undefined}>
        <TouchableOpacity
          style={rowStyle as any}
          onPress={() => handlePressNode(topicId)}
          onLongPress={() => handleLongPressNode(topicId)}
          delayLongPress={350}
        >
          <View style={styles.groupHeaderLeft}>
            <Icon
              name={
                depth === 0
                  ? isExpanded
                    ? 'document-text-outline'
                    : 'document-text'
                  : hasAnyChildren
                    ? isExpanded
                      ? 'folder-open'
                      : 'folder'
                    : 'document-text-outline'
              }
              size={depth === 0 ? 24 : 20}
              color={baseColor}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.groupTitle, depth === 0 ? styles.level0Title : styles.topicName]} numberOfLines={2}>
                {depth === 0 ? abbreviateTopicName(label) : sanitizeTopicLabel(label)}
              </Text>
              {depth > 0 && (
                <View style={styles.topicMeta}>
                  <Text style={styles.topicMetaText}>{cardCount} cards</Text>
                  {overviewCount > 0 ? (
                    <>
                      <Text style={styles.topicMetaDivider}>•</Text>
                      <Text style={[styles.topicMetaText, { color: '#00F5FF', fontWeight: '800' }]}>🏔️ {overviewCount} overview</Text>
                    </>
                  ) : null}
                  {mastered > 0 ? (
                    <>
                      <Text style={styles.topicMetaDivider}>•</Text>
                      <Text style={styles.topicMetaTextMastered}>{mastered} mastered</Text>
                    </>
                  ) : null}
                </View>
              )}
            </View>
            {priorityInfo ? (
              <View style={[styles.priorityStar, { backgroundColor: priorityInfo.color }]}>
                <Text style={styles.priorityStarText}>⭐</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.groupHeaderRight}>
            <View style={[styles.cardCountBadge, { backgroundColor: '#00F5FF', borderColor: baseColor, borderWidth: 2 }]}>
              <Text style={[styles.cardCountText, { color: '#000', fontWeight: '700' }]}>{badgeCount}</Text>
            </View>
            {hasAnyChildren ? (
              <Icon
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={depth === 0 ? 20 : 18}
                color={baseColor}
              />
            ) : (
              <Icon name="chevron-forward" size={18} color="#999" />
            )}
          </View>
        </TouchableOpacity>

        {isNew && depth > 0 ? (
          <View style={[styles.newBadge, { marginLeft: Math.min(48, depth * 14) + 12, marginTop: -6 }]}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        ) : null}

        {isExpanded && hasVisibleChildren ? (
          <View style={depth === 0 ? styles.level0Content : undefined}>
            {visibleChildren.map((cid, idx) => renderTreeNode(cid, depth + 1, idx))}
          </View>
        ) : null}
      </View>
    );
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

        {/* Priority Filter Buttons - Compact Number System */}
        <View style={styles.filterSection}>
          <View style={styles.filterTitleRow}>
            <Text style={styles.filterTitle}>FILTER BY PRIORITY</Text>
            <TouchableOpacity onPress={() => setShowPriorityExplainer(true)} style={styles.filterInfoButton}>
              <Icon name="help-circle-outline" size={18} color={theme === 'cyber' ? colors.text : '#333'} />
            </TouchableOpacity>
          </View>
          <View style={styles.filterButtonsRow}>
            <TouchableOpacity
              style={[
                styles.filterNumberButton,
                priorityFilter === null && styles.filterNumberButtonActive,
              ]}
              onPress={() => setPriorityFilter(null)}
            >
              <Text
                style={[
                  styles.filterNumberText,
                  priorityFilter === null && styles.filterNumberTextActive,
                ]}
              >
                ALL
              </Text>
            </TouchableOpacity>
            {TOPIC_PRIORITY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.filterNumberButton,
                  { borderColor: level.color },
                  priorityFilter === level.value && [
                    styles.filterNumberButtonActive,
                    { backgroundColor: level.color, borderColor: level.color },
                  ],
                ]}
                onPress={() => setPriorityFilter(level.value)}
                onLongPress={() => {
                  setShowPriorityTooltip(level.value);
                  setTimeout(() => setShowPriorityTooltip(null), 2500);
                }}
              >
                <Text
                  style={[
                    styles.filterNumberText,
                    { color: level.color },
                    priorityFilter === level.value && styles.filterNumberTextActive,
                  ]}
                >
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

        {/* Discover Topics CTA (moved above the tree) */}
        <TouchableOpacity style={styles.discoverMoreButton} onPress={handleDiscoverMore}>
          <Icon name="search" size={24} color={safeSubjectColor} />
          <Text style={[styles.discoverMoreText, { color: safeSubjectColor }]}>Discover Topics</Text>
        </TouchableOpacity>

        {/* Topic Tree */}
        <View style={styles.topicsSection}>
          <Text style={styles.sectionTitle}>Topics</Text>

          {rootTopicIds.filter((id) => visibleIds.has(id)).length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="list-outline" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>No topics to show</Text>
              <Text style={styles.emptyText}>
                Try clearing the priority filter, or discover topics to start building your tree.
              </Text>
            </View>
          ) : (
            rootTopicIds
              .filter((id) => visibleIds.has(id))
              .map((id, idx) => renderTreeNode(id, 0, idx))
          )}
        </View>
      </ScrollView>

      {/* Priority explainer modal */}
      <Modal
        visible={showPriorityExplainer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPriorityExplainer(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setShowPriorityExplainer(false)}
        >
          <View style={styles.optionsCard}>
            <Text style={styles.optionsTitle}>Priority levels</Text>
            <Text style={styles.optionsSubtitle}>1 is the highest priority.</Text>

            {TOPIC_PRIORITY_LEVELS.map((p) => (
              <View key={p.value} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: p.color,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '900' }}>{p.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: theme === 'cyber' ? colors.text : '#111827' }}>{p.label}</Text>
                  <Text style={{ color: theme === 'cyber' ? colors.textSecondary : '#6B7280', marginTop: 2 }}>
                    {p.description}
                  </Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.optionCancel} onPress={() => setShowPriorityExplainer(false)}>
              <Text style={styles.optionCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
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
              {showTopicOptions?.topicName}
            </Text>
            <Text style={styles.optionsSubtitle}>
              {showTopicOptions?.hasChildren
                ? (showTopicOptions?.overviewCount || 0) > 0
                  ? `${showTopicOptions?.overviewCount} overview cards`
                  : 'No overview cards yet'
                : `${showTopicOptions?.cardCount || 0} cards created`}
            </Text>
            
            <TouchableOpacity
              style={[styles.optionButton, styles.optionPrimary]}
              onPress={() => {
                if (!showTopicOptions) return;
                const isParent = !!showTopicOptions.hasChildren && (showTopicOptions.topicLevel || 0) >= 1;
                if (isParent) {
                  if ((showTopicOptions.overviewCount || 0) > 0) {
                    handleStudyOverviewCards();
                  } else {
                    void handleCreateOverviewCards();
                  }
                } else {
                  if ((showTopicOptions.cardCount || 0) > 0) {
                    handleStudyLeafCards();
                  } else {
                    handleCreateLeafCards();
                  }
                }
              }}
            >
              <Icon
                name={
                  showTopicOptions?.hasChildren
                    ? 'layers'
                    : (showTopicOptions?.cardCount || 0) > 0
                      ? 'play-circle'
                      : 'add-circle'
                }
                size={24}
                color="#fff"
              />
              <Text style={styles.optionButtonText}>
                {showTopicOptions?.hasChildren
                  ? (showTopicOptions?.overviewCount || 0) > 0
                    ? 'Study Overview Cards'
                    : 'Create Overview Cards'
                  : (showTopicOptions?.cardCount || 0) > 0
                    ? 'Study These Cards'
                    : 'Create Cards'}
              </Text>
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
              onPress={handleOpenAddModal}
            >
              <Icon name="add-circle" size={24} color={safeSubjectColor} />
              <Text style={[styles.optionButtonTextSecondary, { color: safeSubjectColor }]}>
                Add to Tree
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.optionButton, styles.optionSecondary]}
              onPress={() => {
                setShowTopicOptions(null);
                navigation.navigate('ManageTopic', {
                  topicId: showTopicOptions?.topicId,
                  topicName: showTopicOptions?.topicName,
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
          topicId={showContextModal.topicId}
          topicName={showContextModal.topicName}
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

      {/* Add-to-tree modal */}
      {showAddModal && user?.id ? (
        <TopicChildrenPickerModal
          visible={!!showAddModal}
          userId={user.id}
          subjectId={subjectId}
          subjectColor={safeSubjectColor}
          startTopicId={showAddModal.topicId}
          startTopicName={showAddModal.topicName}
          discoveredTopicIds={discoveredTopicIds}
          onClose={() => setShowAddModal(null)}
          onTopicAdded={(addedTopicId) => {
            // Refresh and keep the current branch open for visibility
            setExpandedTopicIds((prev) => {
              const next = new Set(prev);
              next.add(showAddModal.topicId);
              // Also expand the newly added topic's parent branch if needed
              if (addedTopicId) next.add(addedTopicId);
              return next;
            });
            void fetchDiscoveredTopics();
          }}
        />
      ) : null}
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
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme === 'cyber' ? colors.surface : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme === 'cyber' ? colors.border : '#e0e0e0',
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterInfoButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    ...(theme === 'cyber'
      ? { backgroundColor: 'rgba(255,255,255,0.06)' }
      : { backgroundColor: '#F3F4F6' }),
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

