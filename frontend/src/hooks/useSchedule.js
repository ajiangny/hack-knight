// Fetches schedule events + day headers from the Express API.
// Falls back to the bundled static data if the API is unreachable.

import { useState, useEffect } from "react";
import {
  scheduleEvents as staticEvents,
  scheduleDays as staticDays,
} from "../data/schedule";

const API_URL = import.meta.env.VITE_API_URL ?? "";

// Backend rows are snake_case; the components expect camelCase.
function mapEvent(e) {
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
  const [events, setEvents] = useState(staticEvents);
  const [days, setDays] = useState(staticDays);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        const [evData, dayData] = await Promise.all([
          evRes.json(),
          dayRes.json(),
        ]);
        if (cancelled) return;
        if (Array.isArray(evData) && evData.length > 0) {
          setEvents(evData.map(mapEvent));
        }
        if (Array.isArray(dayData) && dayData.length > 0) {
          setDays(dayData);
        }
      } catch (err) {
        // Keep the static fallback already in state.
        if (!cancelled) setError(err);
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
