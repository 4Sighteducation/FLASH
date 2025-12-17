import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';
import { useAuth } from '../../contexts/AuthContext';
import { cleanupOrphanedCards, getOrphanedCardsStats } from '../../utils/databaseMaintenance';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import { gamificationConfig, getRankForXp } from '../../services/gamificationService';
import { getAvatarForXp } from '../../services/avatarService';
import { supabase } from '../../services/supabase';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const { theme, toggleTheme } = useTheme();
  const { tier, limits, restorePurchases } = useSubscription();
  const { isAdmin } = useAdminAccess();
  const [cyberUnlocked, setCyberUnlocked] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [inAppNotificationsEnabled, setInAppNotificationsEnabled] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');

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
  const [sendingMessage, setSendingMessage] = useState(false);

  React.useEffect(() => {
    loadNotificationPreferences();
  }, []);

  React.useEffect(() => {
    const loadUnlocks = async () => {
      try {
        if (!user?.id) return;
        const storageKey = `unlocked_theme_cyber_v1_${user.id}`;
        const unlocked = (await AsyncStorage.getItem(storageKey)) === 'true';
        setCyberUnlocked(unlocked);
      } catch {
        setCyberUnlocked(false);
      }
    };
    loadUnlocks();
  }, [user?.id]);

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
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem('notificationsEnabled', value.toString());
    } catch (error) {
      console.error('Error saving notification preference:', error);
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

  const handleCleanupOrphanedCards = async () => {
    if (!user?.id) return;
    
    setIsCleaningUp(true);
    try {
      // First get stats
      const stats = await getOrphanedCardsStats(user.id);
      
      if (!stats || stats.orphanedInStudy === 0) {
        Alert.alert('No Cleanup Needed', 'All your cards are from active subjects.');
        return;
      }
      
      // Show confirmation
      Alert.alert(
        'Clean Up Cards',
        `Found ${stats.orphanedInStudy} cards in study mode from subjects you no longer have active:\n\n${stats.orphanedSubjects.join(', ')}\n\nRemove these cards from study mode?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clean Up',
            style: 'destructive',
            onPress: async () => {
              const result = await cleanupOrphanedCards(user.id);
              if (result.success) {
                Alert.alert(
                  'Cleanup Complete',
                  `Removed ${result.orphanedCount} cards from study mode.`
                );
              } else {
                Alert.alert('Error', 'Failed to clean up cards. Please try again.');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error during cleanup:', error);
      Alert.alert('Error', 'Failed to check for orphaned cards.');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleSendMessage = async () => {
    if (!contactSubject.trim() || !contactMessage.trim()) {
      Alert.alert('Error', 'Please fill in both subject and message fields.');
      return;
    }

    setSendingMessage(true);
    
    // Create email link
    const email = 'support@vespa.academy';
    const subject = `FLASH App Support: ${contactSubject}`;
    const body = `From: ${user?.email || 'Unknown'}\nUsername: ${user?.user_metadata?.username || 'Not set'}\n\n${contactMessage}`;
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        setContactSubject('');
        setContactMessage('');
        setShowContactForm(false);
        Alert.alert('Success', 'Your email app has been opened with your support message.');
      } else {
        Alert.alert('Error', 'Unable to open email app. Please email us directly at support@vespa.academy');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to send message. Please email us directly at support@vespa.academy');
    } finally {
      setSendingMessage(false);
    }
  };

  const profileItems = [
    {
      icon: 'person-outline' as keyof typeof Ionicons.glyphMap,
      label: 'Username',
      value: user?.user_metadata?.username || 'Not set',
    },
    {
      icon: 'mail-outline' as keyof typeof Ionicons.glyphMap,
      label: 'Email',
      value: user?.email || 'Not set',
    },
    {
      icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
      label: 'Member Since',
      value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown',
    },
  ];

  if (showContactForm) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.contactHeader}>
            <TouchableOpacity onPress={() => setShowContactForm(false)}>
              <Icon name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.contactTitle}>Help & Support</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.contactForm} keyboardShouldPersistTaps="handled">
            <Text style={styles.contactDescription}>
              Need help? Have a question or suggestion? We'd love to hear from you!
            </Text>
            
            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What's this about?"
              value={contactSubject}
              onChangeText={setContactSubject}
              editable={!sendingMessage}
            />
            
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Tell us more..."
              value={contactMessage}
              onChangeText={setContactMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!sendingMessage}
            />
            
            <TouchableOpacity
              style={[styles.sendButton, sendingMessage && styles.buttonDisabled]}
              onPress={handleSendMessage}
              disabled={sendingMessage}
            >
              {sendingMessage ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="send" size={20} color="#fff" />
                  <Text style={styles.sendButtonText}>Send Message</Text>
                </>
              )}
            </TouchableOpacity>
            
            <Text style={styles.contactInfo}>
              Or email us directly at: support@vespa.academy
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {(() => {
            const rank = getRankForXp(totalPoints);
            const avatar = getAvatarForXp(totalPoints);
            return (
              <View style={[styles.avatar, { borderColor: rank.current.color }]}>
                <Image source={avatar.source} style={styles.avatarImage} resizeMode="contain" />
              </View>
            );
          })()}
          <Text style={styles.name}>{user?.user_metadata?.username || 'Student'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          {profileItems.map((item, index) => (
            <View key={index} style={styles.infoRow}>
              <Icon name={item.icon} size={24} color="#666" />
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
            {tier === 'free' && (
              <>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => navigation.navigate('Paywall' as never)}
                >
                  <Icon name="star" size={20} color="#fff" />
                  <Text style={styles.upgradeButtonText}>View plans</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.restoreButton}
                  onPress={restorePurchases}
                >
                  <Text style={styles.restoreButtonText}>Restore Purchase</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingRow}>
            <Icon name="color-palette-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Cyber Mode</Text>
            <Switch
              value={theme === 'cyber'}
              onValueChange={(v) => {
                if (v && !cyberUnlocked) {
                  Alert.alert(
                    'Locked',
                    `Cyber Mode unlocks at ${gamificationConfig.themeUnlocks.cyber.toLocaleString()} XP. Keep studying to unlock it!`
                  );
                  return;
                }
                toggleTheme();
              }}
              trackColor={{ false: '#E5E7EB', true: '#00FF88' }}
              thumbColor={theme === 'cyber' ? '#fff' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Icon name="notifications-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#E5E7EB', true: '#00D4FF' }}
              thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Icon name="alert-circle-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Cards Due Reminders</Text>
            <Switch
              value={inAppNotificationsEnabled}
              onValueChange={handleInAppNotificationToggle}
              trackColor={{ false: '#E5E7EB', true: '#00D4FF' }}
              thumbColor={inAppNotificationsEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.settingHint}>
            Show notification banner when you have cards due for review
          </Text>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => setShowContactForm(true)}
          >
            <Icon name="help-circle-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Help & Support</Text>
            <Icon name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => navigation.navigate('APISettings' as never)}
          >
            <Icon name="key-outline" size={24} color="#666" />
            <Text style={styles.settingText}>API Settings</Text>
            <Icon name="chevron-forward" size={24} color="#ccc" />
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Maintenance</Text>
          <TouchableOpacity 
            style={[styles.settingRow, { opacity: isCleaningUp ? 0.6 : 1 }]}
            onPress={handleCleanupOrphanedCards}
            disabled={isCleaningUp}
          >
            <Icon name="trash-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Clean Up Orphaned Cards</Text>
            {isCleaningUp ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Icon name="chevron-forward" size={24} color="#ccc" />
            )}
          </TouchableOpacity>
          <Text style={styles.maintenanceHint}>
            Remove cards from subjects you no longer have active
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#00D4FF',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarImage: {
    width: 92,
    height: 92,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 10,
  },
  maintenanceHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    paddingHorizontal: 40,
  },
  // Contact Form Styles
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  contactForm: {
    flex: 1,
    padding: 20,
  },
  contactDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#00D4FF',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  contactInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 30,
  },
  settingHint: {
    fontSize: 12,
    color: '#666',
    marginTop: -10,
    marginBottom: 10,
    paddingHorizontal: 40,
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
}); 