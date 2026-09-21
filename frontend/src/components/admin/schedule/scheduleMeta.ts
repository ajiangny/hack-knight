// Shared vocabulary for the schedule tab — time options and the
// API-row ↔ editor-shape helpers.

import { formatShortTime } from "../../../data/schedule";
import type { ScheduleEvent } from "../../../types";
import type {
  AdminEvent,
  AdminEventType,
  ScheduleEventRow,
  ScheduleEventTypeRow,
} from "../adminTypes";

// 30-minute increments across the full day.
export const TIME_OPTIONS: number[] = Array.from({ length: 49 }, (_, i) => i / 2);

export function mapType(t: ScheduleEventTypeRow): AdminEventType {
  return {
    id: t.id,
    label: t.label,
    color: t.color,
    sortOrder: t.sort_order ?? 0,
  };
}

// Rows without a type_id (loaded from an older seed dump) adopt the first
// type that shares their legacy color, if there is one.
export function mapEvent(e: ScheduleEventRow, types: AdminEventType[]): AdminEvent {
  const color = e.color ?? "violet";
  return {
    id: e.id,
    day: e.day,
    startHour: Number(e.start_hour),
    endHour: Number(e.end_hour),
    label: e.label,
    color,
    typeId: e.type_id ?? types.find((t) => t.color === color)?.id ?? "",
  };
}

type ComparableEvent = Pick<
  AdminEvent,
  "day" | "startHour" | "endHour" | "label" | "typeId"
>;

export function eventsEqual(a: ComparableEvent, b: ComparableEvent): boolean {
  return (
    a.day === b.day &&
    a.startHour === b.startHour &&
    a.endHour === b.endHour &&
    a.label === b.label &&
    a.typeId === b.typeId
  );
}

export function typesEqual(a: AdminEventType, b: AdminEventType): boolean {
  return a.label.trim() === b.label.trim() && a.color === b.color;
}

export function timeRange(ev: Pick<ScheduleEvent, "startHour" | "endHour">): string {
  return `${formatShortTime(ev.startHour)}–${formatShortTime(ev.endHour)}`;
}
