import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import { supabase } from '../../services/supabase';

interface UserProfile {
  user_id: string;
  email: string;
  tier: string;
  is_onboarded: boolean;
  created_at: string;
  last_active_at: string;
  current_streak: number;
}

export default function UserManagement() {
  const navigation = useNavigation();
  const { isAdmin } = useAdminAccess();
  const [searchEmail, setSearchEmail] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You do not have admin privileges');
      navigation.goBack();
    }
  }, [isAdmin]);

  const searchUsers = async () => {
    if (!searchEmail.trim()) {
      Alert.alert('Enter Email', 'Please enter an email to search');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          tier,
          is_onboarded,
          created_at,
          last_active_at,
          current_streak
        `)
        .ilike('email', `%${searchEmail}%`)
        .limit(20);

      if (error) throw error;

      // Fetch emails from auth.users (need to join or separate query)
      const userIds = data?.map(u => u.user_id) || [];
      const usersWithEmails = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
          return {
            ...profile,
            email: authUser?.user?.email || 'Unknown',
          };
        })
      );

      setUsers(usersWithEmails as UserProfile[]);
      
      if (usersWithEmails.length === 0) {
        Alert.alert('No Results', 'No users found matching that email');
      }
    } catch (error: any) {
      console.error('Error searching users:', error);
      Alert.alert('Error', error.message || 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const changeTier = async (userId: string, newTier: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ tier: newTier })
        .eq('user_id', userId);

      if (error) throw error;

      Alert.alert('Success', `User tier updated to ${newTier}`);
      searchUsers(); // Refresh
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update tier');
    }
  };

  const resetOnboarding = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_onboarded: false })
        .eq('user_id', userId);

      if (error) throw error;

      Alert.alert('Success', 'User onboarding reset');
      searchUsers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset onboarding');
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${email}? This will delete:\n\n• User profile\n• All flashcards\n• All progress\n• Auth account\n\nThis cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete flashcards first
              await supabase
                .from('flashcards')
                .delete()
                .eq('user_id', userId);

              // Delete profile
              await supabase
                .from('user_profiles')
                .delete()
                .eq('user_id', userId);

              // Delete auth user (requires service role)
              await supabase.auth.admin.deleteUser(userId);

              Alert.alert('Success', 'User deleted');
              setUsers(users.filter(u => u.user_id !== userId));
              setSelectedUser(null);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#94A3B8" />
            </TouchableOpacity>
            <Text style={styles.title}>User Management</Text>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by email..."
              placeholderTextColor="#64748B"
              value={searchEmail}
              onChangeText={setSearchEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={searchUsers}
              disabled={loading}
            >
              <Ionicons name="search" size={20} color="#0a0f1e" />
            </TouchableOpacity>
          </View>

          {/* Results */}
          {users.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>
                {users.length} user{users.length !== 1 ? 's' : ''} found
              </Text>

              {users.map((user) => (
                <View key={user.user_id} style={styles.userCard}>
                  <TouchableOpacity
                    style={styles.userCardHeader}
                    onPress={() => setSelectedUser(
                      selectedUser?.user_id === user.user_id ? null : user
                    )}
                  >
                    <View style={styles.userInfo}>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      <View style={styles.userMeta}>
                        <View style={[styles.tierBadge, styles[`tier${user.tier}` as keyof typeof styles]]}>
                          <Text style={styles.tierBadgeText}>{user.tier}</Text>
                        </View>
                        <Text style={styles.userDate}>
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <Ionicons 
                      name={selectedUser?.user_id === user.user_id ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#94A3B8" 
                    />
                  </TouchableOpacity>

                  {selectedUser?.user_id === user.user_id && (
                    <View style={styles.userActions}>
                      {/* Tier Change Buttons */}
                      <Text style={styles.actionsLabel}>Change Tier:</Text>
                      <View style={styles.tierButtons}>
                        {['starter', 'pro', 'ultimate'].map((tier) => (
                          <TouchableOpacity
                            key={tier}
                            style={[
                              styles.tierButton,
                              user.tier === tier && styles.tierButtonActive,
                            ]}
                            onPress={() => changeTier(user.user_id, tier)}
                          >
                            <Text style={styles.tierButtonText}>
                              {tier.charAt(0).toUpperCase() + tier.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Other Actions */}
                      <View style={styles.otherActions}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => resetOnboarding(user.user_id)}
                        >
                          <Ionicons name="refresh" size={16} color="#00F5FF" />
                          <Text style={styles.actionBtnText}>Reset Onboarding</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.deleteBtn]}
                          onPress={() => deleteUser(user.user_id, user.email)}
                        >
                          <Ionicons name="trash" size={16} color="#FF006E" />
                          <Text style={[styles.actionBtnText, styles.deleteBtnText]}>
                            Delete User
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* User Stats */}
                      <View style={styles.userStats}>
                        <Text style={styles.userStat}>
                          🔥 Streak: {user.current_streak} days
                        </Text>
                        <Text style={styles.userStat}>
                          ✅ Onboarded: {user.is_onboarded ? 'Yes' : 'No'}
                        </Text>
                        <Text style={styles.userStat}>
                          📅 Last active: {user.last_active_at 
                            ? new Date(user.last_active_at).toLocaleDateString() 
                            : 'Never'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
    ...(Platform.OS === 'web' && {
      backgroundImage: `
        linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
      minHeight: '100vh',
    }),
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchButton: {
    backgroundColor: '#00F5FF',
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Results
  resultsContainer: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 16,
    fontWeight: '600',
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    color: '#E2E8F0',
    fontWeight: '600',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierstarter: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
  },
  tierpro: {
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
  },
  tierultimate: {
    backgroundColor: 'rgba(255, 0, 110, 0.2)',
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  userDate: {
    fontSize: 12,
    color: '#64748B',
  },

  // User Actions
  userActions: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionsLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
    fontWeight: '600',
  },
  tierButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tierButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tierButtonActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderColor: '#00F5FF',
  },
  tierButtonText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  otherActions: {
    gap: 8,
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  deleteBtn: {
    backgroundColor: 'rgba(255, 0, 110, 0.1)',
  },
  actionBtnText: {
    color: '#00F5FF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteBtnText: {
    color: '#FF006E',
  },
  userStats: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  userStat: {
    color: '#94A3B8',
    fontSize: 13,
  },
});

