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

type AnyTopic = {
  id: string;
  topic_name: string;
  display_name?: string | null;
  topic_level: number;
  parent_topic_id: string | null;
  sort_order?: number | null;
};

type PathItem = { id: string; name: string };

export type TopicChildrenPickerModalProps = {
  visible: boolean;
  userId: string;
  subjectId: string;
  subjectColor: string;
  startTopicId: string;
  startTopicName: string;
  discoveredTopicIds: Set<string>;
  onClose: () => void;
  onTopicAdded: (topicId: string) => void;
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
}: TopicChildrenPickerModalProps) {
  const [path, setPath] = useState<PathItem[]>([]);
  const [children, setChildren] = useState<AnyTopic[]>([]);
  const [parentsWithChildren, setParentsWithChildren] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const current = path[path.length - 1];

  useEffect(() => {
    if (!visible) return;
    setPath([{ id: startTopicId, name: startTopicName }]);
  }, [visible, startTopicId, startTopicName]);

  const title = useMemo(() => {
    if (!current) return 'Add to Tree';
    return sanitizeTopicLabel(current.name, { maxLength: 64 });
  }, [current]);

  useEffect(() => {
    if (!visible) return;
    if (!current?.id) return;
    void fetchChildren(current.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, current?.id]);

  const fetchChildren = async (parentId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('curriculum_topics')
        .select('id, topic_name, display_name, topic_level, parent_topic_id, sort_order')
        .eq('parent_topic_id', parentId)
        .order('sort_order', { ascending: true })
        .order('topic_name', { ascending: true });

      if (error) throw error;

      const list = (data || []) as AnyTopic[];
      setChildren(list);

      const ids = list.map((t) => t.id);
      if (ids.length === 0) {
        setParentsWithChildren(new Set());
        return;
      }

      // Determine which of these children have children (one extra query per level).
      const { data: grandChildren, error: gcError } = await supabase
        .from('curriculum_topics')
        .select('parent_topic_id')
        .in('parent_topic_id', ids);

      if (gcError) throw gcError;

      const withKids = new Set<string>();
      (grandChildren || []).forEach((r: any) => {
        if (r?.parent_topic_id) withKids.add(r.parent_topic_id);
      });
      setParentsWithChildren(withKids);
    } catch (e) {
      console.error('TopicChildrenPickerModal fetchChildren error:', e);
      setChildren([]);
      setParentsWithChildren(new Set());
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (topic: AnyTopic) => {
    if (addingId) return;
    setAddingId(topic.id);
    try {
      const { error } = await supabase.rpc('discover_topic', {
        p_user_id: userId,
        p_subject_id: subjectId,
        p_topic_id: topic.id,
        p_discovery_method: 'add_to_tree',
        p_search_query: null,
      });

      if (error) throw error;
      onTopicAdded(topic.id);
    } catch (e) {
      console.error('Error adding topic to tree:', e);
    } finally {
      setAddingId(null);
    }
  };

  const handleDrill = (topic: AnyTopic) => {
    if (!parentsWithChildren.has(topic.id)) return;
    setPath((prev) => [...prev, { id: topic.id, name: getTopicLabel(topic as any) }]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Add to Tree</Text>
              <Text style={styles.headerSubtitle}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color="#111" />
            </TouchableOpacity>
          </View>

          {/* Breadcrumb */}
          {path.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumbRow}>
              {path.map((p, idx) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPath((prev) => prev.slice(0, idx + 1))}
                  style={styles.crumb}
                >
                  <Text style={styles.crumbText} numberOfLines={1}>
                    {sanitizeTopicLabel(p.name, { maxLength: 28 })}
                  </Text>
                  {idx < path.length - 1 ? <Text style={styles.crumbSep}>›</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.body}>
            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={subjectColor} />
                <Text style={styles.loadingText}>Loading topics…</Text>
              </View>
            ) : children.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No further subtopics</Text>
                <Text style={styles.emptySub}>
                  This is a most-detailed topic. Add it to the tree or create cards from the subject page.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {children.map((t) => {
                  const label = getTopicLabel(t as any);
                  const alreadyAdded = discoveredTopicIds.has(t.id);
                  const hasKids = parentsWithChildren.has(t.id);
                  return (
                    <View key={t.id} style={styles.row}>
                      <TouchableOpacity
                        style={styles.rowLeft}
                        onPress={() => handleDrill(t)}
                        disabled={!hasKids}
                      >
                        <Text style={styles.rowTitle} numberOfLines={2}>
                          {sanitizeTopicLabel(label)}
                        </Text>
                        <Text style={styles.rowMeta}>Level {t.topic_level}</Text>
                      </TouchableOpacity>

                      <View style={styles.rowRight}>
                        {hasKids ? (
                          <TouchableOpacity
                            style={[styles.drillBtn, { borderColor: subjectColor }]}
                            onPress={() => handleDrill(t)}
                          >
                            <Icon name="chevron-forward" size={18} color={subjectColor} />
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.drillSpacer} />
                        )}

                        <TouchableOpacity
                          style={[
                            styles.addBtn,
                            { borderColor: subjectColor, backgroundColor: alreadyAdded ? '#E5E7EB' : subjectColor + '22' },
                          ]}
                          onPress={() => handleAdd(t)}
                          disabled={alreadyAdded || addingId === t.id}
                        >
                          {addingId === t.id ? (
                            <ActivityIndicator size="small" color={subjectColor} />
                          ) : alreadyAdded ? (
                            <Icon name="checkmark" size={18} color="#111" />
                          ) : (
                            <Icon name="add-circle" size={18} color={subjectColor} />
                          )}
                          <Text style={[styles.addText, { color: alreadyAdded ? '#111' : subjectColor }]}>
                            {alreadyAdded ? 'Added' : 'Add'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
                <View style={{ height: 24 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '86%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  crumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  crumbText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '700',
    maxWidth: 180,
  },
  crumbSep: {
    marginLeft: 8,
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '900',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loading: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  empty: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  rowLeft: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  rowMeta: {
    marginTop: 3,
    fontSize: 12,
    color: '#6B7280',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drillBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  drillSpacer: {
    width: 36,
    height: 36,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
  },
  addText: {
    fontSize: 12,
    fontWeight: '900',
  },
});


