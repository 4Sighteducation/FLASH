/**
 * Utility functions for cleaning and abbreviating topic names
 * 
 * Many scraped topics contain detailed content with HTML tags:
 * "Nature of longitudinal and transverse waves.<br>Examples to include..."
 * 
 * We need to:
 * 1. Display abbreviated version to users
 * 2. Preserve full version for AI card generation context
 */

/**
 * Abbreviate a topic name for display
 * Extracts the main concept before HTML tags or detailed explanations
 */
export function abbreviateTopicName(topicName: string): string {
  if (!topicName) return '';
  
  // Remove common HTML tags
  let cleaned = topicName
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();

  // Strip common trailing curriculum/spec codes like: "Topic title [J587_01_1_5_2]"
  // These appear in some exam-board exports and are not useful in UI labels.
  cleaned = cleaned
    // Bracketed codes (require at least one underscore or slash inside to avoid removing common "[see p2]" text)
    .replace(/\s*\[[^\]]*(?:_|\/)[^\]]*\]\s*$/u, '')
    // Bare codes without brackets (e.g. "... J587_01_1_5_2")
    .replace(/\s+[A-Za-z]{1,6}\d{0,6}(?:_[A-Za-z0-9]+){2,}\s*$/u, '')
    .trim();
  
  // Split by common delimiters
  const delimiters = [
    '.<br>',
    '<br>',
    '. Examples',
    '. Students',
    '. Including',
    '. This',
    '  ', // Double space
  ];
  
  for (const delimiter of delimiters) {
    const parts = cleaned.split(delimiter);
    if (parts.length > 1 && parts[0].length >= 10) {
      // Use first part if it's substantial
      cleaned = parts[0];
      break;
    }
  }
  
  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,;:]$/, '').trim();
  
  // If still too long (>80 chars), truncate at sentence boundary
  if (cleaned.length > 80) {
    const firstSentence = cleaned.match(/^[^.!?]+[.!?]/);
    if (firstSentence && firstSentence[0].length < 80) {
      cleaned = firstSentence[0].replace(/[.!?]$/, '');
    } else {
      // Hard truncate with ellipsis
      cleaned = cleaned.substring(0, 77) + '...';
    }
  }
  
  return cleaned;
}

/**
 * Canonical "safe display" label for any topic-like string.
 * - Strips HTML tags / blob text
 * - Normalizes whitespace
 * - Truncates for UI
 *
 * Use this everywhere we render any topic name that may come from scraping or stored flashcards.
 */
export function sanitizeTopicLabel(
  topicName?: string | null,
  options: { maxLength?: number } = {}
): string {
  if (!topicName) return '';
  const { maxLength = 120 } = options;

  // Start from the existing abbreviation logic (already strips HTML and truncates to ~80)
  let cleaned = abbreviateTopicName(topicName);

  // Normalize whitespace/newlines further (defensive)
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Optional longer/shorter truncation at callsite
  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, Math.max(0, maxLength - 3)).trimEnd() + '...';
  }

  return cleaned;
}

/**
 * Canonical topic label rule (everywhere):
 * - display_name if present
 * - else sanitized topic_name
 * - else raw topic_name (last resort)
 */
export function getTopicLabel(topic: {
  display_name?: string | null;
  topic_name?: string | null;
  // Some tables include `topic_code` (e.g., "1.1.1" or "C1T1S1"). We treat it as a last-resort label fallback.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}): string {
  const display = (topic.display_name || '').trim();
  if (display) {
    // display_name can still contain junk (codes/html) depending on source; sanitize defensively.
    const sanitizedDisplay = sanitizeTopicLabel(display);
    if (sanitizedDisplay) return sanitizedDisplay;
    return display;
  }

  const sanitized = sanitizeTopicLabel(topic.topic_name);
  if (sanitized) {
    // If the topic name is clearly unusable (e.g., just "1"), try using topic_code as a better fallback.
    const looksBad = sanitized.length <= 2 || /^[0-9]+$/.test(sanitized);
    if (looksBad) {
      const code = String((topic as any)?.topic_code || '').trim();
      if (code && code !== sanitized) {
        const codeSanitized = sanitizeTopicLabel(code, { maxLength: 48 });
        if (codeSanitized && codeSanitized !== sanitized) return codeSanitized;
      }
    }
    return sanitized;
  }

  return (topic.topic_name || 'Untitled topic').trim() || 'Untitled topic';
}

/**
 * Get the full topic name with context (for AI)
 */
export function getFullTopicContext(topicName: string): string {
  if (!topicName) return '';
  
  // Replace HTML tags with readable text
  return topicName
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Check if a topic name needs abbreviation
 */
export function needsAbbreviation(topicName: string): boolean {
  if (!topicName) return false;
  
  return (
    topicName.length > 100 ||
    topicName.includes('<br>') ||
    topicName.includes('<br />') ||
    topicName.includes('. Examples') ||
    topicName.includes('. Students')
  );
}

/**
 * Format topic name for display with optional truncation
 */
export function formatTopicForDisplay(
  topicName: string,
  options: {
    abbreviate?: boolean;
    maxLength?: number;
    showEllipsis?: boolean;
  } = {}
): string {
  const { abbreviate = true, maxLength, showEllipsis = true } = options;
  
  let formatted = abbreviate ? abbreviateTopicName(topicName) : topicName;
  
  if (maxLength && formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength - (showEllipsis ? 3 : 0));
    if (showEllipsis) {
      formatted += '...';
    }
  }
  
  return formatted;
}




