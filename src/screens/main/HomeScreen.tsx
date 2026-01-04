import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';
import { supabase } from '../../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { useFocusEffect } from '@react-navigation/native';
import { notificationService } from '../../services/notificationService';
import NotificationBadge from '../../components/NotificationBadge';
import DueCardsNotification from '../../components/DueCardsNotification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { gamificationConfig, getRankForXp } from '../../services/gamificationService';
import UnlockedAvatarsModal from '../../components/UnlockedAvatarsModal';
import SystemStatusRankIcon from '../../components/SystemStatusRankIcon';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { showUpgradePrompt } from '../../utils/upgradePrompt';

interface UserSubject {
  id: string;
  subject_id: string;
  exam_board: string;
  color: string;
  gradient_color_1?: string;
  gradient_color_2?: string;
  gradient_color_3?: string;
  use_gradient?: boolean;
  subject: {
    subject_name: string;
    qualification_types?: { code?: string | null } | null;
  };
  flashcard_count?: number;
  topic_count?: number;
}

interface UserData {
  exam_type: string;
  primary_exam_type?: string | null;
  secondary_exam_type?: string | null;
  username: string;
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { tier, limits } = useSubscription();
  const { colors, theme } = useTheme();
  const styles = createStyles(colors, theme);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userSubjects, setUserSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    subject: UserSubject | null;
  }>({ visible: false, subject: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  
  // Notification and gamification state
  const [cardsDue, setCardsDue] = useState<any>({ total: 0, bySubject: {} });
  const [userStats, setUserStats] = useState({ 
    total_points: 0, 
    current_streak: 0, 
    total_cards_reviewed: 0,
    correct_percentage: 0 
  });
  const [showNotification, setShowNotification] = useState(false);
  const [inAppNotificationsEnabled, setInAppNotificationsEnabled] = useState(true);
  const [unlockedCyber, setUnlockedCyber] = useState(false);
  const [showSkinsModal, setShowSkinsModal] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    try {
      // Check if in-app notifications are enabled
      const inAppNotifPref = await AsyncStorage.getItem('inAppNotificationsEnabled');
      const isEnabled = inAppNotifPref === null || inAppNotifPref === 'true'; // Default to true
      setInAppNotificationsEnabled(isEnabled);
      
      // Fetch cards due count
      const dueCount = await notificationService.getCardsDueCount(user.id);
      setCardsDue(dueCount);
      
      // Show notification if there are cards due AND in-app notifications are enabled
      // Only show once per session to avoid annoying users
      if (dueCount.total > 0 && isEnabled) {
        const lastShownKey = `notification_last_shown_${user.id}`;
        const lastShown = await AsyncStorage.getItem(lastShownKey);
        const now = new Date().getTime();
        
        // Show if never shown before OR last shown more than 4 hours ago
        if (!lastShown || (now - parseInt(lastShown)) > (4 * 60 * 60 * 1000)) {
          setTimeout(() => {
            setShowNotification(true);
            AsyncStorage.setItem(lastShownKey, now.toString());
          }, 2000); // Show after 2 second delay (was 1 second)
        }
      }
      
      // Fetch user stats
      const stats = await notificationService.getUserStats(user.id);
      
      // Calculate correct percentage
      let correctPercentage = 0;
      if (stats.total_cards_reviewed > 0) {
        const { data: reviews } = await supabase
          .from('card_reviews')
          .select('was_correct')
          .eq('user_id', user.id);
        
        if (reviews && reviews.length > 0) {
          const correctCount = reviews.filter(r => r.was_correct).length;
          correctPercentage = Math.round((correctCount / reviews.length) * 100);
        }
      }
      
      setUserStats({ ...stats, correct_percentage: correctPercentage });

      // Minimal theme unlock: Cyber Mode at XP threshold (persisted in AsyncStorage)
      try {
        const threshold = gamificationConfig.themeUnlocks.cyber;
        const storageKey = `unlocked_theme_cyber_v1_${user.id}`;
        const alreadyUnlocked = (await AsyncStorage.getItem(storageKey)) === 'true';
        const canUnlock = (stats.total_points || 0) >= threshold;
        if (!alreadyUnlocked && canUnlock) {
          await AsyncStorage.setItem(storageKey, 'true');
          setUnlockedCyber(true);
          Alert.alert('Unlocked! 🎉', `Cyber Mode is now available (earned ${threshold.toLocaleString()} XP).`);
        } else {
          setUnlockedCyber(alreadyUnlocked || canUnlock);
        }
      } catch {
        // non-fatal
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
      fetchNotifications();
    }, [user?.id])
  );

  const fetchUserData = async () => {
    try {
      // Fetch user data
      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('exam_type, primary_exam_type, secondary_exam_type, username')
        .eq('id', user?.id)
        .single();

      if (userError) throw userError;
      setUserData(userInfo);

      // Fetch user subjects with subject details
      const { data: subjects, error: subjectsError } = await supabase
        .from('user_subjects')
        .select(`
          id,
          subject_id,
          exam_board,
          color,
          gradient_color_1,
          gradient_color_2,
          gradient_color_3,
          use_gradient,
          subject:exam_board_subjects!subject_id(subject_name, qualification_types(code))
        `)
        .eq('user_id', user?.id);

      if (subjectsError) throw subjectsError;
      
      // Fetch flashcard counts and topic counts for each subject
      if (subjects && subjects.length > 0) {
        const subjectsWithCounts = await Promise.all(
          subjects.map(async (subject: any) => {
            // Get flashcard count
            const { count: flashcardCount } = await supabase
              .from('flashcards')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user?.id)
              .eq('subject_name', subject.subject.subject_name);
            
            // Get topic count (level 3 topics)
            const { count: topicCount } = await supabase
              .from('curriculum_topics')
              .select('*', { count: 'exact', head: true })
              .eq('exam_board_subject_id', subject.subject_id)
              .eq('topic_level', 3);
            
            return {
              ...subject,
              flashcard_count: flashcardCount || 0,
              topic_count: topicCount || 0
            };
          })
        );
        setUserSubjects(subjectsWithCounts);
      } else {
        // Fix: Ensure subject is object not array
        const fixedSubjects = (subjects || []).map((s: any) => ({
          ...s,
          subject: Array.isArray(s.subject) ? s.subject[0] : s.subject
        }));
        setUserSubjects(fixedSubjects as UserSubject[]);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExamTypeDisplay = (examType: string) => {
    // Backward compatible: older values were stored as gcse/alevel/igcse/ialev.
    // New values use stable track ids / qualification codes.
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
      SQA_NATIONAL_5: 'Scottish National 5',
      SQA_HIGHER: 'Scottish Higher',
      IB: 'International Baccalaureate',
    };
    return types[examType] || examType;
  };

  const handleSubjectPress = (subject: UserSubject) => {
    navigation.navigate('SubjectProgress', { 
      subjectId: subject.subject_id,
      subjectName: subject.subject.subject_name,
      subjectColor: subject.color,
      examBoard: subject.exam_board,
      // Use the subject's own qualification code so mixed-track users get correct topic search + AI prompt.
      examType: subject.subject?.qualification_types?.code || userData?.exam_type,
    });
  };

  const getSubjectAddTracks = (): { primaryTrack: string; secondaryTrack: string | null } | null => {
    // Prefer new dual-track fields, fall back to legacy exam_type.
    const primary = (userData?.primary_exam_type || userData?.exam_type || '').toString().trim();
    if (!primary) return null;
    const secondary = (userData?.secondary_exam_type || '').toString().trim() || null;
    return { primaryTrack: primary, secondaryTrack: secondary };
  };

  const handleDeleteSubject = async () => {
    if (!deleteModal.subject) return;
    
    setIsDeleting(true);
    try {
      // Delete the user_subject record
      const { error } = await supabase
        .from('user_subjects')
        .delete()
        .eq('user_id', user?.id)
        .eq('id', deleteModal.subject.id);

      if (error) throw error;

      // Refresh the subjects list
      await fetchUserData();
      setDeleteModal({ visible: false, subject: null });
    } catch (error) {
      console.error('Error deleting subject:', error);
      Alert.alert('Error', 'Failed to delete subject');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubjectLongPress = (subject: UserSubject) => {
    setDeleteModal({ visible: true, subject });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  const totalPoints = userStats?.total_points ?? 0;
  const rank = getRankForXp(totalPoints);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={colors.gradient}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerTopLeft}>
                <View style={[styles.headerAvatar, { borderColor: rank.current.color }]}>
                <SystemStatusRankIcon rankKey={rank.current.key} size={40} withContainerGlow={false} />
                </View>
                <View>
                  <Text style={styles.greeting}>Welcome back!</Text>
                  <Text style={styles.username}>{userData?.username || 'Student'}</Text>
                </View>
              </View>
              {userData?.exam_type && (
                <View style={styles.examTypeBadge}>
                  <Text style={styles.examTypeText}>
                    {getExamTypeDisplay(userData.exam_type)}
                  </Text>
                </View>
              )}
            </View>

            {/* Rank / Progress */}
            <View style={styles.rankRow}>
              <View style={styles.rankLeft}>
                <View style={[styles.rankBadge, { borderColor: rank.current.color }]}>
                  <Text style={[styles.rankBadgeText, { color: rank.current.color }]}>
                    {rank.current.name.toUpperCase()}
                  </Text>
                </View>
                {rank.next ? (
                  <Text style={styles.rankHint}>
                    Next: {rank.next.name} at {rank.next.minXp.toLocaleString()} XP
                  </Text>
                ) : (
                  <Text style={styles.rankHint}>Max rank reached</Text>
                )}
              </View>
              <TouchableOpacity style={styles.lockPill} onPress={() => setShowSkinsModal(true)}>
                {rank.next ? (
                  <View>
                    <Text style={styles.lockPillTextLine1}>🔓 Next skin: {rank.next.name}</Text>
                    <Text style={styles.lockPillTextLine2}>
                      {rank.next.minXp.toLocaleString()} XP <Text style={styles.lockPillTextDim}>• Tap</Text>
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.lockPillTextLine1}>
                    🏆 Skins Vault <Text style={styles.lockPillTextDim}>• Tap</Text>
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            {rank.next ? (
              <View style={styles.rankProgressBar}>
                <View style={[styles.rankProgressFill, { width: `${Math.round(rank.progressToNext * 100)}%` }]} />
              </View>
            ) : null}
            <View style={styles.headerStats}>
              <View style={styles.headerStatItem}>
                <View style={styles.statIconContainer}>
                  <Icon name="albums" size={16} color="#FFD700" />
                </View>
                <Text style={styles.headerStatNumber}>{userStats.total_cards_reviewed}</Text>
                <Text style={styles.headerStatLabel}>Reviewed</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <View style={styles.statIconContainer}>
                  <Icon name="flame" size={16} color="#FF6B6B" />
                </View>
                <Text style={styles.headerStatNumber}>{userStats.current_streak}</Text>
                <Text style={styles.headerStatLabel}>Streak</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <View style={styles.statIconContainer}>
                  <Icon name="star" size={16} color="#4ECDC4" />
                </View>
                <Text style={styles.headerStatNumber}>{userStats.total_points}</Text>
                <Text style={styles.headerStatLabel}>XP</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <View style={styles.statProgressContainer}>
                  <View style={styles.statProgressBar}>
                    <View 
                      style={[
                        styles.statProgressFill, 
                        { width: `${userStats.correct_percentage}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.percentageText}>{userStats.correct_percentage}%</Text>
                </View>
                <Text style={styles.headerStatLabel}>Correct</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <UnlockedAvatarsModal
          visible={showSkinsModal}
          onClose={() => setShowSkinsModal(false)}
          totalPoints={totalPoints}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Subjects</Text>
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() => setIsGridView(!isGridView)}
          >
            <Ionicons 
              name={isGridView ? "list" : "grid"} 
              size={20} 
              color="#6366F1" 
            />
          </TouchableOpacity>
        </View>
        {userSubjects.length > 0 ? (
          <>
            <View style={isGridView ? styles.subjectsGridView : styles.subjectsGrid}>
              {userSubjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={isGridView ? styles.subjectCardGrid : styles.subjectCard}
                  onPress={() => handleSubjectPress(subject)}
                  onLongPress={() => handleSubjectLongPress(subject)}
                >
                  <View style={styles.subjectCardWrapper}>
                    <LinearGradient
                      colors={
                        subject.use_gradient && subject.gradient_color_1 && subject.gradient_color_2
                          ? (([
                              subject.gradient_color_1,
                              subject.gradient_color_2,
                              subject.gradient_color_3,
                            ].filter(Boolean) as unknown) as [string, string, ...string[]])
                          : ([subject.color || '#6366F1', adjustColor(subject.color || '#6366F1', -20)] as [string, string])
                      }
                      style={isGridView ? styles.subjectGradientGrid : styles.subjectGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={isGridView ? styles.subjectHeaderGrid : styles.subjectHeader}>
                        <Text style={isGridView ? styles.subjectNameGrid : styles.subjectName} numberOfLines={isGridView ? 2 : 1}>
                          {subject.subject.subject_name}
                        </Text>
                        {!isGridView && (
                          <View style={styles.headerButtons}>
                            <TouchableOpacity
                              style={styles.colorButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                navigation.navigate('ColorPicker', {
                                  subjectId: subject.subject_id,
                                  subjectName: subject.subject.subject_name,
                                  currentColor: subject.color,
                                  currentGradient: subject.use_gradient && subject.gradient_color_1 && subject.gradient_color_2
                                    ? {
                                        color1: subject.gradient_color_1,
                                        color2: subject.gradient_color_2,
                                        color3: subject.gradient_color_3 || null,
                                      }
                                    : null,
                                  useGradient: subject.use_gradient || false,
                                });
                              }}
                            >
                              <Icon name="color-palette-outline" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleSubjectLongPress(subject);
                              }}
                            >
                              <Icon name="trash-outline" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                            <Icon name="chevron-forward" size={20} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                      {!isGridView && (
                        <View style={styles.subjectMeta}>
                          <View style={styles.metaBadge}>
                            <Text style={styles.metaText}>{subject.exam_board}</Text>
                          </View>
                          <View style={styles.metaBadge}>
                            <Text style={styles.metaText}>{getExamTypeDisplay(userData?.exam_type || '')}</Text>
                          </View>
                        </View>
                      )}
                      <View style={isGridView ? styles.subjectStatsGrid : styles.subjectStats}>
                        <View style={styles.statItem}>
                          <Icon name="layers" size={isGridView ? 14 : 16} color="#FFFFFF" />
                          <Text style={isGridView ? styles.statTextGrid : styles.statText}>{subject.flashcard_count || 0}</Text>
                        </View>
                      </View>
                      {isGridView && (
                        <View style={styles.gridActions}>
                          <TouchableOpacity
                            style={styles.gridActionButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              navigation.navigate('ColorPicker', {
                                subjectId: subject.subject_id,
                                subjectName: subject.subject.subject_name,
                                currentColor: subject.color,
                                currentGradient: subject.use_gradient && subject.gradient_color_1 && subject.gradient_color_2
                                  ? {
                                      color1: subject.gradient_color_1,
                                      color2: subject.gradient_color_2,
                                      color3: subject.gradient_color_3 || null,
                                    }
                                  : null,
                                useGradient: subject.use_gradient || false,
                              });
                            }}
                          >
                            <Icon name="color-palette-outline" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </LinearGradient>
                    {cardsDue.bySubject[subject.subject.subject_name] > 0 && inAppNotificationsEnabled && (
                      <View style={styles.notificationBadgeContainer}>
                        <View style={styles.dueBadge}>
                          <Text style={styles.dueBadgeText}>
                            {cardsDue.bySubject[subject.subject.subject_name]} due
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => {
                // Enforce Free plan subject limit at the entry point (in addition to server-side insert checks).
                if (tier === 'free' && limits.maxSubjects !== -1 && userSubjects.length >= limits.maxSubjects) {
                  showUpgradePrompt({
                    message: 'The Free plan is limited to 1 subject. Upgrade to Premium for unlimited subjects.',
                    navigation,
                  });
                  return;
                }
                if (userData?.exam_type) {
                  // Use search-based picker that supports blended tracks (primary + optional secondary).
                  const tracks = getSubjectAddTracks();
                  if (tracks) {
                    navigation.navigate('SubjectSearch' as never, tracks as never);
                  } else {
                    navigation.navigate('ExamTypeSelection');
                  }
                } else {
                  navigation.navigate('ExamTypeSelection');
                }
              }}
            >
              <Icon name="add-circle-outline" size={20} color="#6366F1" />
              <Text style={styles.addMoreText}>Add More Subjects</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="school-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No subjects added yet</Text>
            <TouchableOpacity
              style={styles.addSubjectButton}
              onPress={() => {
                if (userData?.exam_type) {
                  const tracks = getSubjectAddTracks();
                  if (tracks) {
                    navigation.navigate('SubjectSearch' as never, tracks as never);
                  } else {
                    navigation.navigate('ExamTypeSelection');
                  }
                } else {
                  // If no exam type, go to exam type selection first
                  navigation.navigate('ExamTypeSelection');
                }
              }}
            >
              <Text style={styles.addSubjectText}>Add Subjects</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CardSubjectSelector')}
          >
            <View style={styles.actionIconContainer}>
              <Icon name="add-circle" size={24} color="#34C759" />
            </View>
            <Text style={styles.actionText}>Create Card</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CardSubjectSelector', { 
              mode: 'image' 
            })}
          >
            <View style={styles.actionIconContainer}>
              <Icon name="camera" size={24} color="#007AFF" />
            </View>
            <Text style={styles.actionText}>Scan Image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionCard,
              userSubjects.reduce((sum, s) => sum + (s.flashcard_count || 0), 0) === 0 && styles.actionCardDisabled
            ]}
            onPress={() => {
              const totalCards = userSubjects.reduce((sum, s) => sum + (s.flashcard_count || 0), 0);
              if (totalCards > 0) {
                navigation.navigate('ManageAllCards');
              }
            }}
            disabled={userSubjects.reduce((sum, s) => sum + (s.flashcard_count || 0), 0) === 0}
          >
            <View style={styles.actionIconContainer}>
              <Icon name="settings-outline" size={24} color="#FF9500" />
            </View>
            <Text style={styles.actionText}>Manage Cards</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <DeleteConfirmationModal
        visible={deleteModal.visible}
        onClose={() => setDeleteModal({ visible: false, subject: null })}
        onConfirm={handleDeleteSubject}
        itemType="Subject"
        itemName={deleteModal.subject?.subject.subject_name || ''}
        isDeleting={isDeleting}
        warningMessage="All flashcards and progress for this subject will be permanently deleted."
      />
      
      <DueCardsNotification
        cardsDue={cardsDue.total}
        visible={showNotification && cardsDue.total > 0 && inAppNotificationsEnabled}
        onPress={() => {
          setShowNotification(false);
          navigation.navigate('Study', { openDailyCards: true });
        }}
        onDismiss={() => setShowNotification(false)}
      />
    </SafeAreaView>
  );
}

const adjustColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme === 'cyber' ? colors.background : '#f0f0f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 245, 255, 0.3)',
  },
  header: {
    marginBottom: 10,
  },
  // headerTop is defined later in this file (keep a single source of truth)
  headerTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 245, 255, 0.18)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerAvatarImage: {
    width: 38,
    height: 38,
  },
  rankRow: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  rankLeft: {
    flex: 1,
  },
  rankBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  rankHint: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },
  rankProgressBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  rankProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  lockPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  lockPillText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '700',
  },
  lockPillTextLine1: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '900',
  },
  lockPillTextLine2: {
    marginTop: 2,
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '800',
  },
  lockPillTextDim: {
    color: '#94A3B8',
    fontWeight: '900',
  },
  greeting: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  username: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  examTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  examTypeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme === 'cyber' ? colors.text : '#333',
    marginBottom: 15,
    paddingHorizontal: 20,
    marginTop: 20,
    ...(theme === 'cyber' && {
      textShadowColor: colors.primary,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 4,
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
  },
  viewToggle: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subjectsGrid: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  subjectsGridView: {
    paddingHorizontal: 20,
    marginBottom: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  subjectCard: {
    borderRadius: 20,
    marginBottom: 20,  // Increased from 16 to give space for floating badge
    overflow: 'visible',  // Allows badge to float above
    // Note: Gradient inside will handle rounded corners via its own borderRadius
  },
  subjectCardGrid: {
    width: '48%',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'visible',  // Allow badges to float in grid view too
  },
  subjectCardWrapper: {
    position: 'relative',  // Needed for absolute positioned badges
  },
  subjectGradient: {
    borderRadius: 18,  // Slightly smaller than container to ensure rounding visible
    padding: 16,
    ...Platform.select({
      web: {
        // Web: Enhanced border glow
        borderWidth: 2,
        borderColor: 'rgba(0, 245, 255, 0.5)',
      },
      default: {
        // Mobile: Proper shadow glow
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
      }
    }),
  },
  subjectGradientGrid: {
    borderRadius: 14,  // Rounded corners!
    padding: 12,  // Reduced padding
    height: 110,  // Reduced from 140 - fit 12 subjects!
    justifyContent: 'space-between',
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subjectHeaderGrid: {
    marginBottom: 8,
  },
  subjectContent: {
    flex: 1,
  },
  subjectName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  subjectNameGrid: {
    fontSize: 15,  // Reduced from 18 - more compact
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 18,  // Tighter line height
  },
  examBoard: {
    fontSize: 14,
    color: '#6B7280',
  },
  subjectMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metaBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  subjectStats: {
    flexDirection: 'row',
    gap: 16,
  },
  subjectStatsGrid: {
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statTextGrid: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: {
        borderWidth: 2,
        borderColor: colors.border,
      },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
      }
    }),
  },
  actionCardDisabled: {
    opacity: 0.4,
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
    color: theme === 'cyber' ? colors.text : '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  addSubjectButton: {
    marginTop: 15,
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  addSubjectText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addMoreButton: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addMoreText: {
    color: '#6366F1',
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  headerStatItem: {
    alignItems: 'center',
    minWidth: 50,
    paddingHorizontal: 2,
  },
  headerStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  headerStatLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  headerStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  notificationBadgeContainer: {
    position: 'absolute',
    top: -12,  // Float well above card
    right: -12,  // Float outside card edge
    zIndex: 1000,  // Ensure it's above everything
  },
  dueBadge: {
    backgroundColor: '#FF006E',  // Neon pink!
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    ...Platform.select({
      web: {
        borderWidth: 2,
        borderColor: '#FF006E',
        boxShadow: '0 0 20px rgba(255, 0, 110, 0.6)',  // Neon glow!
      },
      default: {
        shadowColor: '#FF006E',  // Pink glow on mobile
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 8,
      }
    }),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dueBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statProgressContainer: {
    width: 50,
    alignItems: 'center',
  },
  statProgressBar: {
    height: 12,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 2,
  },
  statProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  percentageText: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    top: 1,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridActions: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  gridActionButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
}); 