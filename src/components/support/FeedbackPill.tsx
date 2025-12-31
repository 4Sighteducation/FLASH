import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import Icon from '../Icon';
import { captureFeedbackScreenshot } from '../../utils/feedbackScreenshot';
import { navigate } from '../../navigation/RootNavigation';

type Props = {
  label?: string;
  hint?: string;
  category?: string;
  contextTitle: string;
  contextHint?: string;
  subjectId?: string | null;
  topicId?: string | null;
  extraParams?: Record<string, any>;
  captureOnPress?: boolean;
};

export default function FeedbackPill(props: Props) {
  const route = useRoute();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [working, setWorking] = useState(false);

  const label = props.label || 'Send feedback';
  const hint = props.hint || 'Help us improve this feature';
  const captureOnPress = props.captureOnPress !== false;

  const open = async () => {
    setWorking(true);
    let uri: string | undefined;
    if (captureOnPress) {
      try {
        uri = await captureFeedbackScreenshot();
      } catch {
        // non-fatal
      }
    }

    // Use root navigation so this always opens ABOVE nested stacks/modals.
    navigate('FeedbackModal', {
      mode: 'feedback',
      contextTitle: props.contextTitle,
      contextHint: props.contextHint,
      defaultCategory: props.category || 'bug',
      sourceRouteName: (route as any)?.name || null,
      sourceRouteParams: (route as any)?.params || null,
      subjectId: props.subjectId || null,
      topicId: props.topicId || null,
      initialScreenshotUri: uri,
      ...(props.extraParams || {}),
    });
    setWorking(false);
  };

  return (
    <TouchableOpacity
      onPress={open}
      disabled={working}
      style={[styles.pill, working && styles.pillDisabled]}
      activeOpacity={0.9}
    >
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Icon name="help-circle-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.hint} numberOfLines={2}>
            {hint}
          </Text>
        </View>
      </View>
      {working ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="chevron-forward" size={20} color={colors.textSecondary} />}
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(0,0,0,0.22)',
    },
    pillDisabled: {
      opacity: 0.7,
    },
    left: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(20,184,166,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(20,184,166,0.35)',
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
    },
    hint: {
      marginTop: 2,
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 16,
    },
  });


