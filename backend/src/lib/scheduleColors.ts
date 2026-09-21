// Curated palette for schedule event types. Mirrored in
// frontend/src/lib/scheduleColors.ts and in the CHECK constraint on
// schedule_event_types.color; change all three together.
export const SCHEDULE_COLORS = [
  "violet",
  "cyan",
  "green",
  "orange",
  "pink",
  "lime",
  "tangerine",
] as const;

export type ScheduleColor = (typeof SCHEDULE_COLORS)[number];

export function isScheduleColor(value: unknown): value is ScheduleColor {
  return (SCHEDULE_COLORS as readonly unknown[]).includes(value);
}
