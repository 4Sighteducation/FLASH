import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useRoute } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useTheme } from '../../contexts/ThemeContext';
import { captureFeedbackScreenshot } from '../../utils/feedbackScreenshot';

type Mode = 'feedback' | 'support' | 'priority';

type Params = {
  mode?: Mode;
  contextTitle?: string;
  contextHint?: string;
  sourceRouteName?: string;
  sourceRouteParams?: any;
  subjectId?: string;
  topicId?: string;
  defaultCategory?: string;
  initialScreenshotUri?: string;
};

const BUCKET = 'feedback-screenshots';

const CATEGORIES = [
  { key: 'bug', label: 'Bug' },
  { key: 'topics', label: 'Topics' },
  { key: 'ai', label: 'AI cards' },
  { key: 'study', label: 'Study' },
  { key: 'papers', label: 'Papers' },
  { key: 'feature', label: 'Feature' },
  { key: 'other', label: 'Other' },
];

const URGENCY = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
  { key: 'critical', label: 'Critical' },
];

export default function FeedbackModalScreen({ navigation }: any) {
  const route = useRoute();
  const params = ((route as any)?.params || {}) as Params;
  const { user } = useAuth();
  const { tier } = useSubscription();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const mode: Mode = params.mode || 'feedback';
  const isPriority = mode === 'priority';
  const isPro = tier === 'pro';

  const [category, setCategory] = useState(params.defaultCategory || 'bug');
  const [urgency, setUrgency] = useState('medium');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(params.initialScreenshotUri || null);
  const [imageMeta, setImageMeta] = useState<{ mime: string; sizeBytes?: number } | null>(null);

  const title =
    mode === 'priority'
      ? 'Priority support'
      : mode === 'support'
        ? 'Help & support'
        : 'Send feedback';

  const hint =
    params.contextHint ||
    (mode === 'priority'
      ? 'Tell us what’s wrong — we’ll prioritise your message.'
      : 'Tell us what’s wrong (or what you’d like improved).');

  const ensureCanUse = () => {
    if (isPriority && !isPro) {
      Alert.alert('Pro feature', 'Priority support is available on Pro.');
      return false;
    }
    if (!user?.id) {
      Alert.alert('Login required', 'Please log in to send feedback.');
      return false;
    }
    return true;
  };

  const pickImage = async (source: 'capture' | 'library') => {
    const ok = ensureCanUse();
    if (!ok) return;

    if (source === 'library') {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!lib.granted) {
        Alert.alert('Permission needed', 'Photo library permission is required to attach a screenshot.');
        return;
      }
    }

    if (source === 'capture') {
      try {
        const uri = await captureFeedbackScreenshot();
        setImageUri(uri);
        setImageMeta({ mime: 'image/jpeg', sizeBytes: undefined });
      } catch (e) {
        console.warn('[Feedback] captureScreen failed', e);
        Alert.alert(
          'Couldn’t capture screenshot',
          'Please take a normal screenshot and attach it from your Photos instead.'
        );
      }
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.uri) return;

    // Compress to keep uploads + emails reasonable.
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG }
    );

    setImageUri(manipulated.uri);
    setImageMeta({ mime: 'image/jpeg', sizeBytes: undefined });
  };

  const uploadScreenshotIfAny = async (): Promise<null | { bucket: string; path: string; mime?: string; sizeBytes?: number }> => {
    if (!imageUri) return null;
    if (!user?.id) return null;

    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`;
    const path = `${user.id}/${name}`;

    // Validate file exists and has non-zero size first (prevents silent 0-byte uploads).
    const info = await FileSystem.getInfoAsync(imageUri, { size: true });
    if (!info.exists) {
      throw new Error('Screenshot file not found on device.');
    }
    if ((info.size || 0) <= 0) {
      throw new Error('Screenshot file is empty (0 bytes).');
    }

    // Use FileSystem base64 read -> Uint8Array. This is reliably supported across RN platforms.
    // If it returns empty for any reason, fall back to fetch(arrayBuffer).
    let bytes: Uint8Array | null = null;
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (base64 && base64.length > 16) {
        const byteChars = atob(base64);
        const arr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) arr[i] = byteChars.charCodeAt(i);
        bytes = arr;
      }
    } catch (e) {
      console.warn('[Feedback] base64 read failed; will fall back', e);
    }

    if (!bytes || bytes.byteLength === 0) {
      try {
        const ab = await (await fetch(imageUri)).arrayBuffer();
        if (ab.byteLength > 0) bytes = new Uint8Array(ab);
      } catch (e) {
        console.warn('[Feedback] fetch(arrayBuffer) failed', e);
      }
    }

    if (!bytes || bytes.byteLength === 0) {
      throw new Error('Failed to read screenshot bytes (would upload 0 bytes).');
    }

    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes as any, {
      contentType: imageMeta?.mime || 'image/jpeg',
      upsert: false,
    });

    if (error) {
      console.warn('[Feedback] screenshot upload failed', error);
      throw error;
    }

    return {
      bucket: BUCKET,
      path,
      mime: imageMeta?.mime || 'image/jpeg',
      sizeBytes: bytes.byteLength,
    };
  };

  const send = async () => {
    if (!ensureCanUse()) return;
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      Alert.alert('Add a message', 'Please tell us what happened (at least a few words).');
      return;
    }

    setSending(true);
    try {
      const screenshot = await uploadScreenshotIfAny();

      const appVersion = Constants.expoConfig?.version || Constants.nativeAppVersion || 'unknown';
      const appBuild = (Constants.expoConfig as any)?.ios?.buildNumber || (Constants.expoConfig as any)?.android?.versionCode || Constants.nativeBuildVersion || 'unknown';

      const body = {
        message: trimmed,
        category,
        urgency: isPriority ? urgency : null,
        isPriority,
        contextTitle: params.contextTitle || null,
        contextHint: params.contextHint || null,
        sourceRouteName: params.sourceRouteName || null,
        sourceRouteParams: params.sourceRouteParams || null,
        subjectId: params.subjectId || null,
        topicId: params.topicId || null,
        screenshot,
        app: {
          platform: Platform.OS,
          osVersion: String(Device.osVersion || ''),
          deviceModel: String(Device.modelName || ''),
          version: String(appVersion),
          build: String(appBuild),
        },
        metadata: {
          tier,
        },
      };

      const { data, error } = await supabase.functions.invoke('submit-feedback', { body });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send feedback');

      Alert.alert('Sent', 'Thanks — we’ve received your message.');
      navigation.goBack();
    } catch (e: any) {
      console.error('[Feedback] send failed', e);
      Alert.alert('Error', e?.message || 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Icon name="close" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!!params.contextTitle && (
          <View style={styles.contextBox}>
            <Text style={styles.contextTitle}>{params.contextTitle}</Text>
            {!!hint && <Text style={styles.contextHint}>{hint}</Text>}
          </View>
        )}

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipsRow}>
          {CATEGORIES.map((c) => {
            const selected = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setCategory(c.key)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isPriority && (
          <>
            <Text style={styles.label}>Urgency</Text>
            <View style={styles.chipsRow}>
              {URGENCY.map((u) => {
                const selected = urgency === u.key;
                return (
                  <TouchableOpacity
                    key={u.key}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setUrgency(u.key)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{u.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.label}>Message</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Describe the issue, what you expected, and what happened…"
          placeholderTextColor={colors.textSecondary}
          multiline
          style={styles.input}
        />

        <Text style={styles.label}>Screenshot (optional)</Text>
        <View style={styles.screenshotActions}>
          <TouchableOpacity style={styles.screenshotBtn} onPress={() => pickImage('library')}>
            <Icon name="images-outline" size={18} color={colors.text} />
            <Text style={styles.screenshotBtnText}>Attach</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.screenshotBtn} onPress={() => pickImage('capture')}>
            <Icon name="scan-outline" size={18} color={colors.text} />
            <Text style={styles.screenshotBtnText}>Capture screen</Text>
          </TouchableOpacity>
          {imageUri ? (
            <TouchableOpacity
              style={[styles.screenshotBtn, { borderColor: 'rgba(239,68,68,0.6)' }]}
              onPress={() => setImageUri(null)}
            >
              <Icon name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.screenshotBtnText, { color: '#EF4444' }]}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
          </View>
        ) : null}

        <TouchableOpacity style={[styles.sendBtn, sending && styles.sendBtnDisabled]} onPress={send} disabled={sending}>
          <Text style={styles.sendBtnText}>{sending ? 'Sending…' : 'Send'}</Text>
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
    header: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    closeBtn: {
      padding: 8,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: colors.border,
    },
    content: {
      padding: 16,
      paddingBottom: 28,
    },
    contextBox: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
    },
    contextTitle: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 14,
    },
    contextHint: {
      marginTop: 6,
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 16,
    },
    label: {
      marginTop: 12,
      marginBottom: 8,
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '900',
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.22)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    chipSelected: {
      backgroundColor: 'rgba(20, 184, 166, 0.16)',
      borderColor: 'rgba(20, 184, 166, 0.55)',
    },
    chipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    chipTextSelected: {
      color: colors.primary,
      fontWeight: '900',
    },
    input: {
      minHeight: 120,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: colors.text,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: colors.border,
      textAlignVertical: 'top',
    },
    screenshotActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    screenshotBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.22)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    screenshotBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '900',
    },
    previewWrap: {
      marginTop: 12,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(0,0,0,0.22)',
    },
    preview: {
      width: '100%',
      height: 220,
      resizeMode: 'cover',
    },
    sendBtn: {
      marginTop: 18,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.6,
    },
    sendBtnText: {
      color: '#000',
      fontWeight: '900',
      fontSize: 14,
    },
  });


