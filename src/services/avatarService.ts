import { ImageSourcePropType } from 'react-native';
import { getRankForXp } from './gamificationService';

export type AvatarKey =
  | 'ballpoint'
  | 'notebook'
  | 'highlighter'
  | 'stapler'
  | 'glue'
  | 'office-chair'
  | 'printer';

export type AvatarDef = {
  key: AvatarKey;
  label: string;
  subtitle?: string;
  source: ImageSourcePropType;
};

// IMPORTANT: require() paths must be static for React Native bundler.
const avatarsByRankKey: Record<string, AvatarDef> = {
  rookie: {
    key: 'ballpoint',
    label: 'Ballpoint (Borrowed)',
    subtitle: '“Writes… eventually. Definitely not yours.”',
    source: require('../../assets/ballpoint.png'),
  },
  learner: {
    key: 'notebook',
    label: 'Notebook + Pencil',
    subtitle: '“The classic combo. Mistakes welcome.”',
    source: require('../../assets/note-book.png'),
  },
  scholar: {
    key: 'highlighter',
    label: 'Highlighter',
    subtitle: '“Everything is important now.”',
    source: require('../../assets/highlighter.png'),
  },
  contender: {
    key: 'stapler',
    label: 'Stapler',
    subtitle: '“Keeping it together. Literally.”',
    source: require('../../assets/stapler.png'),
  },
  ace: {
    key: 'glue',
    label: 'Glue Bottle',
    subtitle: '“Sticking with it. No excuses.”',
    source: require('../../assets/glue.png'),
  },
  elite: {
    key: 'office-chair',
    label: 'Office Chair',
    subtitle: '“Seated. Serious. Slightly unstoppable.”',
    source: require('../../assets/office-chair.png'),
  },
  legend: {
    key: 'printer',
    label: 'Printer',
    subtitle: '“The final boss machine. Paper fear you.”',
    source: require('../../assets/printer.png'),
  },
};

export function getAvatarForXp(totalPoints: number): AvatarDef {
  const { current } = getRankForXp(totalPoints);
  return avatarsByRankKey[current.key] || avatarsByRankKey.rookie;
}


