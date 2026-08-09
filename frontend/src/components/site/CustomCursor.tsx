import { useState, useEffect } from 'react';
import { motion, useMotionValue, type Transition } from 'motion/react';

const POINTER_SELECTOR =
  'a, button, [role="button"], select, label[for], summary, [tabindex]:not([tabindex="-1"]), [data-cursor="pointer"]';

// Spring config for the morph transition between cursor states
const morphSpring: Transition = { type: 'spring', stiffness: 500, damping: 28, mass: 0.5 };

// Only render the custom cursor on devices with a precise pointer (mouse/trackpad).
// On touch/mobile devices we return null so the native tap indicator is preserved.
const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

export default function CustomCursor() {
  // useMotionValue drives the div position — updates bypass React re-renders entirely
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!hasFinePointer) return;

    const onMove = (e: MouseEvent) => {
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
    };

    // Crossing into an iframe stops mousemove in this document entirely, so
    // hide on the way in. Entering an iframe reports it as relatedTarget;
    // some browsers report null, which also covers leaving the window.
    const onOut = (e: MouseEvent) => {
      const entering = e.relatedTarget as Element | null;
      if (!entering || entering.tagName === 'IFRAME') setIsVisible(false);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('mouseout', onOut);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('mouseout', onOut);
    };
  }, [x, y]);

  if (!hasFinePointer) return null;

  return (
    <motion.div
      aria-hidden="true"
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
