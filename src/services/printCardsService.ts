import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

export type PrintCardSide = 'fronts' | 'backs';
export type PrintLayoutMode = 'cutout' | 'direct';

type FlashcardRow = {
  id: string;
  question: string;
  answer: string;
  box_number?: number | null;
  topic_id?: string | null;
};

function escapeHtml(input: string) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function normalizeText(s: string) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

export function buildIndexCardHtml(opts: {
  title: string;
  cards: FlashcardRow[];
  side: PrintCardSide;
  mode: PrintLayoutMode;
  // Index cards are 3x5in. We render them as 5in(w) x 3in(h) for readability.
  cardWidthIn?: number;
  cardHeightIn?: number;
}) {
  const title = normalizeText(opts.title);
  const side = opts.side;
  const mode = opts.mode;
  const cardW = opts.cardWidthIn ?? 5;
  const cardH = opts.cardHeightIn ?? 3;

  const cards = (opts.cards || []).map((c) => ({
    id: c.id,
    question: normalizeText(c.question),
    answer: normalizeText(c.answer),
    box_number: c.box_number ?? null,
  }));

  // cutout: 2x2 grid on Letter/A4-ish page.
  // direct: one card per page, @page size set to 5in 3in.
  const perPage = mode === 'direct' ? 1 : 4;
  const pages = chunk(cards, perPage);

  const cardContent = (c: typeof cards[number]) => {
    const main = side === 'fronts' ? c.question : c.answer;
    const label = side === 'fronts' ? 'FRONT' : 'BACK';
    return `
      <div class="card">
        <div class="cardHeader">
          <div class="badge">${escapeHtml(label)}</div>
          <div class="meta">${escapeHtml(title)}</div>
        </div>
        <div class="content">${escapeHtml(main || '(empty)')}</div>
        <div class="footer">
          <div class="tiny">FL4SH • 3×5 in</div>
          <div class="tiny">${escapeHtml(c.id.slice(0, 8))}</div>
        </div>
      </div>
    `;
  };

  const pageHtml = (pageCards: typeof cards) => {
    const cardsHtml = pageCards.map(cardContent).join('\n');
    if (mode === 'direct') {
      return `<div class="page direct">${cardsHtml}</div>`;
    }
    return `<div class="page cutout">${cardsHtml}</div>`;
  };

  const allPages = pages.map(pageHtml).join('\n');

  const pageCss =
    mode === 'direct'
      ? `
@page { size: ${cardW}in ${cardH}in; margin: 0.12in; }
body { margin: 0; }
.page.direct { page-break-after: always; display: block; }
`
      : `
@page { size: auto; margin: 0.25in; }
body { margin: 0; }
.page.cutout { page-break-after: always; display: grid; grid-template-columns: repeat(2, ${cardW}in); grid-auto-rows: ${cardH}in; gap: 0.25in; justify-content: center; align-content: start; }
`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    ${pageCss}
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; color: #0B1220; }
    .card {
      width: ${cardW}in;
      height: ${cardH}in;
      border: 1px solid rgba(0,0,0,0.9);
      border-radius: 10px;
      padding: 0.16in;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    /* cut lines */
    .card:before {
      content: "";
      position: absolute;
      inset: -0.08in;
      border: 1px dashed rgba(0,0,0,0.35);
      border-radius: 12px;
      pointer-events: none;
    }
    .cardHeader { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    .badge { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; padding: 3px 6px; border: 1px solid rgba(0,0,0,0.2); border-radius: 999px; }
    .meta { font-size: 10px; font-weight: 700; opacity: 0.75; text-align: right; flex: 1; }
    .content { flex: 1; font-size: 14px; font-weight: 700; line-height: 1.25; white-space: pre-wrap; }
    .footer { display: flex; justify-content: space-between; gap: 10px; margin-top: 8px; }
    .tiny { font-size: 9px; opacity: 0.65; font-weight: 700; }
  </style>
</head>
<body>
  ${allPages}
</body>
</html>`;
}

export async function fetchUserCardsForTopics(opts: { userId: string; topicIds: string[] }) {
  const topicIds = Array.isArray(opts.topicIds) ? opts.topicIds.filter(Boolean) : [];
  if (topicIds.length === 0) return [] as FlashcardRow[];

  // Keep IN lists reasonable; topicIds should already be filtered to topics with cards.
  const { data, error } = await supabase
    .from('flashcards')
    .select('id, question, answer, box_number, topic_id')
    .eq('user_id', opts.userId)
    .in('topic_id', topicIds);

  if (error) throw error;
  return (data || []) as any as FlashcardRow[];
}

export async function generateAndShareOrPrintPdf(opts: {
  title: string;
  cards: FlashcardRow[];
  side: PrintCardSide;
  mode: PrintLayoutMode;
  action: 'print' | 'share';
}) {
  const html = buildIndexCardHtml({
    title: opts.title,
    cards: opts.cards,
    side: opts.side,
    mode: opts.mode,
  });

  if (opts.action === 'share') {
    if (!(await Sharing.isAvailableAsync())) {
      // Fallback: try print UI if sharing isn't available
      await Print.printAsync({ html });
      return;
    }
    const file = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `FL4SH index cards — ${opts.side === 'fronts' ? 'Fronts' : 'Backs'}`,
    });
    return;
  }

  // On Android, printing the same URI repeatedly can show cached content.
  // Printing from HTML forces regeneration and avoids "always fronts" behavior.
  await Print.printAsync({ html });
}

