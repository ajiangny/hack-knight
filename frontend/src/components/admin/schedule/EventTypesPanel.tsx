// Event types editor for the schedule tab — a label plus one palette
// color per type. Edits are staged in the parent's draft like everything
// else in the tab.

import { SCHEDULE_COLORS } from "../../../lib/scheduleColors";
import { Panel, EmptyState } from "../ui";
import { XIcon } from "../icons";
import type { AdminEventType } from "../adminTypes";
import { typesEqual } from "./scheduleMeta";

interface EventTypesPanelProps {
  types: AdminEventType[];
  serverTypes: AdminEventType[];
  /** Draft events per type id — a type in use cannot be deleted. */
  usage: Map<string, number>;
  onChange: (id: string, patch: Partial<AdminEventType>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export default function EventTypesPanel({
  types,
  serverTypes,
  usage,
  onChange,
  onAdd,
  onRemove,
}: EventTypesPanelProps) {
  return (
    <Panel
      title="Event Types"
      count={types.length}
      actions={
        <button type="button" className="admin-btn-ghost" onClick={onAdd}>
          + New Type
        </button>
      }
    >
      {types.length === 0 ? (
        <EmptyState>No event types yet. Add one to start scheduling events.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {types.map((type) => {
            const orig = serverTypes.find((t) => t.id === type.id);
            const edited = orig && !typesEqual(orig, type);
            const used = usage.get(type.id) ?? 0;
            const name = type.label.trim() || "untitled type";
            return (
              <li
                key={type.id}
                className="flex flex-wrap items-center gap-3 bg-black/20 border border-border/40 rounded-lg px-3 py-2"
              >
                <input
                  className="admin-input flex-1 min-w-32"
                  aria-label="Type name"
                  placeholder="e.g. Workshop"
                  value={type.label}
                  onChange={(e) => onChange(type.id, { label: e.target.value })}
                />
                <div
                  className="flex items-center gap-1.5"
                  role="radiogroup"
                  aria-label={`Color for ${name}`}
                >
                  {SCHEDULE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={type.color === c.value}
                      aria-label={c.name}
                      title={c.name}
                      onClick={() => onChange(type.id, { color: c.value })}
                      className={`w-5 h-5 rounded-pill border-2 transition-transform duration-150 ease-brand focus-visible:outline-2 focus-visible:outline-ultraviolet focus-visible:outline-offset-2 ${
                        type.color === c.value
                          ? "border-text-primary scale-110"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                      style={{ background: c.swatch }}
                    />
                  ))}
                </div>
                {type._new && <span className="admin-chip admin-chip-add">new</span>}
                {edited && <span className="admin-chip admin-chip-edit">edited</span>}
                <button
                  type="button"
                  className="admin-btn-icon admin-btn-icon-danger disabled:opacity-40 disabled:pointer-events-none"
                  aria-label={`Delete ${name}`}
                  title={
                    used > 0
                      ? `Used by ${used} event${used === 1 ? "" : "s"}. Reassign or delete them first.`
                      : undefined
                  }
                  disabled={used > 0}
                  onClick={() => onRemove(type.id)}
                >
                  <XIcon size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="admin-help mt-3">
        Changing a type's color recolors every event of that type. A type can
        only be deleted once no events use it.
      </p>
    </Panel>
  );
}
