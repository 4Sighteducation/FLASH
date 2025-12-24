/**
 * Normalize subject names for grouping/display.
 *
 * Goal: treat "Physics", "Physics (A-Level)", "Physics (GCSE)" as the same bucket ("Physics").
 * We only strip TRAILING qualifiers in parentheses or after separators, not legitimate internal parentheses.
 */
export function normalizeSubjectName(input: string): string {
  const s = (input ?? '').trim();
  if (!s) return '';

  // Collapse whitespace
  let out = s.replace(/\s+/g, ' ').trim();

  // Remove trailing parenthetical qualifier, e.g. "Physics (A-Level)" -> "Physics"
  // Only strips if it's at the end of the string.
  out = out.replace(/\s*\([^)]*\)\s*$/, '').trim();

  // Remove trailing dash/colon qualifier, e.g. "Physics - A-Level" -> "Physics"
  out = out.replace(/\s*[-:]\s*(gcse|a-?level|as-?level|igcse|international gcse|international a-?level)\s*$/i, '').trim();

  return out;
}


