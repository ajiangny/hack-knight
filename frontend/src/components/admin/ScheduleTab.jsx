// Schedule admin tab — list / add / delete events, edit day labels.
// Minimal styling; functional baseline for a teammate to restyle later.

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";

const EMPTY_EVENT = {
  day: "fri",
  start_hour: "",
  end_hour: "",
  label: "",
  color: "violet",
};

export default function ScheduleTab() {
  const [{ events, days }, setSchedule] = useState({ events: [], days: [] });
  const [form, setForm] = useState(EMPTY_EVENT);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const [ev, dy] = await Promise.all([
        apiGet("/schedule"),
        apiGet("/schedule/days"),
      ]);
      setSchedule({ events: ev, days: dy });
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    // Initial data fetch; setState happens after the awaited request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function addEvent(e) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("/schedule", {
        day: form.day,
        start_hour: Number(form.start_hour),
        end_hour: Number(form.end_hour),
        label: form.label,
        color: form.color,
      });
      setForm(EMPTY_EVENT);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeEvent(id) {
    if (!confirm("Delete this event?")) return;
    try {
      await apiDelete(`/schedule/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveDayLabel(key, label) {
    try {
      await apiPut(`/schedule/days/${key}`, { label });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-tab">
      {error && <p className="admin-error">{error}</p>}

      <h2>Day Headers</h2>
      <ul className="admin-list">
        {days.map((day) => (
          <li key={day.key}>
            <span>{day.key}</span>
            <input
              defaultValue={day.label}
              onBlur={(e) => saveDayLabel(day.key, e.target.value)}
            />
          </li>
        ))}
      </ul>

      <h2>Events</h2>
      <ul className="admin-list">
        {events.map((ev) => (
          <li key={ev.id}>
            <span>
              {ev.day} {ev.start_hour}–{ev.end_hour} · {ev.label} ({ev.color})
            </span>
            <button onClick={() => removeEvent(ev.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <h2>Add Event</h2>
      <form onSubmit={addEvent} className="admin-form">
        <select
          value={form.day}
          onChange={(e) => setForm({ ...form, day: e.target.value })}
        >
          <option value="fri">fri</option>
          <option value="sat">sat</option>
          <option value="sun">sun</option>
        </select>
        <input
          type="number"
          step="0.5"
          placeholder="start hour"
          value={form.start_hour}
          onChange={(e) => setForm({ ...form, start_hour: e.target.value })}
          required
        />
        <input
          type="number"
          step="0.5"
          placeholder="end hour"
          value={form.end_hour}
          onChange={(e) => setForm({ ...form, end_hour: e.target.value })}
          required
        />
        <input
          placeholder="label"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          required
        />
        <input
          placeholder="color"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
