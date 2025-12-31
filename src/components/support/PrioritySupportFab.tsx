import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '../Icon';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../navigation/RootNavigation';
import { captureFeedbackScreenshot } from '../../utils/feedbackScreenshot';

export default function PrioritySupportFab() {
  const { tier } = useSubscription();
  const { colors } = useTheme();

  if (tier !== 'pro') return null;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <TouchableOpacity
        style={[styles.fab, { borderColor: 'rgba(0,245,255,0.35)', backgroundColor: 'rgba(0,0,0,0.6)' }]}
        onPress={async () => {
          // Capture *before* opening the modal so we capture the underlying screen, not the form UI.
          let uri: string | undefined;
          try {
            uri = await captureFeedbackScreenshot();
          } catch {
            // non-fatal; user can attach manually
          }
          navigate('FeedbackModal', {
            mode: 'priority',
            contextTitle: 'Priority support',
            contextHint: 'Pro priority support — include steps to reproduce and a screenshot if possible.',
            sourceRouteName: 'global_fab',
            sourceRouteParams: null,
            defaultCategory: 'bug',
            initialScreenshotUri: uri,
          });
        }}
      >
        <Icon name="help-circle-outline" size={20} color={colors.primary} />
        <Text style={[styles.text, { color: colors.primary }]}>Priority</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 14,
    bottom: 86, // sits above tab bar
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});


