import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import { supabase } from '../../services/supabase';

type FeedbackRow = {
  id: number;
  created_at: string;
  survey_key: string;
  user_id: string | null;
  status: string;
  answers: any;
  meta: any;
};

export default function AdminFeedbackScreen() {
  const navigation = useNavigation();
  const { isAdmin } = useAdminAccess();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [selected, setSelected] = useState<FeedbackRow | null>(null);

  const title = useMemo(() => (selected ? `Feedback #${selected.id}` : 'App Feedback'), [selected]);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You do not have admin privileges');
      navigation.goBack();
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_feedback')
        .select('id, created_at, survey_key, user_id, status, answers, meta')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows((data as any) || []);
    } catch (e: any) {
      console.error('[AdminFeedback] load failed', e);
      Alert.alert('Error', e?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const renderJson = (obj: any) => {
    try {
      return JSON.stringify(obj || {}, null, 2);
    } catch {
      return String(obj);
    }
  };

  if (!isAdmin) return null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => (selected ? setSelected(null) : navigation.goBack())}>
            <Ionicons name={selected ? 'arrow-back' : 'close'} size={22} color="#94A3B8" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity style={styles.iconBtn} onPress={load} disabled={loading}>
            <Ionicons name="refresh" size={22} color={loading ? '#475569' : '#00F5FF'} />
          </TouchableOpacity>
        </View>

        {selected ? (
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Meta</Text>
              <Text style={styles.mono}>{renderJson(selected.meta)}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Answers</Text>
              <Text style={styles.mono}>{renderJson(selected.answers)}</Text>
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            {loading ? <Text style={styles.loading}>Loading…</Text> : null}

            {rows.map((r) => (
              <TouchableOpacity key={r.id} style={styles.row} onPress={() => setSelected(r)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    #{r.id} • {r.survey_key} • {r.status}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={2}>
                    {new Date(r.created_at).toLocaleString()} • user_id: {r.user_id || '(anon)'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </TouchableOpacity>
            ))}

            {!loading && rows.length === 0 ? <Text style={styles.loading}>No feedback yet.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1e' },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.18)',
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  body: { padding: 14, paddingBottom: 40, gap: 10 },
  loading: { color: '#94A3B8', fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  rowTitle: { color: '#E2E8F0', fontWeight: '900' },
  rowSub: { color: '#94A3B8', fontWeight: '700', marginTop: 4 },
  detailCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  detailTitle: { color: '#00F5FF', fontWeight: '900', marginBottom: 10 },
  mono: { color: '#E2E8F0', fontFamily: 'monospace', fontSize: 12, lineHeight: 16 },
});

