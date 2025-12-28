import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
  Platform,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import { gamificationConfig, getRankForXp } from '../../services/gamificationService';
import SystemStatusRankIcon from '../../components/SystemStatusRankIcon';
import { supabase } from '../../services/supabase';
import { pushNotificationService } from '../../services/pushNotificationService';
import { useUserProfile } from '../../hooks/useUserProfile';
import { navigateToPaywall } from '../../utils/upgradePrompt';
import { getTrackDisplayName, normalizeExamTrackId } from '../../utils/examTracks';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const { theme, colors, setTheme } = useTheme();
  const styles = createStyles(colors);
  const { tier, limits, restorePurchases } = useSubscription();
  const { isAdmin } = useAdminAccess();
  const { profile } = useUserProfile();
  const [totalPoints, setTotalPoints] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [inAppNotificationsEnabled, setInAppNotificationsEnabled] = useState(true);
  const [userInfo, setUserInfo] = useState<{
    exam_type?: string | null;
    primary_exam_type?: string | null;
    secondary_exam_type?: string | null;
    username?: string | null;
  } | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [draftUsername, setDraftUsername] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadUserPoints() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('user_stats')
        .select('total_points')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.warn('[Profile] Failed to load user_stats.total_points', error);
        return;
      }
      setTotalPoints(data?.total_points ?? 0);
    }
    loadUserPoints();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
  
  useEffect(() => {
    let cancelled = false;
    async function loadUserInfo() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('users')
        .select('exam_type, primary_exam_type, secondary_exam_type, username')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn('[Profile] Failed to load users row', error);
        return;
      }
      setUserInfo(data ?? null);
    }
    loadUserInfo();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  React.useEffect(() => {
    loadNotificationPreferences();
  }, []);

  const themeUnlocks = gamificationConfig.themeUnlocks;
  const canUsePulse = totalPoints >= themeUnlocks.pulse;
  const canUseAurora = totalPoints >= themeUnlocks.aurora;
  const canUseSingularity = totalPoints >= themeUnlocks.singularity;

  const themeOptions: Array<{
    key: 'default' | 'pulse' | 'aurora' | 'singularity';
    name: string;
    requiredXp: number;
    unlocked: boolean;
  }> = [
    { key: 'default', name: 'Default', requiredXp: 0, unlocked: true },
    { key: 'pulse', name: 'Pulse', requiredXp: themeUnlocks.pulse, unlocked: canUsePulse },
    { key: 'aurora', name: 'Aurora', requiredXp: themeUnlocks.aurora, unlocked: canUseAurora },
    { key: 'singularity', name: 'Singularity', requiredXp: themeUnlocks.singularity, unlocked: canUseSingularity },
  ];

  const loadNotificationPreferences = async () => {
    try {
      const [pushNotif, inAppNotif] = await Promise.all([
        AsyncStorage.getItem('notificationsEnabled'),
        AsyncStorage.getItem('inAppNotificationsEnabled')
      ]);
      
      if (pushNotif !== null) {
        setNotificationsEnabled(pushNotif === 'true');
      }
      if (inAppNotif !== null) {
        setInAppNotificationsEnabled(inAppNotif === 'true');
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('notificationsEnabled', value.toString());
      if (user?.id) {
        // Keep server-side prefs in sync for scheduled pushes
        await pushNotificationService.upsertPreferences({
          userId: user.id,
          pushEnabled: value,
        });
      }

      if (value) {
        if (!user?.id) {
          Alert.alert('Login Required', 'Please log in to enable push notifications.');
          setNotificationsEnabled(false);
          await AsyncStorage.setItem('notificationsEnabled', 'false');
          return;
        }

        const reg = await pushNotificationService.registerForPushNotifications();
        if (!reg.ok) {
          Alert.alert('Notifications Disabled', reg.reason);
          setNotificationsEnabled(false);
          await AsyncStorage.setItem('notificationsEnabled', 'false');
          await pushNotificationService.upsertPreferences({
            userId: user.id,
            pushEnabled: false,
          });
          return;
        }

        await pushNotificationService.upsertPushToken({
          userId: user.id,
          expoPushToken: reg.expoPushToken,
          enabled: true,
        });
      }

      setNotificationsEnabled(value);
    } catch (error) {
      console.error('Error saving notification preference:', error);
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
    }
  };

  const handleInAppNotificationToggle = async (value: boolean) => {
    setInAppNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem('inAppNotificationsEnabled', value.toString());
    } catch (error) {
      console.error('Error saving in-app notification preference:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: signOut, style: 'destructive' },
      ]
    );
  };

  const handleSelectTheme = async (next: 'default' | 'pulse' | 'aurora' | 'singularity') => {
    const option = themeOptions.find((t) => t.key === next);
    if (!option) return;
    if (!option.unlocked) {
      Alert.alert('Theme locked', `Unlock ${option.name} at ${option.requiredXp.toLocaleString()} XP.`);
      return;
    }
    setTheme(next);
  };

  const getExamTypeDisplay = (examType: string) => {
    // Mirror HomeScreen mapping for consistency
    const types: { [key: string]: string } = {
      gcse: 'GCSE',
      igcse: 'iGCSE',
      alevel: 'A-Level',
      ialev: 'iA-Level',
      GCSE: 'GCSE',
      INTERNATIONAL_GCSE: 'iGCSE',
      A_LEVEL: 'A-Level',
      INTERNATIONAL_A_LEVEL: 'iA-Level',
      VOCATIONAL_L2: 'Vocational Level 2',
      VOCATIONAL_L3: 'Vocational Level 3',
      SQA_NATIONALS: 'Scottish Nationals',
      IB: 'International Baccalaureate',
    };
    return types[examType] || examType || 'Not set';
  };

  const openEditProfile = () => {
    const currentUsername = userInfo?.username || (user?.user_metadata as any)?.username || '';
    setDraftUsername(currentUsername);
    setEditVisible(true);
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    const nextUsername = draftUsername.trim();
    if (!nextUsername) {
      Alert.alert('Username required', 'Please enter a username.');
      return;
    }
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ username: nextUsername })
        .eq('id', user.id);

      if (error) throw error;

      // Keep Auth metadata in sync (best-effort)
      try {
        await supabase.auth.updateUser({ data: { username: nextUsername } });
      } catch (e) {
        console.warn('[Profile] auth.updateUser failed (non-fatal)', e);
      }

      setUserInfo((prev) => ({ ...(prev || {}), username: nextUsername }));
      setEditVisible(false);
    } catch (e: any) {
      console.error('[Profile] saveProfile failed', e);
      Alert.alert('Error', e?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const primaryTrack = normalizeExamTrackId(userInfo?.primary_exam_type || userInfo?.exam_type || null);
  const secondaryTrack = normalizeExamTrackId(userInfo?.secondary_exam_type || null);
  const examTracksLabel = primaryTrack
    ? secondaryTrack
      ? `${getTrackDisplayName(primaryTrack)} + ${getTrackDisplayName(secondaryTrack)}`
      : getTrackDisplayName(primaryTrack)
    : getExamTypeDisplay((userInfo?.exam_type || '') as any);

  const examBoardsLabel = profile?.exam_boards?.length ? profile.exam_boards.join(', ') : 'Not set';

  const subjectsLabel =
    profile?.subjects?.length
      ? (() => {
          const top = profile.subjects.slice(0, 3).map((s) => s.subject_name);
          const extra = profile.subjects.length - top.length;
          return extra > 0 ? `${top.join(', ')} (+${extra} more)` : top.join(', ');
        })()
      : 'Not set';

  const profileItems = [
    { icon: 'person-outline', label: 'Username', value: userInfo?.username || (user?.user_metadata as any)?.username || 'Not set' },
    { icon: 'mail-outline', label: 'Email', value: user?.email || 'Not set' },
    { icon: 'school-outline', label: 'Exam track(s)', value: examTracksLabel || 'Not set' },
    { icon: 'git-network', label: 'Exam board(s)', value: examBoardsLabel },
    { icon: 'book', label: 'Subjects', value: subjectsLabel },
    { icon: 'calendar-outline', label: 'Member Since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {(() => {
            const rank = getRankForXp(totalPoints);
            return (
              <View style={[styles.avatar, { borderColor: rank.current.color }]}>
                <SystemStatusRankIcon rankKey={rank.current.key} size={64} />
              </View>
            );
          })()}
          <Text style={styles.name}>{userInfo?.username || (user?.user_metadata as any)?.username || 'Student'}</Text>
          <TouchableOpacity style={styles.editProfileButton} onPress={openEditProfile}>
            <Icon name="create-outline" size={18} color={colors.text} />
            <Text style={styles.editProfileButtonText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.smallLinkButton}
                onPress={() =>
                  navigation.navigate(
                    'ExamTypeSelection' as never,
                    {
                      mode: 'profile_add_track',
                      initialPrimaryTrack: primaryTrack,
                      initialSecondaryTrack: secondaryTrack,
                    } as never
                  )
                }
              >
                <Text style={styles.smallLinkButtonText}>Add exam track</Text>
                <Icon name="chevron-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallLinkButton} onPress={() => navigation.navigate('SubjectSearch' as never, { isAddingSubjects: true } as never)}>
                <Text style={styles.smallLinkButtonText}>Manage subjects</Text>
                <Icon name="chevron-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          {profileItems.map((item, index) => (
            <View key={index} style={styles.infoRow}>
              <Icon name={item.icon} size={22} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.subscriptionStatus}>
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionTier}>
                {tier === 'free' ? 'Free' : tier === 'premium' ? 'Premium' : 'Pro'}
              </Text>
              {tier === 'free' && (
                <Text style={styles.subscriptionLimits}>
                  • {limits.maxSubjects} Subject{'\n'}
                  • {limits.maxTopicsPerSubject} Topic{'\n'}
                  • {limits.maxCards} Cards Maximum
                </Text>
              )}
            </View>
            <>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => navigateToPaywall()}
              >
                <Icon name="star" size={20} color="#fff" />
                <Text style={styles.upgradeButtonText}>
                  {tier === 'free' ? 'View plans' : 'Manage / View plans'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.restoreButton} onPress={restorePurchases}>
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.manageStoreButton}
                  onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
                >
                  <Text style={styles.manageStoreButtonText}>Manage in App Store</Text>
                </TouchableOpacity>
              )}

              {Platform.OS === 'android' && (
                <TouchableOpacity
                  style={styles.manageStoreButton}
                  onPress={() => Linking.openURL('https://play.google.com/store/account/subscriptions')}
                >
                  <Text style={styles.manageStoreButtonText}>Manage in Google Play</Text>
                </TouchableOpacity>
              )}
            </>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.themesBlock}>
            <View style={styles.themesHeaderRow}>
              <Icon name="color-palette-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.themesTitle}>Themes</Text>
            </View>
            <Text style={styles.themesHint}>
              Unlock themes at {themeUnlocks.pulse.toLocaleString()} XP, {themeUnlocks.aurora.toLocaleString()} XP, and {themeUnlocks.singularity.toLocaleString()} XP.
            </Text>
            <View style={styles.themesList}>
              {themeOptions.map((opt) => {
                const isSelected = theme === opt.key;
                const label = opt.unlocked ? opt.name : `${opt.name} (locked)`;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.themeOptionButton,
                      isSelected && styles.themeOptionButtonSelected,
                      !opt.unlocked && styles.themeOptionButtonLocked,
                    ]}
                    onPress={() => handleSelectTheme(opt.key)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.themeOptionTitle, isSelected && styles.themeOptionTitleSelected]}>
                        {label}
                      </Text>
                      {!opt.unlocked && (
                        <Text style={styles.themeOptionSubtitle}>
                          Unlock at {opt.requiredXp.toLocaleString()} XP
                        </Text>
                      )}
                    </View>
                    {isSelected && <Icon name="checkmark-circle" size={22} color={colors.primary} />}
                    {!isSelected && opt.unlocked && <Icon name="chevron-forward" size={22} color={colors.textSecondary} />}
                    {!opt.unlocked && <Icon name="lock-closed-outline" size={20} color={colors.textSecondary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          
          <View style={styles.settingRow}>
            <Icon name="notifications-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.settingText}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: 'rgba(255,255,255,0.18)', true: colors.primary }}
              thumbColor={notificationsEnabled ? '#fff' : '#CBD5E1'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Icon name="alert-circle-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.settingText}>Cards Due Reminders</Text>
            <Switch
              value={inAppNotificationsEnabled}
              onValueChange={handleInAppNotificationToggle}
              trackColor={{ false: 'rgba(255,255,255,0.18)', true: colors.primary }}
              thumbColor={inAppNotificationsEnabled ? '#fff' : '#CBD5E1'}
            />
          </View>
          <Text style={styles.settingHintBelow}>
            Show notification banner when you have cards due for review
          </Text>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => Linking.openURL('https://www.fl4shcards.com/contact/')}
          >
            <Icon name="help-circle-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.settingText}>Help & Support</Text>
            <Icon name="open-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL('https://www.fl4shcards.com/privacy/')}
          >
            <Icon name="document-text-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.settingText}>Privacy Policy</Text>
            <Icon name="open-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL('https://www.fl4shcards.com/terms/')}
          >
            <Icon name="document-text-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.settingText}>Terms of Use (EULA)</Text>
            <Icon name="open-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('DeleteAccount' as never)}
          >
            <Icon name="trash-outline" size={24} color="#DC2626" />
            <Text style={[styles.settingText, { color: '#DC2626', fontWeight: '600' }]}>Delete Account</Text>
            <Icon name="chevron-forward" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity 
              style={[styles.settingRow, styles.adminRow]}
              onPress={() => navigation.navigate('AdminDashboard' as never)}
            >
              <Icon name="shield-checkmark" size={24} color="#00F5FF" />
              <Text style={[styles.settingText, styles.adminText]}>Admin Panel</Text>
              <Icon name="chevron-forward" size={24} color="#00F5FF" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Edit Profile Modal */}
        <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Edit profile</Text>
              <Text style={styles.modalLabel}>Username</Text>
              <TextInput
                style={styles.modalInput}
                value={draftUsername}
                onChangeText={setDraftUsername}
                placeholder="Enter a username"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setEditVisible(false)} disabled={savingProfile}>
                  <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonPrimary} onPress={saveProfile} disabled={savingProfile}>
                  <Text style={styles.modalButtonPrimaryText}>{savingProfile ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    // Dark "stage" so neon status icon pops
    backgroundColor: '#0B1220',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    // Mobile-first: make the status icon feel "powered on"
    shadowColor: '#14b8a6',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  avatarImage: {
    width: 92,
    height: 92,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  editProfileButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  editProfileButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  smallLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  smallLinkButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 15,
  },
  settingHintBelow: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 12,
    paddingLeft: 38,
  },
  themesBlock: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 6,
  },
  themesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themesTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  themesHint: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    paddingLeft: 34,
  },
  themesList: {
    marginTop: 10,
    gap: 10,
  },
  themeOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  themeOptionButtonSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.45)',
  },
  themeOptionButtonLocked: {
    opacity: 0.6,
  },
  themeOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  themeOptionTitleSelected: {
    color: colors.primary,
  },
  themeOptionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  adminRow: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  adminText: {
    color: '#00F5FF',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 10,
  },
  // Edit modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 18,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  modalLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  modalInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: colors.text,
    fontWeight: '900',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    color: '#000',
    fontWeight: '900',
  },
  // Subscription styles
  subscriptionStatus: {
    alignItems: 'center',
  },
  subscriptionInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  subscriptionTier: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  subscriptionLimits: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#00D4FF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
    width: '100%',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    paddingVertical: 8,
  },
  restoreButtonText: {
    color: '#00D4FF',
    fontSize: 14,
    fontWeight: '500',
  },
  manageStoreButton: {
    paddingVertical: 8,
  },
  manageStoreButtonText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
});