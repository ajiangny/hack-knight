import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, type Transition } from 'motion/react';

const POINTER_SELECTOR =
  'a, button, [role="button"], [role="option"], select, label[for], summary, [tabindex]:not([tabindex="-1"]), [data-cursor="pointer"]';

// Spring config for the morph transition between cursor states
const morphSpring: Transition = { type: 'spring', stiffness: 500, damping: 28, mass: 0.5 };

// Chromium enforces a minimum thumb length on styled scrollbars; 2× the 10px
// bar width is close enough for the drag-travel math below.
const MIN_SCROLLBAR_THUMB = 20;

// Geometry captured when a press lands on an element's scrollbar thumb, so
// scroll events can stand in for the mousemoves the drag swallows.
interface ScrollbarDrag {
  el: HTMLElement;
  baseY: number;
  baseScrollTop: number;
  /** Cursor px per scrollTop px: thumb travel / scroll range. */
  scale: number;
  minY: number;
  maxY: number;
}

// Only render the custom cursor on devices with a precise pointer (mouse/trackpad).
// On touch/mobile devices we return null so the native tap indicator is preserved.
const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

export default function CustomCursor() {
  // useMotionValue drives the div position — updates bypass React re-renders entirely
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const scrollDrag = useRef<ScrollbarDrag | null>(null);

  useEffect(() => {
    if (!hasFinePointer) return;

    const onMove = (e: MouseEvent) => {
      // Mouse events resuming means any scrollbar drag is over, and the
      // mouse is provably still in our document — not inside an iframe.
      scrollDrag.current = null;
      window.clearTimeout(outTimer);
      x.set(e.clientX);
      y.set(e.clientY);
      const target = e.target as Element | null;
      setIsPointer(!!target?.closest(POINTER_SELECTOR));

      // Native UI draws the OS cursor regardless of `cursor: none`, so ours
      // must yield there or the user sees two cursors. The viewport
      // scrollbars sit beyond the root's client box (client sizes exclude
      // them); iframes (e.g. the Turnstile captcha) render their own cursor.
      const doc = document.documentElement;
      const overScrollbar =
        e.clientX >= doc.clientWidth || e.clientY >= doc.clientHeight;
      setIsVisible(!overScrollbar && target?.tagName !== 'IFRAME');
    };
    const onLeave = () => setIsVisible(false);
    const onEnter = () => setIsVisible(true);

    // An open <select> popup is native UI: it swallows every mouse event, so
    // the custom cursor would freeze in place under the OS cursor. Hide it
    // when the popup opens — the next mousemove can only fire after the
    // popup has closed, and shows it again.
    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest('select')) setIsVisible(false);

      // Dragging a native scrollbar swallows every mouse event until release,
      // which would freeze the custom cursor mid-drag. The element still
      // fires scroll events, so when a press lands on a vertical scrollbar
      // thumb, record enough geometry to move the cursor with the thumb.
      const el = e.target;
      if (
        !(el instanceof HTMLElement) ||
        el === document.documentElement ||
        el === document.body
      )
        return;
      const scrollRange = el.scrollHeight - el.clientHeight;
      // offsetX is relative to the padding box, whose width (clientWidth)
      // excludes the scrollbar — beyond it means the press is on the bar.
      if (scrollRange <= 0 || e.offsetX < el.clientWidth) return;
      const trackH = el.clientHeight;
      const thumbH = Math.max(
        (trackH * el.clientHeight) / el.scrollHeight,
        MIN_SCROLLBAR_THUMB,
      );
      const thumbTop = (el.scrollTop / scrollRange) * (trackH - thumbH);
      // Track clicks jump the content without moving the mouse — only a
      // press on the thumb itself starts a drag worth following.
      if (e.offsetY < thumbTop - 4 || e.offsetY > thumbTop + thumbH + 4) return;
      const rect = el.getBoundingClientRect();
      scrollDrag.current = {
        el,
        baseY: e.clientY,
        baseScrollTop: el.scrollTop,
        scale: (trackH - thumbH) / scrollRange,
        minY: rect.top,
        maxY: rect.bottom,
      };
    };

    const onPointerUp = () => {
      scrollDrag.current = null;
    };

    const onScroll = (e: Event) => {
      const drag = scrollDrag.current;
      if (!drag || e.target !== drag.el) return;
      const dy = (drag.el.scrollTop - drag.baseScrollTop) * drag.scale;
      y.set(Math.min(Math.max(drag.baseY + dy, drag.minY), drag.maxY));
    };

    // Crossing into an iframe stops mousemove in this document entirely, so
    // hide on the way in. Entering an iframe reports it as relatedTarget;
    // some browsers report null, which also covers leaving the window.
    //
    // Neither check sees an iframe hidden behind a closed shadow root
    // (Cloudflare's Turnstile does this): shadow DOM retargets the event to
    // the host <div>, so the cursor used to freeze at the widget's edge.
    // Every mouseout therefore also arms a short fuse that the next event
    // from our own document defuses — if nothing fires, the mouse is inside
    // an iframe and the cursor hides. Ordinary moves defuse it long before
    // it burns: crossing any element fires mouseout, mouseover, and
    // mousemove back-to-back.
    let outTimer = 0;
    const onOut = (e: MouseEvent) => {
      const entering = e.relatedTarget as Element | null;
      if (!entering || entering.tagName === 'IFRAME') {
        setIsVisible(false);
        return;
      }
      window.clearTimeout(outTimer);
      outTimer = window.setTimeout(() => setIsVisible(false), 80);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('mouseout', onOut);
    // Capture phase: scroll events on elements don't bubble to document.
    document.addEventListener('scroll', onScroll, true);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('mouseout', onOut);
      document.removeEventListener('scroll', onScroll, true);
      window.clearTimeout(outTimer);
    };
  }, [x, y]);

  if (!hasFinePointer) return null;

  return (
    <motion.div
      aria-hidden="true"
      // .custom-cursor lets CSS hide it while data-cursor-native regions are
      // hovered (see index.css) — visibility, so it never fights the
      // motion-driven opacity below.
      className="custom-cursor"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        x,
        y,
        width: 32,
        height: 32,
        pointerEvents: 'none',
        zIndex: 99999,
        willChange: 'transform',
      }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Default arrow cursor — hotspot at top-left (0, 0) */}
      <motion.img
        src="/cursors/default-cursor.svg"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: 32,
          height: 32,
          transformOrigin: '0 0',
        }}
        animate={{
          opacity: isPointer ? 0 : 1,
          scale:   isPointer ? 0.65 : 1,
        }}
        transition={morphSpring}
      />

      {/* Click / pointer cursor — fingertip hotspot at (13, 0) */}
      <motion.img
        src="/cursors/click-cursor.svg"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: 32,
          height: 32,
          marginLeft: -13, // shifts fingertip to align with default tip
          transformOrigin: '13px 0px',
        }}
        animate={{
          opacity: isPointer ? 1 : 0,
          scale:   isPointer ? 1 : 0.65,
        }}
        transition={morphSpring}
      />
    </motion.div>
  );
}
