import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import { getRankForXp } from '../services/gamificationService';
import SystemStatusRankIcon from './SystemStatusRankIcon';

type Props = {
  visible: boolean;
  onClose: () => void;
  totalPoints: number;
};

export default function UnlockedAvatarsModal({ visible, onClose, totalPoints }: Props) {
  const { current } = getRankForXp(totalPoints);
  const ranks = useMemo(
    () => [
      { key: 'rookie', name: 'Standby', minXp: 0, tagline: '“Boot sequence pending.”' },
      { key: 'learner', name: 'Waking Up', minXp: 250, tagline: '“Signal detected. Eyes open.”' },
      { key: 'scholar', name: 'Booting', minXp: 1000, tagline: '“Systems online. Learning engaged.”' },
      { key: 'contender', name: 'Online', minXp: 5000, tagline: '“Connected. Consistent. Dangerous.”' },
      { key: 'ace', name: 'Overclocked', minXp: 20000, tagline: '“Faster recall. Higher stakes.”' },
      { key: 'elite', name: 'Neural Net', minXp: 75000, tagline: '“Patterns mastered. Flow state.”' },
      { key: 'singularity', name: 'Singularity', minXp: 200000, tagline: '“Beyond human. Beyond limits.”' },
    ],
    []
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient colors={['rgba(0,245,255,0.10)', 'rgba(0,0,0,0.25)']} style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Skins Vault</Text>
              <Text style={styles.headerSubtitle}>
                Your desk evolves with you. Current: <Text style={[styles.headerSubtitleStrong, { color: current.color }]}>{current.name}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={22} color="#E2E8F0" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>How it works</Text>
              <Text style={styles.introText}>
                Earn XP → rank up → unlock your next System Status. No store, no grind traps — just progress.
              </Text>
            </View>

            {ranks.map((rank) => {
              const unlocked = totalPoints >= rank.minXp;
              const isCurrent = rank.key === current.key;
              return (
                <View
                  key={rank.key}
                  style={[
                    styles.row,
                    { borderColor: unlocked ? '#00F5FF' : 'rgba(255,255,255,0.10)' },
                    isCurrent && styles.rowCurrent,
                  ]}
                >
                  <View style={[styles.iconWrap, { borderColor: unlocked ? 'rgba(0,245,255,0.40)' : 'rgba(255,255,255,0.14)' }]}>
                    <SystemStatusRankIcon rankKey={rank.key} size={44} withContainerGlow />
                  </View>

                  <View style={styles.rowText}>
                    <View style={styles.rowTitleLine}>
                      <Text style={[styles.rankName, { color: unlocked ? '#E2E8F0' : '#94A3B8' }]}>
                        {rank.name} <Text style={styles.xpAt}>@ {rank.minXp.toLocaleString()} XP</Text>
                      </Text>
                      {isCurrent ? (
                        <View style={[styles.pill, { borderColor: rank.color }]}>
                          <Text style={[styles.pillText, { color: rank.color }]}>EQUIPPED</Text>
                        </View>
                      ) : unlocked ? (
                        <View style={styles.pillMuted}>
                          <Text style={styles.pillMutedText}>UNLOCKED</Text>
                        </View>
                      ) : (
                        <View style={styles.pillLocked}>
                          <Text style={styles.pillLockedText}>LOCKED</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.avatarLabel}>{rank.tagline}</Text>
                  </View>
                </View>
              );
            })}

            <View style={styles.footerSpace} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.18)',
    maxHeight: '86%',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    marginTop: 4,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  headerSubtitleStrong: {
    fontWeight: '900',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  content: {
    padding: 16,
    paddingBottom: 22,
  },
  introCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.16)',
    marginBottom: 12,
  },
  introTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '900',
  },
  introText: {
    marginTop: 6,
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    marginBottom: 10,
  },
  rowCurrent: {
    backgroundColor: 'rgba(0,245,255,0.06)',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: {
    width: 44,
    height: 44,
  },
  iconLocked: {
    opacity: 0.35,
  },
  rowText: {
    flex: 1,
  },
  rowTitleLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rankName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  xpAt: {
    color: '#94A3B8',
    fontWeight: '800',
  },
  avatarLabel: {
    marginTop: 4,
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
  },
  avatarSubtitle: {
    marginTop: 2,
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  pillMuted: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillMutedText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#CBD5E1',
    letterSpacing: 0.3,
  },
  pillLocked: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  pillLockedText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  footerSpace: {
    height: 8,
  },
});


