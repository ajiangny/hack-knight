// Add / edit event modal for the schedule tab.

import { useState } from "react";
import { formatFullTime } from "../../../data/schedule";
import type { ScheduleDay } from "../../../types";
import { Field, Modal } from "../ui";
import type { AdminEventType, EventForm } from "../adminTypes";
import { colorSwatch } from "../../../lib/scheduleColors";
import { TIME_OPTIONS } from "./scheduleMeta";

interface EventModalProps {
  open: boolean;
  initial: EventForm | null;
  days: ScheduleDay[];
  types: AdminEventType[];
  onSubmit: (form: EventForm) => void;
  onClose: () => void;
}

export default function EventModal({ open, initial, days, types, onSubmit, onClose }: EventModalProps) {
  const [form, setForm] = useState(initial);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form when a new event is opened — state adjustment during
  // render (not an effect) so the previous form persists through the
  // modal's exit animation.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    if (initial) {
      setForm(initial);
      setFormError(null);
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    if (!form.label.trim()) {
      setFormError("Label is required");
      return;
    }
    if (!types.some((t) => t.id === form.typeId)) {
      setFormError("Pick an event type");
      return;
    }
    if (form.endHour <= form.startHour) {
      setFormError("End time must be after the start time");
      return;
    }
    onSubmit({ ...form, label: form.label.trim() });
  }

  if (!form) return null;

  return (
    <Modal
      open={open}
      title={form.id ? "Edit Event" : "New Event"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Label" htmlFor="event-label">
          <input
            id="event-label"
            className="admin-input"
            placeholder="e.g. Opening Ceremony"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Day" htmlFor="event-day">
            <select
              id="event-day"
              className="admin-select"
              value={form.day}
              onChange={(e) => setForm({ ...form, day: e.target.value })}
            >
              {days.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start" htmlFor="event-start">
            <select
              id="event-start"
              className="admin-select"
              value={form.startHour}
              onChange={(e) =>
                setForm({ ...form, startHour: Number(e.target.value) })
              }
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {formatFullTime(t)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="End" htmlFor="event-end">
            <select
              id="event-end"
              className="admin-select"
              value={form.endHour}
              onChange={(e) =>
                setForm({ ...form, endHour: Number(e.target.value) })
              }
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {formatFullTime(t)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Type">
          {types.length === 0 ? (
            <p className="admin-help">
              No event types yet. Add one in the Event Types panel first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Event type">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm({ ...form, typeId: t.id })}
                  aria-pressed={form.typeId === t.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs uppercase tracking-wide transition-colors duration-150 ease-brand ${
                    form.typeId === t.id
                      ? "border-ultraviolet/60 bg-black/30 text-text-primary"
                      : "border-border/40 text-text-secondary hover:border-border/60"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-pill"
                    style={{ background: colorSwatch(t.color) }}
                    aria-hidden="true"
                  />
                  {t.label.trim() || "Untitled"}
                </button>
              ))}
            </div>
          )}
        </Field>

        {formError && <p className="admin-error">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="admin-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="admin-btn-primary">
            {form.id ? "Apply" : "Add Event"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
