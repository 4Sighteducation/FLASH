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



