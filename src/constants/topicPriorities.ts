export type TopicPriorityValue = 1 | 2 | 3 | 4;

export type TopicPriorityInfo = {
  value: TopicPriorityValue;
  label: string;
  number: string;
  color: string;
  description: string;
};

// IMPORTANT: 1 = highest priority (red). This is the convention used on the subject page.
export const TOPIC_PRIORITY_LEVELS: TopicPriorityInfo[] = [
  { value: 1, label: '🔥 Urgent', number: '1', color: '#EF4444', description: 'Top priority! Critical for exams.' },
  { value: 2, label: '⚡ High Priority', number: '2', color: '#FF006E', description: 'Important topic - needs focus.' },
  { value: 3, label: '📌 Medium Priority', number: '3', color: '#F59E0B', description: 'Useful to know - review when ready.' },
  { value: 4, label: '✅ Low Priority', number: '4', color: '#10B981', description: 'Good to know - review occasionally.' },
];

export function getTopicPriorityInfo(priority: number | null | undefined): TopicPriorityInfo | null {
  if (priority === null || priority === undefined) return null;
  return TOPIC_PRIORITY_LEVELS.find((p) => p.value === priority) || null;
}


