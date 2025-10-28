import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import { supabase } from '../../services/supabase';

export default function TestTools() {
  const navigation = useNavigation();
  const { isAdmin } = useAdminAccess();
  const [loading, setLoading] = useState(false);
  const [testEmailDomain, setTestEmailDomain] = useState('@vespa.academy');

  const deleteAllTestUsers = async () => {
    Alert.alert(
      'Delete All Test Users',
      `This will delete ALL users with email ending in "${testEmailDomain}".\n\nAre you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Find all test users
              const { data: testUsers, error: fetchError } = await supabase
                .rpc('get_test_users', { email_domain: testEmailDomain });

              if (fetchError) {
                // Fallback: query user_profiles
                const { data: profiles } = await supabase
                  .from('user_profiles')
                  .select('user_id');

                // Would need to check emails via auth.admin.getUserById for each
                Alert.alert('Error', 'RPC function not found. Use Supabase dashboard instead.');
                return;
              }

              if (!testUsers || testUsers.length === 0) {
                Alert.alert('No Users', 'No test users found');
                return;
              }

              let deleted = 0;
              for (const userId of testUsers) {
                try {
                  // Delete flashcards
                  await supabase.from('flashcards').delete().eq('user_id', userId);
                  // Delete profile
                  await supabase.from('user_profiles').delete().eq('user_id', userId);
                  // Delete auth
                  await supabase.auth.admin.deleteUser(userId);
                  deleted++;
                } catch (err) {
                  console.error('Error deleting user:', err);
                }
              }

              Alert.alert('Success', `Deleted ${deleted} test users`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete test users');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const resetAllOnboarding = async () => {
    Alert.alert(
      'Reset All Onboarding',
      'This will reset onboarding status for ALL users. Use carefully!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_profiles')
                .update({ is_onboarded: false })
                .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Update all

              if (error) throw error;

              Alert.alert('Success', 'All users onboarding reset');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reset onboarding');
            }
          },
        },
      ]
    );
  };

  const createTestAccount = async () => {
    const randomId = Math.floor(Math.random() * 1000);
    const email = `test${randomId}@vespa.academy`;
    const password = 'Test123!';

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      Alert.alert(
        'Test Account Created',
        `Email: ${email}\nPassword: ${password}\n\nCopy these credentials!`,
        [
          {
            text: 'Copy Email',
            onPress: () => {
              if (Platform.OS === 'web') {
                navigator.clipboard.writeText(email);
              }
            },
          },
          { text: 'OK' },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create test account');
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
            <Text style={styles.title}>Test Tools</Text>
          </View>

          {/* Warning */}
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={24} color="#FF006E" />
            <Text style={styles.warningText}>
              These tools modify production data. Use carefully!
            </Text>
          </View>

          {/* Test Account Creation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🧪 Create Test Account</Text>
            <Text style={styles.sectionDescription}>
              Creates a random test account with email @vespa.academy
            </Text>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={createTestAccount}
              disabled={loading}
            >
              <Ionicons name="person-add" size={20} color="#0a0f1e" />
              <Text style={styles.toolButtonText}>Create Test User</Text>
            </TouchableOpacity>
          </View>

          {/* Delete Test Users */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🗑️ Delete Test Users</Text>
            <Text style={styles.sectionDescription}>
              Delete all users with emails ending in:
            </Text>
            <TextInput
              style={styles.input}
              value={testEmailDomain}
              onChangeText={setTestEmailDomain}
              placeholder="@vespa.academy"
              placeholderTextColor="#64748B"
            />
            <TouchableOpacity
              style={[styles.toolButton, styles.dangerButton]}
              onPress={deleteAllTestUsers}
              disabled={loading}
            >
              <Ionicons name="trash" size={20} color="#FFFFFF" />
              <Text style={styles.dangerButtonText}>Delete Test Users</Text>
            </TouchableOpacity>
          </View>

          {/* Reset Onboarding */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Reset All Onboarding</Text>
            <Text style={styles.sectionDescription}>
              Forces all users back through the onboarding wizard
            </Text>
            <TouchableOpacity
              style={[styles.toolButton, styles.warningButton]}
              onPress={resetAllOnboarding}
              disabled={loading}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.dangerButtonText}>Reset All</Text>
            </TouchableOpacity>
          </View>

          {/* Quick SQL Access */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💻 Quick SQL Queries</Text>
            
            <TouchableOpacity
              style={styles.sqlButton}
              onPress={() => {
                if (Platform.OS === 'web') {
                  window.open('https://qkapwhyxcpgzahuemucg.supabase.co/project/default/editor', '_blank');
                }
              }}
            >
              <Text style={styles.sqlButtonText}>Open Supabase SQL Editor</Text>
              <Ionicons name="open-outline" size={16} color="#00F5FF" />
            </TouchableOpacity>

            <View style={styles.sqlExamples}>
              <Text style={styles.sqlExampleTitle}>Common queries:</Text>
              <Text style={styles.sqlExample}>• Count users by tier</Text>
              <Text style={styles.sqlExample}>• Find users with most cards</Text>
              <Text style={styles.sqlExample}>• View recent signups</Text>
              <Text style={styles.sqlExample}>• Delete specific user's data</Text>
            </View>
          </View>
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
    marginBottom: 24,
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

  // Warning
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 110, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 110, 0.3)',
  },
  warningText: {
    flex: 1,
    color: '#FF006E',
    fontSize: 14,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00F5FF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  toolButtonText: {
    color: '#0a0f1e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: '#FF006E',
  },
  warningButton: {
    backgroundColor: '#F59E0B',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sqlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  sqlButtonText: {
    color: '#00F5FF',
    fontSize: 14,
    fontWeight: '600',
  },
  sqlExamples: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    padding: 12,
  },
  sqlExampleTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  sqlExample: {
    color: '#64748B',
    fontSize: 12,
    marginLeft: 8,
    marginBottom: 4,
  },
});

