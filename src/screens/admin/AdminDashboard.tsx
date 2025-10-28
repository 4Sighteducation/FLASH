import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import { supabase } from '../../services/supabase';

interface DashboardStats {
  totalUsers: number;
  todaySignups: number;
  activeUsers: number;
  starterUsers: number;
  proUsers: number;
  ultimateUsers: number;
  totalCards: number;
  todayCards: number;
}

export default function AdminDashboard() {
  const navigation = useNavigation();
  const { isAdmin } = useAdminAccess();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You do not have admin privileges');
      navigation.goBack();
      return;
    }
    fetchStats();
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get user counts
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      const { count: todaySignups } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      const { count: activeUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_active_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Get tier counts
      const { count: starterUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'starter');

      const { count: proUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'pro');

      const { count: ultimateUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'ultimate');

      // Get card counts
      const { count: totalCards } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true });

      const { count: todayCards } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        todaySignups: todaySignups || 0,
        activeUsers: activeUsers || 0,
        starterUsers: starterUsers || 0,
        proUsers: proUsers || 0,
        ultimateUsers: ultimateUsers || 0,
        totalCards: totalCards || 0,
        todayCards: todayCards || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      Alert.alert('Error', 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
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
            <Text style={styles.title}>Admin Dashboard</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={fetchStats}
            >
              <Ionicons name="refresh" size={24} color="#00F5FF" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading stats...</Text>
            </View>
          ) : (
            <>
              {/* Stats Grid */}
              <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>📊 Overview</Text>
                
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, styles.statCardCyan]}>
                    <Ionicons name="people" size={32} color="#00F5FF" />
                    <Text style={styles.statNumber}>{stats?.totalUsers || 0}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                  </View>

                  <View style={[styles.statCard, styles.statCardPink]}>
                    <Ionicons name="person-add" size={32} color="#FF006E" />
                    <Text style={styles.statNumber}>{stats?.todaySignups || 0}</Text>
                    <Text style={styles.statLabel}>Today</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statCard, styles.statCardPurple]}>
                    <Ionicons name="pulse" size={32} color="#8B5CF6" />
                    <Text style={styles.statNumber}>{stats?.activeUsers || 0}</Text>
                    <Text style={styles.statLabel}>Active (7d)</Text>
                  </View>

                  <View style={[styles.statCard, styles.statCardGreen]}>
                    <Ionicons name="card" size={32} color="#10B981" />
                    <Text style={styles.statNumber}>{stats?.totalCards || 0}</Text>
                    <Text style={styles.statLabel}>Total Cards</Text>
                  </View>
                </View>
              </View>

              {/* Tier Breakdown */}
              <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>💎 User Tiers</Text>
                
                <View style={styles.tierCard}>
                  <View style={styles.tierRow}>
                    <Text style={styles.tierLabel}>Starter (Free)</Text>
                    <Text style={styles.tierCount}>{stats?.starterUsers || 0}</Text>
                  </View>
                  <View style={styles.tierBar}>
                    <View 
                      style={[
                        styles.tierBarFill, 
                        { 
                          width: `${((stats?.starterUsers || 0) / (stats?.totalUsers || 1)) * 100}%`,
                          backgroundColor: '#64748B',
                        }
                      ]} 
                    />
                  </View>
                </View>

                <View style={styles.tierCard}>
                  <View style={styles.tierRow}>
                    <Text style={styles.tierLabel}>Pro</Text>
                    <Text style={styles.tierCount}>{stats?.proUsers || 0}</Text>
                  </View>
                  <View style={styles.tierBar}>
                    <View 
                      style={[
                        styles.tierBarFill, 
                        { 
                          width: `${((stats?.proUsers || 0) / (stats?.totalUsers || 1)) * 100}%`,
                          backgroundColor: '#00F5FF',
                        }
                      ]} 
                    />
                  </View>
                </View>

                <View style={styles.tierCard}>
                  <View style={styles.tierRow}>
                    <Text style={styles.tierLabel}>Ultimate</Text>
                    <Text style={styles.tierCount}>{stats?.ultimateUsers || 0}</Text>
                  </View>
                  <View style={styles.tierBar}>
                    <View 
                      style={[
                        styles.tierBarFill, 
                        { 
                          width: `${((stats?.ultimateUsers || 0) / (stats?.totalUsers || 1)) * 100}%`,
                          backgroundColor: '#FF006E',
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('AdminUserManagement' as never)}
                >
                  <Ionicons name="people" size={24} color="#00F5FF" />
                  <Text style={styles.actionButtonText}>Manage Users</Text>
                  <Ionicons name="chevron-forward" size={20} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('AdminTestTools' as never)}
                >
                  <Ionicons name="flask" size={24} color="#FF006E" />
                  <Text style={styles.actionButtonText}>Test Tools</Text>
                  <Ionicons name="chevron-forward" size={20} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.open('https://qkapwhyxcpgzahuemucg.supabase.co/project/default/editor', '_blank');
                    } else {
                      Alert.alert('Supabase', 'Open supabase.com on your computer');
                    }
                  }}
                >
                  <Ionicons name="server" size={24} color="#8B5CF6" />
                  <Text style={styles.actionButtonText}>Supabase Dashboard</Text>
                  <Ionicons name="open-outline" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </>
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
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  
  // Stats Section
  statsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E2E8F0',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statCardCyan: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  statCardPink: {
    backgroundColor: 'rgba(255, 0, 110, 0.05)',
    borderColor: 'rgba(255, 0, 110, 0.2)',
  },
  statCardPurple: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  statCardGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // Tier Breakdown
  tierCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierLabel: {
    fontSize: 16,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  tierCount: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tierBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tierBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Actions Section
  actionsSection: {
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#E2E8F0',
    fontWeight: '600',
  },
});

