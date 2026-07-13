# feature: goals

Intentionally minimal right now: a single daily calorie + protein target
(`types.ts`), editable from the Today dashboard, and the pure functions that
turn "target vs. what's been logged" into a status and a suggestion
(`lib/daily-progress.ts`) — consumed by `src/components/dashboard`.

`getNextAction()` is deliberately rule-based, not AI. It's the same UI slot
the AI coach will eventually own — replacing it later is a change to what
computes the message, not to how the dashboard renders it.

This is not a full goals system — no multiple goals, no weekly/date-ranged
targets, no goal history. Build that out only when a real need shows up
beyond "what am I aiming for today."
