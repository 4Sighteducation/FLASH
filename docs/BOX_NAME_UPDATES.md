# Leitner Box Terminology Update

## New Names & Review Intervals

| Old | New Name | Review Interval | Emoji |
|-----|----------|-----------------|-------|
| Box 1 | New | Daily | 🌱 |
| Box 2 | Learning | Every 2 days | 📚 |
| Box 3 | Growing | Every 3 days | 🚀 |
| Box 4 | Strong | Weekly | 💪 |
| Box 5 | Mastered | Every 3 weeks | 🏆 |

## Display Format

**Full format (box detail cards):**
```
New 🌱
Review: every day
```

**Compact format (badges, inline):**
```
New 🌱 (Daily)
```

## Implementation Checklist

- [ ] Update `LeitnerSystem.ts` constants
- [ ] Update `StudyScreen.tsx` box info
- [ ] Update `LeitnerBoxes.tsx` component
- [ ] Update `StudyModal.tsx` display
- [ ] Update database (if box names stored)
- [ ] Update any notifications/messages

## Review Interval Logic

```typescript
const BOX_INTERVALS = {
  1: { days: 1, name: 'New', emoji: '🌱', displayInterval: 'Daily' },
  2: { days: 2, name: 'Learning', emoji: '📚', displayInterval: 'Every 2 days' },
  3: { days: 3, name: 'Growing', emoji: '🚀', displayInterval: 'Every 3 days' },
  4: { days: 7, name: 'Strong', emoji: '💪', displayInterval: 'Weekly' },
  5: { days: 21, name: 'Mastered', emoji: '🏆', displayInterval: 'Every 3 weeks' },
};
```

## User-Facing Descriptions

**New 🌱 (Daily)**
"Fresh cards you're seeing for the first time. Review daily to move them forward."

**Learning 📚 (Every 2 days)**
"Cards you're getting the hang of. Keep practicing every other day."

**Growing 🚀 (Every 3 days)**
"You know these but need regular practice. Review every 3 days."

**Strong 💪 (Weekly)**
"Almost mastered! Just weekly check-ins to stay sharp."

**Mastered 🏆 (Every 3 weeks)**
"You've got this! Rare reviews to keep them in long-term memory."







