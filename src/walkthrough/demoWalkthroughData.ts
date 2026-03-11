export type WalkthroughCardType = 'multiple_choice' | 'short_answer' | 'essay' | 'acronym';

export type DemoFlashcard = {
  id: string;
  question: string;
  answer?: string;
  card_type: WalkthroughCardType;
  options?: string[];
  correct_answer?: string;
  key_points?: string[];
  detailed_answer?: string;
  box_number: number;
  topic?: string;
};

export const DEMO_TOPICS: Array<{ id: string; label: string; similarity: number; fullPath: string }> = [
  { id: 't1', label: 'Photosynthesis', similarity: 0.91, fullPath: 'Biology → Bioenergetics → Photosynthesis' },
  { id: 't2', label: 'Cell Structure', similarity: 0.84, fullPath: 'Biology → Cell biology → Cell structure' },
  { id: 't3', label: 'Double Circulatory System', similarity: 0.78, fullPath: 'Biology → Organisation → Circulatory system' },
];

const baseTopic = (topic: string) => topic;

export const DEMO_CARDS: Record<WalkthroughCardType, DemoFlashcard[]> = {
  multiple_choice: [
    {
      id: 'mcq-1',
      card_type: 'multiple_choice',
      question: 'What is the main purpose of photosynthesis?',
      options: [
        'To break down glucose to release energy',
        'To convert light energy into chemical energy (glucose)',
        'To convert glucose into oxygen',
        'To absorb carbon dioxide for respiration',
      ],
      correct_answer: 'To convert light energy into chemical energy (glucose)',
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
    {
      id: 'mcq-2',
      card_type: 'multiple_choice',
      question: 'Which organelle is the main site of photosynthesis?',
      options: ['Mitochondrion', 'Ribosome', 'Chloroplast', 'Nucleus'],
      correct_answer: 'Chloroplast',
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
    {
      id: 'mcq-3',
      card_type: 'multiple_choice',
      question: 'Which gas is required for photosynthesis?',
      options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
      correct_answer: 'Carbon dioxide',
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
    {
      id: 'mcq-4',
      card_type: 'multiple_choice',
      question: 'Which product of photosynthesis is stored as a carbohydrate?',
      options: ['Oxygen', 'Glucose', 'Water', 'Carbon dioxide'],
      correct_answer: 'Glucose',
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
    {
      id: 'mcq-5',
      card_type: 'multiple_choice',
      question: 'What happens to oxygen produced during photosynthesis?',
      options: ['It is used in photosynthesis', 'It is released as a waste product', 'It is converted into glucose', 'It becomes chlorophyll'],
      correct_answer: 'It is released as a waste product',
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
  ],
  short_answer: [
    {
      id: 'sa-1',
      card_type: 'short_answer',
      question: 'State the word equation for photosynthesis.',
      answer: 'Carbon dioxide + water → glucose + oxygen (in the presence of light and chlorophyll).',
      key_points: ['carbon dioxide + water', 'glucose + oxygen', 'light + chlorophyll (conditions)'],
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
    {
      id: 'sa-2',
      card_type: 'short_answer',
      question: 'Why do plants need chlorophyll?',
      answer: 'To absorb light energy used to drive photosynthesis.',
      key_points: ['absorbs light energy', 'drives photosynthesis'],
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
    {
      id: 'sa-3',
      card_type: 'short_answer',
      question: 'Name one limiting factor of photosynthesis.',
      answer: 'Light intensity (also: carbon dioxide concentration or temperature).',
      key_points: ['light intensity / CO₂ concentration / temperature'],
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
    {
      id: 'sa-4',
      card_type: 'short_answer',
      question: 'Where in the leaf does most photosynthesis occur?',
      answer: 'In the palisade mesophyll cells.',
      key_points: ['palisade mesophyll'],
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
    {
      id: 'sa-5',
      card_type: 'short_answer',
      question: 'Why is glucose important for plants?',
      answer: 'It is used for respiration and can be converted into starch, cellulose, lipids, and proteins.',
      key_points: ['respiration', 'starch/cellulose', 'lipids/proteins'],
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
  ],
  essay: [
    {
      id: 'es-1',
      card_type: 'essay',
      question: 'Explain how photosynthesis supports plant growth and survival.',
      key_points: [
        'Converts light energy into chemical energy (glucose)',
        'Glucose used in respiration to release energy',
        'Glucose converted into storage/structural molecules (starch/cellulose)',
        'Produces oxygen as a by-product',
      ],
      detailed_answer:
        'Photosynthesis converts light energy into chemical energy stored as glucose. Plants use glucose for respiration and as a building block for starch and cellulose. This supports growth, repair, and energy needs; oxygen is produced as a by-product.',
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
    {
      id: 'es-2',
      card_type: 'essay',
      question: 'Discuss limiting factors of photosynthesis and their effects.',
      key_points: ['Light intensity', 'CO₂ concentration', 'Temperature', 'Rate increases then plateaus; enzymes affected by temperature'],
      detailed_answer:
        'The rate of photosynthesis is limited by factors such as light intensity, CO₂ concentration, and temperature. Increasing the limiting factor increases the rate until another factor becomes limiting; temperature affects enzyme activity and can denature enzymes at high temperatures.',
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
  ],
  acronym: [
    {
      id: 'ac-1',
      card_type: 'acronym',
      question: 'Acronym for the limiting factors of photosynthesis (L, C, T).',
      answer: 'LCT: Light intensity, Carbon dioxide, Temperature',
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
    {
      id: 'ac-2',
      card_type: 'acronym',
      question: 'Acronym for photosynthesis requirements (L, C, W, Ch).',
      answer: 'LCWCh: Light, Carbon dioxide, Water, Chlorophyll',
      box_number: 1,
      topic: baseTopic('Photosynthesis'),
    },
  ],
};

