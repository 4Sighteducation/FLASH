export type ExamTrackId =
  | 'GCSE'
  | 'INTERNATIONAL_GCSE'
  | 'A_LEVEL'
  | 'INTERNATIONAL_A_LEVEL'
  | 'VOCATIONAL_L2'
  | 'VOCATIONAL_L3'
  | 'SQA_NATIONALS'
  | 'IB';

export type ExamTrack = {
  id: ExamTrackId;
  name: string;
  description: string;
  disabled?: boolean;
  comingSoon?: boolean;
};

export function normalizeExamTrackId(input: string | null | undefined): ExamTrackId | null {
  const v = (input ?? '').trim();
  if (!v) return null;

  // Backward-compat: older app stored short ids (gcse/alevel/igcse/ialev)
  const lower = v.toLowerCase();
  if (lower === 'gcse') return 'GCSE';
  if (lower === 'alevel') return 'A_LEVEL';
  if (lower === 'igcse') return 'INTERNATIONAL_GCSE';
  if (lower === 'ialev') return 'INTERNATIONAL_A_LEVEL';

  // Accept direct qualification codes
  const upper = v.toUpperCase();
  const allowed: Set<string> = new Set([
    'GCSE',
    'INTERNATIONAL_GCSE',
    'A_LEVEL',
    'INTERNATIONAL_A_LEVEL',
    'VOCATIONAL_L2',
    'VOCATIONAL_L3',
    'SQA_NATIONALS',
    'IB',
  ]);
  return allowed.has(upper) ? (upper as ExamTrackId) : null;
}

export function getExamTracks(): ExamTrack[] {
  return [
    { id: 'GCSE', name: 'GCSE', description: 'Secondary Education' },
    { id: 'INTERNATIONAL_GCSE', name: 'iGCSE', description: 'International GCSE' },
    { id: 'A_LEVEL', name: 'A-Level', description: 'Advanced Level' },
    { id: 'INTERNATIONAL_A_LEVEL', name: 'iA-Level', description: 'International A-Level' },
    { id: 'VOCATIONAL_L2', name: 'Vocational Level 2', description: '14–16 (e.g. Cambridge Nationals)' },
    { id: 'VOCATIONAL_L3', name: 'Vocational Level 3', description: '16–18 (e.g. BTEC Nationals)' },
    { id: 'SQA_NATIONALS', name: 'Scottish Nationals', description: 'National 5, Higher, Adv Higher' },
    { id: 'IB', name: 'International Baccalaureate', description: 'Coming soon', disabled: true, comingSoon: true },
  ];
}

/**
 * Map a user "track" selection to one or more qualification_types.code values in the DB.
 * This is what we actually query against for subjects/topics.
 */
export function trackToQualificationCodes(track: ExamTrackId): string[] {
  switch (track) {
    case 'GCSE':
      return ['GCSE'];
    case 'INTERNATIONAL_GCSE':
      return ['INTERNATIONAL_GCSE'];
    case 'A_LEVEL':
      return ['A_LEVEL'];
    case 'INTERNATIONAL_A_LEVEL':
      return ['INTERNATIONAL_A_LEVEL'];
    case 'VOCATIONAL_L2':
      // Depending on what data exists, you may later add 'BTEC_TECH_AWARDS_L2' here.
      return ['CAMBRIDGE_NATIONALS_L2'];
    case 'VOCATIONAL_L3':
      return ['BTEC_NATIONALS_L3', 'CAMBRIDGE_TECHNICALS_L3'];
    case 'SQA_NATIONALS':
      return ['NATIONAL_5', 'HIGHER', 'ADVANCED_HIGHER'];
    case 'IB':
      return ['IB'];
    default:
      return [];
  }
}

export function getTrackDisplayName(track: string | null | undefined): string {
  const id = normalizeExamTrackId(track);
  if (!id) return (track ?? '').toString();
  const t = getExamTracks().find((x) => x.id === id);
  return t?.name ?? id;
}


