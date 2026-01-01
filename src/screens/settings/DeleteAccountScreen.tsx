import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

const PRIVACY_URL = 'https://www.fl4shcards.com/privacy/';
const TERMS_URL = 'https://www.fl4shcards.com/terms/';
const CONTACT_URL = 'https://www.fl4shcards.com/contact/';

export default function DeleteAccountScreen({ navigation }: any) {
  const { signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      Alert.alert('Confirm deletion', 'Type DELETE to confirm.');
      return;
    }

    Alert.alert(
      'Delete account',
      'This will permanently delete your account and associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData?.session?.access_token;

              const { data, error } = await supabase.functions.invoke('delete-account', {
                body: {},
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              } as any);

              if (error) throw error;
              if (!data?.success) {
                throw new Error(data?.error || 'Account deletion failed.');
              }

              // Sign out locally (best-effort). Auth deletion should invalidate tokens anyway.
              await signOut();
              Alert.alert('Account deleted', 'Your account has been deleted.');
            } catch (e: any) {
              const msg = typeof e?.message === 'string' ? e.message : 'Failed to delete account.';
              Alert.alert('Error', msg);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Delete account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.warningTitle}>Permanent deletion</Text>
          <Text style={styles.warningText}>
            Deleting your account removes your profile and study data from FL4SH. This cannot be undone.
          </Text>

          <View style={styles.linksRow}>
            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Text style={styles.link}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.sep}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
              <Text style={styles.link}>Terms of Use</Text>
            </TouchableOpacity>
            <Text style={styles.sep}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL(CONTACT_URL)}>
              <Text style={styles.link}>Contact</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Type DELETE to confirm</Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            placeholder="DELETE"
            style={styles.input}
            editable={!isDeleting}
          />

          <TouchableOpacity
            style={[styles.deleteBtn, isDeleting && styles.deleteBtnDisabled]}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.deleteBtnText}>Delete my account</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  warningTitle: { fontSize: 16, fontWeight: '900', color: '#991B1B' },
  warningText: { marginTop: 8, color: '#374151', lineHeight: 20 },
  linksRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  link: { color: '#2563EB', fontWeight: '700' },
  sep: { color: '#9CA3AF', fontWeight: '900' },
  inputLabel: { marginTop: 16, fontSize: 13, color: '#6B7280', fontWeight: '700' },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  deleteBtn: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnDisabled: { opacity: 0.7 },
  deleteBtnText: { color: '#fff', fontWeight: '900' },
});



