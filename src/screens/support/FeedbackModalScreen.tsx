import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

type Mode = 'feedback' | 'priority' | 'support';
type Category = 'bug' | 'feature' | 'billing' | 'other';

function encodeMailto(value: string) {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

export default function FeedbackModalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const params: any = (route as any)?.params || {};
  const mode: Mode = params.mode || 'feedback';
  const contextTitle: string = params.contextTitle || (mode === 'priority' ? 'Priority support' : 'Feedback');
  const contextHint: string =
    params.contextHint ||
    (mode === 'priority'
      ? 'Tell us what’s wrong. Include steps to reproduce.'
      : 'Tell us what’s wrong or what we can improve.');
  const defaultCategory: Category = params.defaultCategory || 'bug';

  const [category, setCategory] = useState<Category>(defaultCategory);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const close = () => {
    navigation.goBack();
  };

  const openEmail = async () => {
    const from = user?.email || '(unknown email)';
    const subject = `[FL4SH] ${mode === 'priority' ? 'Priority Support' : 'Feedback'} — ${category}`;
    const body = [
      contextTitle ? `Context: ${contextTitle}` : null,
      contextHint ? `Hint: ${contextHint}` : null,
      `User: ${from}`,
      params.sourceRouteName ? `Source: ${params.sourceRouteName}` : null,
      '',
      'Message:',
      message.trim() || '(no message)',
      '',
      '---',
      'If you have a screenshot, please attach it to this email.',
    ]
      .filter(Boolean)
      .join('\n');

    const mailto = `mailto:admin@fl4shcards.com?subject=${encodeMailto(subject)}&body=${encodeMailto(body)}`;
    const can = await Linking.canOpenURL(mailto);
    if (!can) {
      Alert.alert('Email not available', 'Please email us at admin@fl4shcards.com');
      return;
    }
    await Linking.openURL(mailto);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      // For now we use email to avoid relying on any backend function.
      // (This also works for Priority Support.)
      await openEmail();
      close();
    } catch (e: any) {
      Alert.alert('Could not open email', String(e?.message || e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={close} style={styles.iconBtn}>
            <Icon name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{contextTitle}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {contextHint}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipsRow}>
            {(['bug', 'feature', 'billing', 'other'] as Category[]).map((c) => {
              const active = category === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="What happened? Steps to reproduce? What did you expect?"
            placeholderTextColor={colors.textSecondary}
            style={styles.textArea}
            multiline
            autoCapitalize="sentences"
            editable={!sending}
          />

          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.sendBtnText}>{mode === 'priority' ? 'Email priority support' : 'Email feedback'}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            If email doesn’t open, contact us at {'\n'}
            <Text
              style={styles.footerLink}
              onPress={() => Linking.openURL('mailto:admin@fl4shcards.com')}
              suppressHighlighting
            >
              admin@fl4shcards.com
            </Text>
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    title: { color: colors.text, fontSize: 16, fontWeight: '900' },
    subtitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
    content: { padding: 16, paddingBottom: 28 },
    label: { color: colors.textSecondary, fontSize: 12, fontWeight: '900' },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(20,184,166,0.14)',
    },
    chipText: { color: colors.textSecondary, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
    chipTextActive: { color: colors.primary },
    textArea: {
      marginTop: 10,
      minHeight: 130,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.06)',
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      textAlignVertical: 'top',
    },
    sendBtn: {
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.6 },
    sendBtnText: { color: '#000', fontWeight: '900' },
    footerNote: { marginTop: 14, color: colors.textSecondary, fontSize: 12, fontWeight: '700', lineHeight: 18 },
    footerLink: { color: colors.primary, fontWeight: '900' },
  });

