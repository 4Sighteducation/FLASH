import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function APISettingsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('user_id', user.id)
        .eq('setting_key', 'openai_api_key')
        .single();

      if (data?.setting_value) {
        setApiKey(data.setting_value);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = async () => {
    if (!user) return;

    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('upsert_app_setting', {
        p_setting_key: 'openai_api_key',
        p_setting_value: apiKey.trim(),
      });

      if (error) throw error;

      Alert.alert('Success', 'API key saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key first');
      return;
    }

    setIsSaving(true);
    try {
      // Test the API key with a simple request
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'API key is valid!');
      } else {
        Alert.alert('Error', 'Invalid API key');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to validate API key');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>API Settings</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>OpenAI API Key</Text>
              <Text style={styles.sectionDescription}>
                Your API key is required to generate flashcards using AI. 
                Get your key from platform.openai.com
              </Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="sk-..."
                  secureTextEntry={!showApiKey}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowApiKey(!showApiKey)}
                >
                  <Ionicons
                    name={showApiKey ? "eye-off" : "eye"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={validateApiKey}
                  disabled={isSaving}
                >
                  <Text style={styles.secondaryButtonText}>Test Key</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={saveApiKey}
                  disabled={isSaving}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSaving ? 'Saving...' : 'Save Key'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <Text style={styles.infoText}>
                  Your API key is stored securely and is only accessible by you
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                <Text style={styles.infoText}>
                  We never share your API key with third parties
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="card" size={20} color="#FF9800" />
                <Text style={styles.infoText}>
                  You will be charged by OpenAI based on your usage
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                // Open OpenAI platform in browser
                // This would need to be implemented with Linking API
              }}
            >
              <Text style={styles.linkButtonText}>
                Get your API key from OpenAI →
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  linkButton: {
    alignItems: 'center',
    padding: 16,
  },
  linkButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
}); 