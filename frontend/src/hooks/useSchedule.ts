// Fetches schedule events + day headers from the Express API.
// Falls back to the bundled static data if the API is unreachable.

import { useState, useEffect } from "react";
import {
  scheduleEvents as staticEvents,
  scheduleDays as staticDays,
} from "../data/schedule";
import type { EventColor, ScheduleDay, ScheduleEvent } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "";

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
  const [events, setEvents] = useState<ScheduleEvent[]>(staticEvents);
  const [days, setDays] = useState<ScheduleDay[]>(staticDays);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [evRes, dayRes] = await Promise.all([
          fetch(`${API_URL}/schedule`),
          fetch(`${API_URL}/schedule/days`),
        ]);
        if (!evRes.ok || !dayRes.ok) {
          throw new Error("Failed to fetch schedule");
        }
        const [evData, dayData]: [ScheduleEventRow[], ScheduleDay[]] =
          await Promise.all([evRes.json(), dayRes.json()]);
        if (cancelled) return;
        if (Array.isArray(evData) && evData.length > 0) {
          setEvents(evData.map(mapEvent));
        }
        if (Array.isArray(dayData) && dayData.length > 0) {
          setDays(dayData);
        }
      } catch (err) {
        // Keep the static fallback already in state.
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { events, days, loading, error };
}
