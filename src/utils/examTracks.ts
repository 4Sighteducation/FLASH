export type ExamTrackId =
  | 'GCSE'
  | 'INTERNATIONAL_GCSE'
  | 'A_LEVEL'
  | 'INTERNATIONAL_A_LEVEL'
  | 'VOCATIONAL_L2'
  | 'VOCATIONAL_L3'
  | 'SQA_NATIONAL_5'
  | 'SQA_HIGHER'
  | 'IB';

export type ExamTrack = {
  id: ExamTrackId;
  name: string;
  description: string;
  disabled?: boolean;
  comingSoon?: boolean;
  fullWidth?: boolean;
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

  // Backward-compat: older builds stored this broad SQA id; map to the most common entrypoint.
  if (upper === 'SQA_NATIONALS') return 'SQA_NATIONAL_5';

  const allowed: Set<string> = new Set([
    'GCSE',
    'INTERNATIONAL_GCSE',
    'A_LEVEL',
    'INTERNATIONAL_A_LEVEL',
    'VOCATIONAL_L2',
    'VOCATIONAL_L3',
    'SQA_NATIONAL_5',
    'SQA_HIGHER',
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
    { id: 'SQA_NATIONAL_5', name: 'National 5 Award', description: 'Scottish Nationals (Level 2)' },
    { id: 'SQA_HIGHER', name: 'Higher / Advanced Higher', description: 'Scottish Nationals (Level 3)' },
    { id: 'IB', name: 'IB Diploma', description: 'Coming soon', disabled: true, comingSoon: true, fullWidth: true },
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
    case 'SQA_NATIONAL_5':
      return ['NATIONAL_5'];
    case 'SQA_HIGHER':
      return ['HIGHER', 'ADVANCED_HIGHER'];
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

export function qualificationCodeToDisplayName(code: string | null | undefined): string {
  const v = (code ?? '').toString().trim();
  if (!v) return '';
  const upper = v.toUpperCase();

  // Scottish Nationals
  if (upper === 'NATIONAL_5') return 'National 5';
  if (upper === 'HIGHER') return 'Higher';
  if (upper === 'ADVANCED_HIGHER') return 'Advanced Higher';

  // Common
  if (upper === 'GCSE') return 'GCSE';
  if (upper === 'A_LEVEL') return 'A-Level';
  if (upper === 'INTERNATIONAL_GCSE') return 'iGCSE';
  if (upper === 'INTERNATIONAL_A_LEVEL') return 'iA-Level';
  if (upper === 'IB') return 'IB Diploma';

  // Vocational
  if (upper === 'CAMBRIDGE_NATIONALS_L2') return 'Vocational L2';
  if (upper === 'BTEC_NATIONALS_L3') return 'Vocational L3';
  if (upper === 'CAMBRIDGE_TECHNICALS_L3') return 'Vocational L3';

  // Fallback: prettify SNAKE_CASE
  return upper
    .split('_')
    .map((p) => (p.length ? p[0] + p.slice(1).toLowerCase() : p))
    .join(' ');
}


