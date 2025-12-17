import { Alert } from 'react-native';

type Params = {
  title?: string;
  message: string;
  navigation: any;
  ctaLabel?: string;
};

export function showUpgradePrompt({ title = 'Upgrade Required', message, navigation, ctaLabel = 'View plans' }: Params) {
  Alert.alert(title, message, [
    { text: 'Not now', style: 'cancel' },
    {
      text: ctaLabel,
      onPress: () => {
        // Paywall lives inside the Profile stack
        navigation.navigate('Profile' as never, { screen: 'Paywall' } as never);
      },
    },
  ]);
}


