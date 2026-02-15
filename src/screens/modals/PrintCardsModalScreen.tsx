import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { fetchUserCardsForTopics, generateAndShareOrPrintPdf, PrintLayoutMode, PrintCardSide } from '../../services/printCardsService';

type Params = {
  title: string;
  topicIds: string[];
};

export default function PrintCardsModalScreen({ navigation }: any) {
  const route = useRoute();
  const params = (route.params || {}) as any as Params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const title = params.title || 'Index cards';
  const topicIds = Array.isArray(params.topicIds) ? params.topicIds : [];

  const [mode, setMode] = useState<PrintLayoutMode>('cutout');
  const [side, setSide] = useState<'both' | PrintCardSide>('both');
  const [action, setAction] = useState<'print' | 'share'>('print');
  const [busy, setBusy] = useState(false);

  const close = () => navigation.goBack();

  const run = async (requestedSide: PrintCardSide) => {
    if (busy) return;
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please sign in to print your cards.');
      return;
    }
    if (!topicIds.length) {
      Alert.alert('No cards', 'No topics were selected.');
      return;
    }

    setBusy(true);
    try {
      const cards = await fetchUserCardsForTopics({ userId: user.id, topicIds });
      if (!cards.length) {
        Alert.alert('No cards found', 'There are no cards in this selection yet.');
        return;
      }

      await generateAndShareOrPrintPdf({
        title,
        cards,
        side: requestedSide,
        mode,
        action,
      });
    } catch (e: any) {
      Alert.alert('Could not generate PDF', String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleGo = async () => {
    if (side === 'both') {
      // Fronts first, then backs. This matches the “stack flip” mental model.
      await run('fronts');
      await run('backs');
      return;
    }
    await run(side);
  };

  const printHint =
    mode === 'cutout'
      ? [
          'Recommended for most users.',
          'Print on A4/Letter paper, cut out cards.',
          'For true size: set Scale to 100% and disable “Fit to page”.',
        ]
      : [
          'Advanced: prints one 3×5 card per page.',
          'Works best if your printer supports 3×5 index cards.',
          'Print fronts, flip the stack, then print backs.',
        ];

  return (
    <View style={styles.backdrop}>
      <LinearGradient colors={['rgba(0,245,255,0.10)', 'rgba(255,0,110,0.08)', 'rgba(11,18,32,0.98)']} style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name="print-outline" size={22} color="#00F5FF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Print cards</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{title}</Text>
          </View>
          <TouchableOpacity onPress={close} style={styles.closeBtn} disabled={busy}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>Format</Text>
          <View style={styles.row}>
            <ChoiceButton
              label="Cut‑out (easy)"
              active={mode === 'cutout'}
              onPress={() => setMode('cutout')}
              styles={styles}
            />
            <ChoiceButton
              label="Direct 3×5 (advanced)"
              active={mode === 'direct'}
              onPress={() => setMode('direct')}
              styles={styles}
            />
          </View>

          <View style={styles.hintBox}>
            {printHint.map((t) => (
              <View key={t} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.hintText}>{t}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Sides</Text>
          <View style={styles.row}>
            <ChoiceButton label="Fronts + backs" active={side === 'both'} onPress={() => setSide('both')} styles={styles} />
            <ChoiceButton label="Fronts only" active={side === 'fronts'} onPress={() => setSide('fronts')} styles={styles} />
            <ChoiceButton label="Backs only" active={side === 'backs'} onPress={() => setSide('backs')} styles={styles} />
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Output</Text>
          <View style={styles.row}>
            <ChoiceButton label="Print" active={action === 'print'} onPress={() => setAction('print')} styles={styles} />
            <ChoiceButton label="Save/Share PDF" active={action === 'share'} onPress={() => setAction('share')} styles={styles} />
          </View>

          <TouchableOpacity style={[styles.cta, busy && styles.disabled]} onPress={handleGo} disabled={busy}>
            {busy ? <ActivityIndicator color="#0B1220" /> : <Text style={styles.ctaText}>Generate {action === 'print' ? 'and print' : 'PDF'}</Text>}
            {!busy ? <Ionicons name="arrow-forward" size={18} color="#0B1220" /> : null}
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

function ChoiceButton({ label, active, onPress, styles }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.68)',
      justifyContent: 'center',
      padding: 18,
    },
    card: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
      backgroundColor: 'rgba(11,18,32,0.98)',
      overflow: 'hidden',
      maxHeight: '92%',
    },
    header: {
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,245,255,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(0,245,255,0.25)',
    },
    title: { color: colors.text, fontSize: 16, fontWeight: '900' },
    subtitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
    closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 14, paddingBottom: 18 },
    sectionLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '900' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    choice: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    choiceActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(20,184,166,0.14)',
    },
    choiceText: { color: colors.textSecondary, fontWeight: '900', fontSize: 12 },
    choiceTextActive: { color: colors.primary },
    hintBox: {
      marginTop: 10,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
    bulletRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    bulletDot: { color: colors.textSecondary, fontWeight: '900' },
    hintText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', flex: 1 },
    cta: {
      marginTop: 16,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: '#00F5FF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ctaText: { color: '#0B1220', fontSize: 15, fontWeight: '900' },
    disabled: { opacity: 0.6 },
  });
}

