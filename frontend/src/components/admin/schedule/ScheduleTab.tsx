// Schedule admin tab — staged editor + live preview.
// Nothing touches the server until the diff modal is confirmed: edits to
// day headers and events accumulate in draft state, the preview renders
// the draft through the same ScheduleGrid the public site uses. Event
// types (label + palette color) are staged alongside; an event's color
// always comes from its type.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../../lib/api";
import ScheduleGrid from "../../site/ScheduleGrid";
import type { ScheduleDay } from "../../../types";
import { Panel, Field, EmptyState, SaveBar, DiffModal, type Change } from "../ui";
import { PencilIcon, XIcon } from "../icons";
import EventModal from "./EventModal";
import EventTypesPanel from "./EventTypesPanel";
import type {
  AdminEvent,
  AdminEventType,
  EventForm,
  ScheduleEventRow,
  ScheduleEventTypeRow,
} from "../adminTypes";
import { SCHEDULE_COLORS, colorSwatch } from "../../../lib/scheduleColors";
import { mapEvent, mapType, eventsEqual, typesEqual, timeRange } from "./scheduleMeta";

// `ids` maps staged "tmp-type-N" ids to the real ids the API hands back, so
// events saved after a new type can point at it.
type AppliedChange = Change & {
  apply: (ids: Map<string, string>) => Promise<unknown>;
};

export default function ScheduleTab({ onDirtyChange }: { onDirtyChange?: (count: number) => void }) {
  const [serverEvents, setServerEvents] = useState<AdminEvent[]>([]);
  const [serverDays, setServerDays] = useState<ScheduleDay[]>([]);
  const [draftEvents, setDraftEvents] = useState<AdminEvent[]>([]);
  const [draftDays, setDraftDays] = useState<ScheduleDay[]>([]);
  const [serverTypes, setServerTypes] = useState<AdminEventType[]>([]);
  const [draftTypes, setDraftTypes] = useState<AdminEventType[]>([]);
  const [activeDay, setActiveDay] = useState("fri");
  const [editing, setEditing] = useState<EventForm | null>(null); // form seed for EventModal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tmpIdRef = useRef(0);
  const tmpTypeIdRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const [ev, dy, ty] = await Promise.all([
        apiGet<ScheduleEventRow[]>("/schedule"),
        apiGet<ScheduleDay[]>("/schedule/days"),
        apiGet<ScheduleEventTypeRow[]>("/schedule/types"),
      ]);
      const types = ty.map(mapType);
      const mapped = ev.map((e) => mapEvent(e, types));
      setServerEvents(mapped);
      setServerDays(dy);
      setServerTypes(types);
      setDraftEvents(mapped);
      setDraftDays(dy.map((d) => ({ ...d })));
      setDraftTypes(types);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Staged diff ── */

  const changes = useMemo(() => {
    const list: AppliedChange[] = [];

    for (const day of draftDays) {
      const orig = serverDays.find((d) => d.key === day.key);
      const label = day.label.trim();
      if (orig && label && orig.label !== label) {
        list.push({
          kind: "edit",
          summary: `Day header "${orig.label}" → "${label}"`,
          apply: () => apiPut(`/schedule/days/${day.key}`, { label }),
        });
      }
    }

    // Type adds and edits go first so events saved below can reference them.
    for (const type of draftTypes) {
      const label = type.label.trim();
      if (type._new) {
        list.push({
          kind: "add",
          summary: `Event type "${label}"`,
          detail: type.color,
          apply: async (ids) => {
            const created = await apiPost<ScheduleEventTypeRow>("/schedule/types", {
              label,
              color: type.color,
              sort_order: type.sortOrder,
            });
            ids.set(type.id, created.id);
          },
        });
        continue;
      }
      const orig = serverTypes.find((t) => t.id === type.id);
      if (orig && !typesEqual(orig, type)) {
        const parts: string[] = [];
        if (orig.label !== label) parts.push(`name "${orig.label}" → "${label}"`);
        if (orig.color !== type.color)
          parts.push(`color ${orig.color} → ${type.color}`);
        list.push({
          kind: "edit",
          summary: `Event type "${orig.label}"`,
          detail: parts.join(" · "),
          apply: () =>
            apiPut(`/schedule/types/${type.id}`, { label, color: type.color }),
        });
      }
    }

    for (const ev of draftEvents) {
      if (!ev._new) continue;
      list.push({
        kind: "add",
        summary: `"${ev.label}"`,
        detail: `${dayLabel(ev.day)} · ${timeRange(ev)} · ${typeLabel(ev.typeId)}`,
        apply: (ids) =>
          apiPost("/schedule", {
            day: ev.day,
            start_hour: ev.startHour,
            end_hour: ev.endHour,
            label: ev.label,
            type_id: ids.get(ev.typeId) ?? ev.typeId,
          }),
      });
    }

    for (const orig of serverEvents) {
      const draft = draftEvents.find((d) => d.id === orig.id);
      if (!draft) {
        list.push({
          kind: "delete",
          summary: `"${orig.label}"`,
          detail: `${dayLabel(orig.day)} · ${timeRange(orig)}`,
          apply: () => apiDelete(`/schedule/${orig.id}`),
        });
      } else if (!eventsEqual(orig, draft)) {
        const parts: string[] = [];
        if (orig.label !== draft.label)
          parts.push(`label "${orig.label}" → "${draft.label}"`);
        if (orig.day !== draft.day)
          parts.push(`${dayLabel(orig.day)} → ${dayLabel(draft.day)}`);
        if (
          orig.startHour !== draft.startHour ||
          orig.endHour !== draft.endHour
        )
          parts.push(`${timeRange(orig)} → ${timeRange(draft)}`);
        if (orig.typeId !== draft.typeId)
          parts.push(`type ${typeLabel(orig.typeId)} → ${typeLabel(draft.typeId)}`);
        list.push({
          kind: "edit",
          summary: `"${orig.label}"`,
          detail: parts.join(" · "),
          apply: (ids) =>
            apiPut(`/schedule/${draft.id}`, {
              day: draft.day,
              start_hour: draft.startHour,
              end_hour: draft.endHour,
              label: draft.label,
              type_id: ids.get(draft.typeId) ?? draft.typeId,
            }),
        });
      }
    }

    // Type deletes go last, once no saved event points at them any more.
    for (const orig of serverTypes) {
      if (draftTypes.some((t) => t.id === orig.id)) continue;
      list.push({
        kind: "delete",
        summary: `Event type "${orig.label}"`,
        apply: () => apiDelete(`/schedule/types/${orig.id}`),
      });
    }

    return list;

    function dayLabel(key: string) {
      return draftDays.find((d) => d.key === key)?.label ?? key;
    }

    function typeLabel(id: string) {
      const type =
        draftTypes.find((t) => t.id === id) ?? serverTypes.find((t) => t.id === id);
      return type?.label.trim() || "no type";
    }
  }, [serverEvents, serverDays, serverTypes, draftEvents, draftDays, draftTypes]);

  useEffect(() => {
    onDirtyChange?.(changes.length);
  }, [changes.length, onDirtyChange]);

  /* ── Draft mutations ── */

  function upsertEvent(form: EventForm) {
    if (form.id) {
      setDraftEvents((evs) =>
        evs.map((e) => (e.id === form.id ? { ...e, ...form, id: e.id } : e)),
      );
    } else {
      setDraftEvents((evs) => [
        ...evs,
        { ...form, id: `tmp-${++tmpIdRef.current}`, _new: true },
      ]);
    }
    setEditing(null);
  }

  function removeEvent(id: string) {
    setDraftEvents((evs) => evs.filter((e) => e.id !== id));
  }

  function addType() {
    setDraftTypes((types) => {
      // Default to the first palette color no other type is using yet.
      const free = SCHEDULE_COLORS.find(
        (c) => !types.some((t) => t.color === c.value),
      );
      return [
        ...types,
        {
          id: `tmp-type-${++tmpTypeIdRef.current}`,
          label: "",
          color: (free ?? SCHEDULE_COLORS[0]).value,
          sortOrder: Math.max(-1, ...types.map((t) => t.sortOrder)) + 1,
          _new: true,
        },
      ];
    });
  }

  function updateType(id: string, patch: Partial<AdminEventType>) {
    setDraftTypes((types) =>
      types.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }

  function removeType(id: string) {
    setDraftTypes((types) => types.filter((t) => t.id !== id));
  }

  function discard() {
    setDraftEvents(serverEvents);
    setDraftDays(serverDays.map((d) => ({ ...d })));
    setDraftTypes(serverTypes);
  }

  async function applySave() {
    setSaving(true);
    setSaveError(null);
    let applied = 0;
    try {
      const ids = new Map<string, string>();
      for (const change of changes) {
        await change.apply(ids);
        applied += 1;
      }
      setReviewOpen(false);
      await load();
    } catch (err) {
      // Partial failure: resync with the server and drop the remaining draft
      // so the diff can't drift out of sync with reality.
      setSaveError(
        `Saved ${applied} of ${changes.length} changes, then failed: ${(err as Error).message}. Remaining changes were discarded — please re-apply them.`,
      );
      await load();
    } finally {
      setSaving(false);
    }
  }

  /* ── Preview data ── */

  const stagedStatus = useMemo(() => {
    const map = new Map<string | undefined, "new" | "edited">();
    for (const ev of draftEvents) {
      if (ev._new) {
        map.set(ev.id, "new");
      } else {
        const orig = serverEvents.find((s) => s.id === ev.id);
        if (orig && !eventsEqual(orig, ev)) map.set(ev.id, "edited");
      }
    }
    return map;
  }, [draftEvents, serverEvents]);

  // An event's color always follows its (draft) type, so recoloring a type
  // shows up in the list and the preview before saving.
  const dayEvents = draftEvents
    .filter((e) => e.day === activeDay)
    .sort((a, b) => a.startHour - b.startHour)
    .map((e) => ({
      ...e,
      color: draftTypes.find((t) => t.id === e.typeId)?.color ?? e.color,
    }));

  const typeUsage = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of draftEvents) {
      map.set(ev.typeId, (map.get(ev.typeId) ?? 0) + 1);
    }
    return map;
  }, [draftEvents]);

  const hourWindow = useMemo(() => {
    if (draftEvents.length === 0) return { minHour: 9, maxHour: 18 };
    return {
      minHour: Math.min(...draftEvents.map((e) => Math.floor(e.startHour))),
      maxHour: Math.max(...draftEvents.map((e) => Math.ceil(e.endHour))),
    };
  }, [draftEvents]);

  const activeDayLabel =
    draftDays.find((d) => d.key === activeDay)?.label ?? activeDay;
  const hasStaged = stagedStatus.size > 0;

  return (
    <div>
      {error && <p className="admin-error">{error}</p>}
      {saveError && !reviewOpen && <p className="admin-error">{saveError}</p>}

      {/* Day switcher — drives both the editor list and the preview */}
      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Day">
        {draftDays.map((d) => (
          <button
            key={d.key}
            type="button"
            role="tab"
            aria-selected={activeDay === d.key}
            onClick={() => setActiveDay(d.key)}
            className={`font-mono text-xs uppercase tracking-wide px-4 py-1.5 rounded-pill border transition-colors duration-150 ease-brand ${
              activeDay === d.key
                ? "border-ultraviolet bg-ultraviolet/15 text-text-primary"
                : "border-border/40 text-text-secondary hover:border-ultraviolet/60 hover:text-text-primary"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* ── Editor column ── */}
        <div className="flex flex-col gap-6">
          <Panel title="Day Headers">
            <div className="grid gap-3 sm:grid-cols-3">
              {draftDays.map((day) => {
                const orig = serverDays.find((d) => d.key === day.key);
                const changed = orig && orig.label !== day.label.trim();
                return (
                  <Field
                    key={day.key}
                    label={
                      <>
                        {day.key}
                        {changed && (
                          <span className="admin-chip admin-chip-edit ml-2">~</span>
                        )}
                      </>
                    }
                    htmlFor={`day-label-${day.key}`}
                  >
                    <input
                      id={`day-label-${day.key}`}
                      className="admin-input"
                      value={day.label}
                      onChange={(e) =>
                        setDraftDays((days) =>
                          days.map((d) =>
                            d.key === day.key
                              ? { ...d, label: e.target.value }
                              : d,
                          ),
                        )
                      }
                    />
                  </Field>
                );
              })}
            </div>
          </Panel>

          <EventTypesPanel
            types={draftTypes}
            serverTypes={serverTypes}
            usage={typeUsage}
            onChange={updateType}
            onAdd={addType}
            onRemove={removeType}
          />

          <Panel
            title="Events"
            count={dayEvents.length}
            actions={
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() =>
                  setEditing({
                    day: activeDay,
                    startHour: 10,
                    endHour: 11,
                    label: "",
                    color: "violet",
                    typeId: draftTypes[0]?.id ?? "",
                  })
                }
              >
                + New Event
              </button>
            }
          >
            {dayEvents.length === 0 ? (
              <EmptyState>No events on {activeDayLabel} yet.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2">
                {dayEvents.map((ev) => {
                  const staged = stagedStatus.get(ev.id);
                  return (
                    <li
                      key={ev.id}
                      className="flex items-center gap-3 bg-black/20 border border-border/40 rounded-lg px-3 py-2 transition-colors duration-150 ease-brand hover:border-border/60"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-pill shrink-0"
                        style={{ background: colorSwatch(ev.color) }}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-text-primary truncate">
                          {ev.label}
                        </p>
                        <p className="font-mono text-xs text-text-secondary">
                          {timeRange(ev)}
                        </p>
                      </div>
                      {staged === "new" && (
                        <span className="admin-chip admin-chip-add">new</span>
                      )}
                      {staged === "edited" && (
                        <span className="admin-chip admin-chip-edit">edited</span>
                      )}
                      <button
                        type="button"
                        className="admin-btn-icon"
                        aria-label={`Edit ${ev.label}`}
                        onClick={() => setEditing({ ...ev })}
                      >
                        <PencilIcon size={14} />
                      </button>
                      <button
                        type="button"
                        className="admin-btn-icon admin-btn-icon-danger"
                        aria-label={`Delete ${ev.label}`}
                        onClick={() => removeEvent(ev.id)}
                      >
                        <XIcon size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* ── Live preview column ── */}
        <Panel title="Live Preview" className="lg:sticky lg:top-6">
          <p className="admin-help mb-3">
            How {activeDayLabel} will look after saving. Click an event to edit
            it.
          </p>
          <div className="schedule-grid-wrapper">
            <ScheduleGrid
              events={dayEvents}
              minHour={hourWindow.minHour}
              maxHour={hourWindow.maxHour}
              onEventClick={(ev) => {
                // The grid hands back the public event shape; edit the
                // draft row so the type id comes along.
                const draft = dayEvents.find((d) => d.id === ev.id);
                if (draft) setEditing({ ...draft });
              }}
              eventClassName={(ev) => {
                const staged = stagedStatus.get(ev.id);
                if (staged === "new") return "ring-1 ring-cyber-teal/70";
                if (staged === "edited") return "ring-1 ring-signal-yellow/70";
                return "";
              }}
            />
          </div>
          {hasStaged && (
            <p className="admin-help mt-3 flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-pill bg-cyber-teal" aria-hidden="true" />
                unsaved new
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-pill bg-signal-yellow" aria-hidden="true" />
                unsaved edit
              </span>
            </p>
          )}
        </Panel>
      </div>

      <SaveBar
        count={changes.length}
        saving={saving}
        onSave={() => {
          if (draftTypes.some((t) => !t.label.trim())) {
            setSaveError("Every event type needs a name before saving.");
            return;
          }
          setSaveError(null);
          setReviewOpen(true);
        }}
        onDiscard={discard}
      />

      <DiffModal
        open={reviewOpen}
        changes={changes}
        saving={saving}
        error={saveError}
        onConfirm={applySave}
        onClose={() => setReviewOpen(false)}
      />

      <EventModal
        open={editing !== null}
        initial={editing}
        days={draftDays}
        types={draftTypes}
        onSubmit={upsertEvent}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
