import { Alert } from 'react-native';
import { navigate as rootNavigate } from '../navigation/RootNavigation';

type Params = {
  title?: string;
  message: string;
  navigation?: any;
  ctaLabel?: string;
  paywallParams?: any;
};

export function navigateToPaywall(navigation?: any, params?: any) {
  // Prefer the root modal paywall so it can appear immediately above any modal stack.
  try {
    rootNavigate('PaywallModal', params);
    return;
  } catch {
    // fall back to nested navigation below
  }

  // Paywall lives inside the Profile tab stack, so callers inside nested stacks
  // (HomeStack, modals, etc) often need to navigate via a parent navigator.
  const tryNavigate = (nav: any) => {
    try {
      if (!nav?.navigate) return false;
      nav.navigate('Profile' as never, { screen: 'Paywall', params } as never);
      return true;
    } catch {
      return false;
    }
  };

  let nav = navigation;
  for (let i = 0; i < 6; i++) {
    if (tryNavigate(nav)) return;
    nav = nav?.getParent?.();
  }
}

export function showUpgradePrompt({ title = 'Upgrade Required', message, navigation, ctaLabel = 'View plans', paywallParams }: Params) {
  Alert.alert(title, message, [
    { text: 'Not now', style: 'cancel' },
    {
      text: ctaLabel,
      onPress: () => {
        navigateToPaywall(navigation, paywallParams);
      },
    },
  ]);
}





