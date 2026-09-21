// Curated palette for schedule event types. The values are mirrored in
// backend/src/lib/scheduleColors.ts and the schedule_event_types.color
// CHECK constraint; change all three together. Each value also needs a
// `.schedule-event.color-<value>` rule in styles/components.css.
export const SCHEDULE_COLORS = [
  { value: "violet", name: "Violet", swatch: "var(--color-ultraviolet)" },
  { value: "cyan", name: "Blue", swatch: "var(--color-electric-blue)" },
  { value: "green", name: "Teal", swatch: "var(--color-cyber-teal)" },
  { value: "orange", name: "Yellow", swatch: "var(--color-signal-yellow)" },
  { value: "pink", name: "Pink", swatch: "var(--color-neon-pink)" },
  { value: "lime", name: "Lime", swatch: "var(--color-acid-lime)" },
  { value: "tangerine", name: "Tangerine", swatch: "var(--color-tangerine)" },
] as const;

export type EventColor = (typeof SCHEDULE_COLORS)[number]["value"];

export function colorSwatch(color: EventColor | null | undefined): string {
  return (
    SCHEDULE_COLORS.find((c) => c.value === color)?.swatch ??
    "var(--color-ultraviolet)"
  );
}
