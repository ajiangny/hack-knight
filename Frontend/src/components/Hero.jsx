import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import CountdownTimer from './CountdownTimer';
import MascotEyes from './MascotEyes';
import hillsBgSvg from '../assets/hillsbg.svg';
import hillsSvg from '../assets/hills.svg';
import knightsSvg from '../assets/knights1.svg';
import towerSvg from '../assets/tower.svg';

export default function Hero() {
  const leftColRef = useRef(null);
  const [towerHeight, setTowerHeight] = useState(null);

  // ── Motion scroll tracking ─────────────────────────────────────────────
  // useScroll returns scrollY as a live MotionValue — no event listeners needed.
  const { scrollY } = useScroll();

  // Each layer gets its own MotionValue derived from scrollY.
  // The multiplier controls how fast each layer scrolls (parallax speed).
  const hillsGroupY = useTransform(scrollY, (v) => v * 0.90); // back hill + knights
  const contentY = useTransform(scrollY, (v) => v * 0.40);    // left col + tower

  // ── ResizeObserver — sync tower height to left column ─────────────────
  useEffect(() => {
    if (!leftColRef.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setTowerHeight(entry.contentRect.height)
    );
    observer.observe(leftColRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="hero"
      className="relative overflow-hidden min-h-screen flex items-center"
      style={{ isolation: 'isolate' }}
    >
      {/* z:0 — Back hill + Knights (grouped, move together) */}
      <motion.div
        className="absolute left-0 w-full"
        style={{ bottom: '0%', zIndex: 0, y: hillsGroupY }}
      >
        <img src={hillsBgSvg} alt="" aria-hidden="true"
          className="absolute left-0 w-full pointer-events-none select-none"
          style={{ bottom: 0, opacity: 0.35 }}
        />
        <img src={knightsSvg} alt="" aria-hidden="true"
          className="absolute left-0 w-full pointer-events-none select-none knights-float"
          style={{ bottom: 0 }}
        />
      </motion.div>

      {/* z:3 — Front hill — static, always pinned to section bottom */}
      <img
        src={hillsSvg} alt="" aria-hidden="true"
        className="absolute left-0 w-full pointer-events-none select-none"
        style={{ bottom: 0, zIndex: 5 }}
      />

      {/*
        ── Two-column content row ──────────────────────────────────────────
        The wrapper itself has NO transform — no stacking context is created.
        Left col (z:4) and tower col (z:2) each transform independently so
        the front hill (z:3) can sit between them in the section's stacking ctx.
      */}
      <div className="w-full flex md:flex-row items-start gap-12 relative pt-24 pb-16 pl-6 md:pt-40 md:pb-32 md:pl-40 max-w-[1600px] mx-auto">

        {/* z:4 — Left content */}
        <motion.div
          ref={leftColRef}
          className="flex flex-col items-start text-left"
          style={{ position: 'relative', zIndex: 4, y: contentY }}
        >
          <h1 className="font-display font-bold text-5xl md:text-hero text-text-primary mb-4 leading-none">
            <span className="text-ultraviolet">HackKnight</span> 2026
          </h1>

          <p className="font-body text-text-primary text-2xl mb-6">
            October 9th – 11th, 2026
          </p>

          <p className="section-subtitle max-w-xl mb-10">
            HackKnight is a 48-hour hackathon where students come together to create
            innovative projects. We are a student run organization dedicated to providing
            a great event for students to learn and grow. Join us for a weekend of coding,
            learning, and fun!
          </p>

          <div className="flex gap-4 mb-12">
            <Link to="/register" className="btn-primary">Register Now</Link>
            <Link to="/schedule" className="btn-outline">View Schedule</Link>
          </div>

          <CountdownTimer />
        </motion.div>

        {/* z:2 — Tower column — hidden below md breakpoint */}
        <motion.div
          className="max-md:hidden flex shrink-0 items-start justify-center"
          style={{ position: 'relative', zIndex: 2, y: contentY }}
        >
          <div className="relative">
            <img
              src={towerSvg}
              alt="Castle Tower"
              className="tower-hero select-none pointer-events-none"
              style={towerHeight ? { height: `${towerHeight * 1.25}px`, width: 'auto' } : {}}
            />
            {/*
              Mascot overlay — positioned so the helmet eyes align with the tower arch window.
              Tower window: center-x ≈ 57.3%, center-y ≈ 24.5% of tower.
              Mascot eye region: 66.7% down the logo.
            */}
            <MascotEyes
              style={{
                position: 'absolute',
                width: '25%',
                left: '37.40%',
                top: '17%',
                pointerEvents: 'none',
              }}
            />
          </div>
        </motion.div>

      </div>
    </section>
  );
}