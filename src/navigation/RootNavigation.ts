import { createNavigationContainerRef } from '@react-navigation/native';

// A global navigation ref so we can navigate from non-screen code (e.g. upgradePrompt).
export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: any) {
  if (!navigationRef.isReady()) return;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  navigationRef.navigate(name as never, params as never);
}


