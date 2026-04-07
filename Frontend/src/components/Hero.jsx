import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CountdownTimer from './CountdownTimer';
import hillsBgSvg from '../assets/hillsbg.svg';
import hillsSvg from '../assets/hills.svg';
import knightsSvg from '../assets/knights1.svg';
import towerSvg from '../assets/tower.svg';

export default function Hero() {
  const hillsGroupRef = useRef(null);  // back hill + knights move together
  const hillsRef = useRef(null);
  const leftColRef = useRef(null);
  const towerColRef = useRef(null);
  const [towerHeight, setTowerHeight] = useState(null); // tower height is set dynamically to match the left column

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (hillsGroupRef.current) hillsGroupRef.current.style.transform = `translateY(${y * 0.90}px)`;
      if (hillsRef.current) hillsRef.current.style.transform = `translateY(${y * 0.15}px)`;
      if (leftColRef.current) leftColRef.current.style.transform = `translateY(${y * 0.40}px)`;
      if (towerColRef.current) towerColRef.current.style.transform = `translateY(${y * 0.40}px)`;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keep tower image height in sync with left column rendered height
  useEffect(() => {
    if (!leftColRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setTowerHeight(entry.contentRect.height);
    });
    observer.observe(leftColRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="hero"
      className="relative overflow-hidden min-h-screen flex items-center"
      style={{ isolation: 'isolate' }}
    >
      {/* z:0 — Back hill + Knights grouped together */}
      <div
        ref={hillsGroupRef}
        className="absolute left-0 w-full will-change-transform"
        style={{ bottom: '0%', transform: 'translateY(0px)', zIndex: 0 }}
      >
        {/* Back hill */}
        <img src={hillsBgSvg} alt="" aria-hidden="true"
          className="absolute left-0 w-full pointer-events-none select-none"
          style={{ bottom: 0, opacity: 0.35 }}
        />
        {/* Knights float on top of back hill */}
        <img src={knightsSvg} alt="" aria-hidden="true"
          className="absolute left-0 w-full pointer-events-none select-none knights-float"
          style={{ bottom: 0 }}
        />
      </div>

      {/* z:3 — Front hill (above tower at z:2) */}
      <img ref={hillsRef} src={hillsSvg} alt="" aria-hidden="true"
        className="absolute left-0 w-full pointer-events-none select-none will-change-transform"
        style={{ bottom: '0%', filter: 'brightness(0.8)', transform: 'translateY(0px)', zIndex: 3 }}
      />

      {/*
        ── Two-column content row ────────────────────────────────
        NO transform on this wrapper → no stacking context created.
        Children can each declare their own z-index in the section's
        stacking context, letting the front hill (z:3) sit between
        the tower (z:2) and the left content (z:4).
      */}
      <div className="section-wrapper w-full flex flex-row items-start justify-between gap-16 relative pt-40 pb-32">

        {/* z:4 — Left content (transforms independently → z:4 in section ctx) */}
        <div
          ref={leftColRef}
          className="flex flex-col items-start text-left flex-1 will-change-transform"
          style={{ position: 'relative', zIndex: 4 }}
        >
          <h1 className="font-display font-bold text-hero text-text-primary mb-4 leading-none">
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
        </div>

        {/* z:2 — Tower (transforms independently → z:2 in section ctx, behind front hill) */}
        <div
          ref={towerColRef}
          className="shrink-0 flex items-start justify-center will-change-transform"
          style={{ position: 'relative', zIndex: 2 }}
        >
          <img
            src={towerSvg}
            alt="Castle Tower"
            className="tower-hero select-none pointer-events-none"
            style={towerHeight ? { height: `${towerHeight * 1.25}px`, width: 'auto' } : {}}
          />
        </div>

      </div>
    </section>
  );
}