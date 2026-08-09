// Fetches schedule events + day headers from the Express API.
// Falls back to the bundled static data if the API is unreachable.
// Cached across navigations by useApiData, so revisiting the page renders
// the fetched schedule immediately instead of re-requesting it.

import { useMemo } from "react";
import { useApiData } from "./useApiData";
import {
  scheduleEvents as staticEvents,
  scheduleDays as staticDays,
} from "../data/schedule";
import type { EventColor, ScheduleDay, ScheduleEvent } from "../types";

/** Raw row from the Express API (snake_case DB columns). */
interface ScheduleEventRow {
  id: string;
  day: string;
  start_hour: number | string;
  end_hour: number | string;
  label: string;
  color: EventColor;
  sort_order?: number;
}

// Backend rows are snake_case; the components expect camelCase.
function mapEvent(e: ScheduleEventRow): ScheduleEvent {
  return {
    id: e.id,
    day: e.day,
    startHour: Number(e.start_hour),
    endHour: Number(e.end_hour),
    label: e.label,
    color: e.color,
    sortOrder: e.sort_order,
  };
}

export function useSchedule() {
  const ev = useApiData<ScheduleEventRow[]>("/schedule");
  const day = useApiData<ScheduleDay[]>("/schedule/days");

  const events = useMemo(
    () =>
      Array.isArray(ev.data) && ev.data.length > 0
        ? ev.data.map(mapEvent)
        : staticEvents,
    [ev.data],
  );
  const days =
    Array.isArray(day.data) && day.data.length > 0 ? day.data : staticDays;

  return {
    events,
    days,
    loading: ev.loading || day.loading,
    error: ev.error ?? day.error,
  };
}
