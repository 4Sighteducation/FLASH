import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { cleanupOrphanedCards, getOrphanedCardsStats } from '../../utils/databaseMaintenance';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const [isCleaningUp, setIsCleaningUp] = React.useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={60} color="#fff" />
          </View>
          <Text style={styles.name}>{user?.user_metadata?.username || 'Student'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          {profileItems.map((item, index) => (
            <View key={index} style={styles.infoRow}>
              <Ionicons name={item.icon} size={24} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => navigation.navigate('APISettings' as never)}
          >
            <Ionicons name="key-outline" size={24} color="#666" />
            <Text style={styles.settingText}>API Settings</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <Ionicons name="notifications-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <Ionicons name="help-circle-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Maintenance</Text>
          <TouchableOpacity 
            style={[styles.settingRow, { opacity: isCleaningUp ? 0.6 : 1 }]}
            onPress={handleCleanupOrphanedCards}
            disabled={isCleaningUp}
          >
            <Ionicons name="trash-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Clean Up Orphaned Cards</Text>
            {isCleaningUp ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            )}
          </TouchableOpacity>
          <Text style={styles.maintenanceHint}>
            Remove cards from subjects you no longer have active
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
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
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
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
}); 