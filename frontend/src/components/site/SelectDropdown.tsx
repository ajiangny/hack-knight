// Custom replacement for the native <select>. A native select's open popup is
// OS-drawn UI: it ignores the site's `cursor: none` (so the OS cursor
// reappears over it) and cannot be animated. Rendering the options in the DOM
// keeps the custom cursor visible and lets the panel animate open and closed.
//
// Follows the select-only combobox pattern: the button keeps focus and
// aria-activedescendant tracks the highlighted option.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import DropdownPanel from "./DropdownPanel";

const TYPEAHEAD_RESET_MS = 500;

interface SelectDropdownProps {
  id: string;
  options: readonly string[];
  /** Always an entry from `options` or "" (shows the placeholder). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

export default function SelectDropdown({
  id,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
  describedBy,
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ buffer: "", at: 0 });
  // Option index to scroll into view after the next render — set on open and
  // on keyboard moves, left alone on mouse hover so the list never scrolls
  // out from under a resting pointer.
  const pendingScroll = useRef<number | null>(null);

  const listboxId = `${id}-listbox`;
  const optionId = (i: number) => `${id}-option-${i}`;

  useEffect(() => {
    if (pendingScroll.current !== null) {
      document
        .getElementById(optionId(pendingScroll.current))
        ?.scrollIntoView({ block: "nearest" });
      pendingScroll.current = null;
    }
  });

  // Close on any click outside. Options use onMouseDown preventDefault so
  // choosing one never blurs the button first (same as SchoolCombobox).
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function moveHighlight(i: number) {
    setHighlight(i);
    pendingScroll.current = i;
  }

  function openList() {
    moveHighlight(Math.max(options.indexOf(value), 0));
    setOpen(true);
  }

  function choose(option: string) {
    onChange(option);
    setOpen(false);
  }

  // Native selects jump to the option matching what you type ("uni" → United
  // …); recreate that so the long country list stays quick to use.
  function handleTypeahead(char: string) {
    const now = Date.now();
    const t = typeahead.current;
    t.buffer = now - t.at > TYPEAHEAD_RESET_MS ? char : t.buffer + char;
    t.at = now;
    const term = t.buffer.toLowerCase();
    const idx = options.findIndex((o) => o.toLowerCase().startsWith(term));
    if (idx !== -1) moveHighlight(idx);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const isTyping =
      e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      } else if (isTyping) {
        openList();
        handleTypeahead(e.key);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveHighlight(Math.min(highlight + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveHighlight(Math.max(highlight - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      moveHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      moveHighlight(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); // choose, don't submit the form
      choose(options[highlight]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    } else if (isTyping) {
      handleTypeahead(e.key);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        // bg-none drops .register-select's baked-in chevron image — the
        // inline SVG below replaces it so it can rotate with the open state.
        className="register-select bg-none text-left relative"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={open ? optionId(highlight) : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
      >
        <span className={`block truncate ${value ? "" : "text-text-muted"}`}>
          {value || placeholder || "\u00A0"}
        </span>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
          <motion.svg
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            aria-hidden="true"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <path
              d="M1 1l5 5 5-5"
              stroke="#a1a1aa"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </motion.svg>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <DropdownPanel>
            <ul role="listbox" id={listboxId} aria-labelledby={id}>
              {options.map((option, i) => (
                <li
                  key={option}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === highlight}
                  data-selected={option === value}
                  className="register-combobox-option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setHighlight(i)}
                >
                  {option}
                </li>
              ))}
            </ul>
          </DropdownPanel>
        )}
      </AnimatePresence>
    </div>
  );
}
