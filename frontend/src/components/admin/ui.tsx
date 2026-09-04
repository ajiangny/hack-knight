// Shared admin UI kit — panels, fields, save bar, diff modal, drag grid.
// Visual spec: MASTER.md §7. Motion: fast/dry per the interaction thesis —
// fades and small translates only, 150–250ms, ease-brand.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion as Motion, AnimatePresence } from "motion/react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";

const EASE_BRAND: [number, number, number, number] = [0.4, 0, 0.2, 1];

/** Move an array item and return a new array. */
function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/* ── Panel ─────────────────────────────────────────── */

interface PanelProps {
  title?: ReactNode;
  count?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Panel({ title, count, actions, children, className = "" }: PanelProps) {
  return (
    <section className={`admin-panel ${className}`}>
      {(title || actions) && (
        <div className="admin-panel-head">
          <div className="flex items-center gap-2.5">
            {title && <h2 className="admin-panel-title">{title}</h2>}
            {count != null && <span className="admin-count-pill">{count}</span>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/* ── Field ─────────────────────────────────────────── */

interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  children?: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, children, className = "" }: FieldProps) {
  return (
    <div className={className}>
      <label className="admin-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children?: ReactNode }) {
  return <div className="admin-empty">{children}</div>;
}

/* ── Toggle switch ─────────────────────────────────── */

interface ToggleProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Toggle({ id, checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill border
        transition-colors duration-150 ease-brand
        focus-visible:outline-2 focus-visible:outline-ultraviolet focus-visible:outline-offset-2
        ${
          checked
            ? "bg-ultraviolet border-ultraviolet"
            : "bg-black/30 border-border/40 hover:border-border/60"
        }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 rounded-pill bg-text-primary
          transition-transform duration-150 ease-brand
          ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

/* ── Collapsible panel title ───────────────────────── */

/** Panel `title` that toggles an open/closed section (chevron flips). */
export function CollapseTitle({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-ultraviolet"
      onClick={onToggle}
      aria-expanded={open}
    >
      {children}
      <ChevronDownIcon
        size={14}
        className={`transition-transform duration-150 ease-brand ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

/* ── Card overlays (inside a `group` drag card) ────── */

/** Hover/focus-revealed action cluster pinned to a card corner. */
export function CardOverlay({
  corner = "top",
  children,
}: {
  corner?: "top" | "bottom";
  children?: ReactNode;
}) {
  return (
    <div
      className={`absolute ${corner === "top" ? "top-1.5" : "bottom-1.5"} right-1.5 flex gap-1
        opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
        transition-opacity duration-150`}
    >
      {children}
    </div>
  );
}

/** Keyboard-accessible reorder buttons for a DragGrid card. */
export function CardMoveButtons({
  label,
  index,
  total,
  move,
}: {
  label: string;
  index: number;
  total: number;
  move: (delta: number) => void;
}) {
  return (
    <CardOverlay corner="bottom">
      <button
        type="button"
        className="admin-btn-icon"
        aria-label={`Move ${label} earlier`}
        disabled={index === 0}
        onClick={() => move(-1)}
      >
        <ChevronLeftIcon />
      </button>
      <button
        type="button"
        className="admin-btn-icon"
        aria-label={`Move ${label} later`}
        disabled={index === total - 1}
        onClick={() => move(1)}
      >
        <ChevronRightIcon />
      </button>
    </CardOverlay>
  );
}

/* ── Scaled preview ────────────────────────────────── */

/**
 * Shrink-to-fit wrapper for live previews. Public components size
 * themselves to the viewport, so inside a half-width admin panel they can
 * be wider than the space available — this measures the content's natural
 * width and scales it down (never up) to fit without horizontal scrolling.
 * Keep the wrapper itself padding-free so the measurements stay honest.
 */
export function ScaledPreview({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ scale: number; height: number | null }>({
    scale: 1,
    height: null,
  });

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    function measure() {
      if (!outer || !inner) return;
      const available = outer.clientWidth;
      const natural = inner.offsetWidth;
      if (!available || !natural) return;
      const scale = Math.min(1, available / natural);
      const height = Math.round(inner.offsetHeight * scale);
      setBox((b) => (b.scale === scale && b.height === height ? b : { scale, height }));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={outerRef}
      className={`overflow-hidden ${className}`}
      style={{ height: box.height ?? undefined }}
    >
      <div
        ref={innerRef}
        className="w-max mx-auto flow-root"
        style={{ transform: `scale(${box.scale})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Pagination ────────────────────────────────────── */

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

/**
 * Prev/next pager for long read-only lists. Renders nothing when everything
 * fits on one page, so callers can mount it unconditionally.
 */
export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav className="admin-pagination" aria-label="Pagination">
      <button
        type="button"
        className="admin-btn-icon"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeftIcon />
      </button>
      <span className="admin-pagination-label" aria-live="polite">
        Page {page} of {pageCount}
      </span>
      <button
        type="button"
        className="admin-btn-icon"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRightIcon />
      </button>
    </nav>
  );
}

/* ── Save bar ──────────────────────────────────────── */

interface SaveBarProps {
  count: number;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function SaveBar({ count, saving, onSave, onDiscard }: SaveBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <Motion.div
          key="savebar"
          className="admin-savebar"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_BRAND }}
        >
          <span className="admin-savebar-count">
            {count} unsaved change{count === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="admin-btn-ghost"
              onClick={onDiscard}
              disabled={saving}
            >
              Discard
            </button>
            <button
              type="button"
              className="admin-btn-primary"
              onClick={onSave}
              disabled={saving}
            >
              Save Changes
            </button>
          </div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Modal ─────────────────────────────────────────── */

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  wide?: boolean;
  /** Near-full-width modal for document previews; overrides `wide`. */
  xl?: boolean;
  children?: ReactNode;
}

export function Modal({
  open,
  title,
  onClose,
  wide = false,
  xl = false,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <Motion.div
          key="backdrop"
          className="admin-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_BRAND }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <Motion.div
            className={`admin-modal ${xl ? "admin-modal-xl" : wide ? "admin-modal-wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_BRAND }}
          >
            {title && <h3 className="admin-modal-title">{title}</h3>}
            {children}
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Diff modal ────────────────────────────────────── */

export type ChangeKind = "add" | "edit" | "replace" | "delete" | "reorder";

/** One staged change shown in the review-before-save modal. */
export interface Change {
  kind: ChangeKind;
  summary: string;
  detail?: string;
}

const CHANGE_KINDS: Record<ChangeKind, { label: string; chip: string }> = {
  add: { label: "+ Add", chip: "admin-chip-add" },
  edit: { label: "~ Edit", chip: "admin-chip-edit" },
  replace: { label: "~ Replace", chip: "admin-chip-edit" },
  delete: { label: "− Delete", chip: "admin-chip-delete" },
  reorder: { label: "⇅ Reorder", chip: "admin-chip-reorder" },
};

interface DiffModalProps {
  open: boolean;
  changes: Change[];
  saving: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function DiffModal({ open, changes, saving, error, onConfirm, onClose }: DiffModalProps) {
  return (
    <Modal open={open} title="Review changes" onClose={saving ? () => {} : onClose}>
      <ul className="flex flex-col gap-2 mb-5">
        {changes.map((change, i) => {
          const kind = CHANGE_KINDS[change.kind] ?? CHANGE_KINDS.edit;
          return (
            <li
              key={i}
              className="flex items-start gap-3 bg-black/20 border border-border/40 rounded-lg px-3 py-2"
            >
              <span className={`admin-chip ${kind.chip} mt-0.5`}>{kind.label}</span>
              <div className="min-w-0">
                <p className="font-body text-sm text-text-primary">{change.summary}</p>
                {change.detail && (
                  <p className="font-body text-xs text-text-secondary mt-0.5">
                    {change.detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {error && <p className="admin-error">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="admin-btn-ghost"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="admin-btn-primary"
          onClick={onConfirm}
          disabled={saving}
        >
          {saving ? "Saving…" : `Confirm & Save (${changes.length})`}
        </button>
      </div>
    </Modal>
  );
}

/* ── Drag grid ─────────────────────────────────────── */

interface DragGridProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (
    item: T,
    index: number,
    helpers: { isDragging: boolean; move: (delta: number) => void },
  ) => ReactNode;
  keyOf?: (item: T) => string | number;
  className?: string;
  cardClassName?: (item: T) => string;
}

/**
 * Grid with HTML5 drag-to-reorder. The outer plain div owns the native drag
 * events (motion components swallow onDragStart/onDragEnd for their own
 * gesture system); the inner motion.div animates the shuffle via `layout`.
 *
 * renderItem(item, index, { isDragging, move }) — `move(delta)` is the
 * keyboard-accessible fallback for reordering without a pointer.
 */
export function DragGrid<T>({
  items,
  onReorder,
  renderItem,
  keyOf = (item) => (item as { id: string | number }).id,
  className = "",
  cardClassName = () => "",
}: DragGridProps<T>) {
  const [dragKey, setDragKey] = useState<string | number | null>(null);

  function moveTo(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || to >= items.length) return;
    onReorder(arrayMove(items, from, to));
  }

  return (
    <div className={className}>
      {items.map((item, idx) => {
        const key = keyOf(item);
        const isDragging = dragKey === key;
        return (
          <div
            key={key}
            draggable
            onDragStart={(e) => {
              setDragKey(key);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDragKey(null)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragKey == null || dragKey === key) return;
              const from = items.findIndex((it) => keyOf(it) === dragKey);
              if (from !== -1) moveTo(from, idx);
            }}
            onDrop={(e) => e.preventDefault()}
          >
            <Motion.div
              layout
              transition={{ duration: 0.2, ease: EASE_BRAND }}
              className={`admin-drag-card ${
                isDragging ? "admin-drag-card-active" : ""
              } ${cardClassName(item)}`}
            >
              {renderItem(item, idx, {
                isDragging,
                move: (delta) => moveTo(idx, idx + delta),
              })}
            </Motion.div>
          </div>
        );
      })}
    </div>
  );
}
