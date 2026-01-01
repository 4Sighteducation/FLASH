import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from './Icon';
import { supabase } from '../services/supabase';
import { getTopicLabel, sanitizeTopicLabel } from '../utils/topicNameUtils';

type TopicRow = {
  id: string;
  topic_name: string;
  display_name?: string | null;
  topic_level: number;
  parent_topic_id: string | null;
  sort_order?: number | null;
};

type Breadcrumb = { id: string; name: string };

type Props = {
  visible: boolean;
  userId: string;
  subjectId: string;
  subjectColor: string;
  startTopicId: string;
  startTopicName: string;
  discoveredTopicIds: Set<string>;
  onClose: () => void;
  onTopicAdded: (addedTopicId: string) => void;
};

export default function TopicChildrenPickerModal({
  visible,
  userId,
  subjectId,
  subjectColor,
  startTopicId,
  startTopicName,
  discoveredTopicIds,
  onClose,
  onTopicAdded,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [parentsWithChildren, setParentsWithChildren] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const currentParentId = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].id : startTopicId;
  const currentTitle = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : startTopicName;

  useEffect(() => {
    if (!visible) return;
    // Reset to initial state when opened.
    setBreadcrumbs([]);
    setSelectedIds(new Set());
  }, [visible, startTopicId]);

  useEffect(() => {
    if (!visible) return;
    void loadChildren(currentParentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, currentParentId]);

  const loadChildren = async (parentTopicId: string) => {
    try {
      setLoading(true);
      setSelectedIds(new Set());

      const { data, error } = await supabase
        .from('curriculum_topics')
        .select('id, topic_name, display_name, topic_level, parent_topic_id, sort_order')
        .eq('parent_topic_id', parentTopicId)
        .order('sort_order', { ascending: true })
        .order('topic_name', { ascending: true });

      if (error) throw error;
      const rows = (data || []) as TopicRow[];
      setTopics(rows);

      // Determine which rows have children (for drill-down chevron).
      if (rows.length === 0) {
        setParentsWithChildren(new Set());
        return;
      }

      const ids = rows.map((r) => r.id);
      const { data: children, error: childError } = await supabase
        .from('curriculum_topics')
        .select('parent_topic_id')
        .in('parent_topic_id', ids);

      if (childError) {
        // Non-fatal: just hide drill-down affordance.
        setParentsWithChildren(new Set());
        return;
      }

      const withKids = new Set<string>((children || []).map((c: any) => c.parent_topic_id).filter(Boolean));
      setParentsWithChildren(withKids);
    } catch (e) {
      console.error('[TopicChildrenPickerModal] loadChildren error', e);
      setTopics([]);
      setParentsWithChildren(new Set());
    } finally {
      setLoading(false);
    }
  };

  const visibleTopics = useMemo(() => {
    // Hide already-discovered topics (they’re already in the tree).
    return topics.filter((t) => !discoveredTopicIds.has(t.id));
  }, [topics, discoveredTopicIds]);

  const toggleSelected = (topicId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(visibleTopics.map((t) => t.id)));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const drillDown = (topic: TopicRow) => {
    const label = getTopicLabel(topic as any);
    setBreadcrumbs((prev) => [...prev, { id: topic.id, name: label }]);
  };

  const goBack = () => {
    setBreadcrumbs((prev) => prev.slice(0, -1));
  };

  const discoverViaRpcOrUpsert = async (topicId: string) => {
    // Prefer RPC if present (updates completion %). Fall back to upsert if RPC isn’t deployed.
    const { error: rpcError } = await supabase.rpc('discover_topic', {
      p_user_id: userId,
      p_subject_id: subjectId,
      p_topic_id: topicId,
      p_discovery_method: 'tree',
      p_search_query: null,
    });

    if (!rpcError) return;

    const msg = String((rpcError as any)?.message || '');
    const looksLikeMissingFn =
      msg.includes('discover_topic') && (msg.includes('does not exist') || msg.includes('schema cache'));

    if (!looksLikeMissingFn) {
      throw rpcError;
    }

    const { error: upsertError } = await supabase.from('user_discovered_topics').upsert(
      {
        user_id: userId,
        subject_id: subjectId,
        topic_id: topicId,
        discovery_method: 'tree',
        is_newly_discovered: true,
      } as any,
      { onConflict: 'user_id,topic_id' }
    );

    if (upsertError) throw upsertError;
  };

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      setSaving(true);
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await discoverViaRpcOrUpsert(id);
      }
      onTopicAdded(ids[0]);
      onClose();
    } catch (e) {
      console.error('[TopicChildrenPickerModal] addSelected error', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { borderBottomColor: subjectColor + '33' }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={breadcrumbs.length > 0 ? goBack : onClose} style={styles.headerIconBtn}>
              <Icon name={breadcrumbs.length > 0 ? 'arrow-back' : 'close'} size={24} color={subjectColor} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Add to Tree</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {sanitizeTopicLabel(currentTitle)}
              </Text>
            </View>
          </View>

          <View style={styles.headerActionsRow}>
            <TouchableOpacity onPress={selectAll} style={styles.smallBtn}>
              <Text style={[styles.smallBtnText, { color: subjectColor }]}>Select all</Text>
            </Touchabl
