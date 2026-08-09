// Searchable picker over MLH's verified school list. The value handed up is
// always an entry from that list (or "") — free text never leaves the field —
// so registrations arrive uniform and the backend can enforce the same
// allowlist instead of deduping typed school names at check-in.
//
// The ~13k-name list is imported lazily so Vite splits it into its own chunk,
// fetched when the form mounts instead of shipping with the initial bundle.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import DropdownPanel from "./DropdownPanel";

const MIN_QUERY = 2;
const MAX_RESULTS = 50;

interface SchoolComboboxProps {
  id: string;
  /** Always a list entry or "" — never raw typed text. */
  value: string;
  onChange: (school: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

export default function SchoolCombobox({
  id,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
}: SchoolComboboxProps) {
  const [schools, setSchools] = useState<readonly string[] | null>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    import("../../lib/schools")
      .then((m) => {
        if (!cancelled) setSchools(m.SCHOOLS);
      })
      .catch(() => {
        // Leave null: the dropdown shows a loading row, and submitting without
        // a selection is caught by validation.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on any click outside. Options use onMouseDown preventDefault so
  // choosing one never blurs the input first.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const term = query.trim().toLowerCase();

  // Schools whose name starts with the query rank above substring matches, so
  // "hunter" puts Hunter College above every "...Hunter..." elsewhere.
  let matches: string[] = [];
  if (open && schools && term.length >= MIN_QUERY) {
    const starts: string[] = [];
    const contains: string[] = [];
    for (const school of schools) {
      const lower = school.toLowerCase();
      if (lower.startsWith(term)) starts.push(school);
      else if (lower.includes(term)) contains.push(school);
      if (starts.length >= MAX_RESULTS) break;
    }
    matches = [...starts, ...contains].slice(0, MAX_RESULTS);
  }

  function choose(school: string) {
    onChange(school);
    setQuery(school);
    setOpen(false);
  }

  function handleInput(text: string) {
    setQuery(text);
    setOpen(true);
    setHighlight(0);
    // Typing the full name selects it without needing a click; anything else
    // clears the selection so a half-edited name can never be submitted.
    const exact = schools?.find(
      (s) => s.toLowerCase() === text.trim().toLowerCase(),
    );
    onChange(exact ?? "");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault(); // choose, don't submit the form
      choose(matches[Math.min(highlight, matches.length - 1)]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const listboxId = `${id}-listbox`;

  // Panel states: loading row, match list, or "no match" help text — but the
  // last only while nothing is selected, so a chosen school with no other
  // matches shows no panel at all.
  const showPanel = schools === null || matches.length > 0 || value === "";

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        className="register-input"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        autoComplete="off"
        placeholder="Start typing your school…"
        value={query}
        disabled={disabled}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {/* One persistent panel around the three states, so switching between
          loading/matches/no-match swaps content without replaying the
          open animation. */}
      <AnimatePresence>
        {open && term.length >= MIN_QUERY && showPanel && (
          <DropdownPanel>
            {schools === null ? (
              <div className="px-3 py-2 font-body text-sm text-text-muted">
                Loading school list…
              </div>
            ) : matches.length > 0 ? (
              <ul role="listbox" id={listboxId}>
                {matches.map((school, i) => (
                  <li
                    key={school}
                    role="option"
                    aria-selected={i === highlight}
                    className="register-combobox-option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(school)}
                    onMouseEnter={() => setHighlight(i)}
                  >
                    {school}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 font-body text-sm text-text-muted">
                No matching school — check the spelling, or ask MLH to add it
                via my.mlh.io.
              </div>
            )}
          </DropdownPanel>
        )}
      </AnimatePresence>
    </div>
  );
}
