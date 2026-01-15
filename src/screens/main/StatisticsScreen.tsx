import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import Icon from '../../components/Icon';
import { fetchDailyStudyStats } from '../../services/userSettingsService';
import { showUpgradePrompt } from '../../utils/upgradePrompt';

export default function StatisticsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { tier } = useSubscription();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [range, setRange] = useState<'today' | '7d' | '30d' | '90d'>('30d');

  const rangeLimit = (r: typeof range) => {
    switch (r) {
      case 'today':
        return 1;
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      default:
        return 30;
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) return;
      setLoading(true);
      const data = await fetchDailyStudyStats(user.id, rangeLimit(range));
      if (cancelled) return;
      setRows(data);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, range]);

  // Gated: Pro only (as discussed). You can loosen later.
  const allowed = tier !== 'free';

  if (!allowed) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Statistics</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.lockCard}>
          <Text style={styles.lockTitle}>Pro feature</Text>
          <Text style={styles.lockText}>
            Upgrade to unlock your statistics dashboard (daily progress, accuracy, XP, and timed-study insights).
          </Text>
          <TouchableOpacity
            style={styles.lockBtn}
            onPress={() =>
              showUpgradePrompt({
                message: 'Upgrade to unlock the Statistics Dashboard.',
                ctaLabel: 'View plans',
              })
            }
          >
            <Text style={styles.lockBtnText}>View plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Statistics</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading stats…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.rangeRow}>
            {(['today', '7d', '30d', '90d'] as const).map((key) => {
              const selected = range === key;
              const label = key === 'today' ? 'Today' : key.toUpperCase();
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.rangePill, selected && styles.rangePillSelected]}
                  onPress={() => setRange(key)}
                >
                  <Text style={[styles.rangePillText, selected && styles.rangePillTextSelected]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.subtitle}>
            {range === 'today' ? 'Today' : `Last ${rangeLimit(range)} days`}
          </Text>
          {rows.map((r) => {
            const pct = Math.round(((r.accuracy || 0) * 100) as number);
            return (
              <View key={`${r.study_date}`} style={styles.row}>
                <View style={styles.rowTop}>
                  <Text style={styles.dateText}>{r.study_date}</Text>
                  <Text style={styles.xpText}>⭐ {r.xp_awarded_total || 0} XP</Text>
                </View>
                <View style={styles.rowMid}>
                  <Text style={styles.metric}>📚 {r.reviews_total} reviews</Text>
                  <Text style={styles.metric}>✅ {pct}% correct</Text>
                  <Text style={styles.metric}>⏱️ {r.timed_reviews_total || 0} timed</Text>
                </View>
              </View>
            );
          })}
          {rows.length === 0 ? <Text style={styles.empty}>No study data yet.</Text> : null}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: 14,
      paddingHorizontal: 16,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { color: colors.text, fontSize: 18, fontWeight: '900' },
    subtitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 10 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    loadingText: { color: colors.textSecondary, fontWeight: '700' },
    content: { padding: 16, paddingBottom: 28 },
    rangeRow: { flexDirection: 'row', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
    rangePill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: colors.border,
    },
    rangePillSelected: {
      backgroundColor: 'rgba(20, 184, 166, 0.14)',
      borderColor: 'rgba(20, 184, 166, 0.45)',
    },
    rangePillText: { color: colors.textSecondary, fontWeight: '900', fontSize: 12, letterSpacing: 0.4 },
    rangePillTextSelected: { color: colors.primary },
    row: {
      padding: 14,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dateText: { color: colors.text, fontWeight: '900' },
    xpText: { color: colors.primary, fontWeight: '900' },
    rowMid: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
    metric: { color: colors.textSecondary, fontWeight: '700' },
    empty: { color: colors.textSecondary, fontWeight: '700', marginTop: 20, textAlign: 'center' },
    lockCard: {
      margin: 16,
      padding: 16,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: colors.border,
    },
    lockTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
    lockText: { color: colors.textSecondary, marginTop: 8, fontWeight: '700', lineHeight: 18 },
    lockBtn: {
      marginTop: 12,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    lockBtnText: { color: '#000', fontWeight: '900' },
  });


