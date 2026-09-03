// Judges grid — a leaner TeamSection: photo, name, title, company badges.
// No character badge, so no flip card; the parallax tilt stays for cohesion.
// Until the admin flips judges_revealed on (or while there are no judges),
// the section shows a "To Be Announced!" teaser instead.

import { useRef } from 'react';
import { useJudges } from '../../hooks/useJudges';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import type { Judge } from '../../types';

function JudgeCard({ judge }: { judge: Judge }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      const MAX = 8;
      el.style.transition = 'transform 0.12s ease-out';
      el.style.transform = `perspective(600px) rotateX(${-ny * MAX}deg) rotateY(${nx * MAX}deg) scale3d(1.04,1.04,1.04)`;
    });
  }

  function handleMouseLeave() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    const el = cardRef.current;
    if (el) {
      el.style.transition = 'transform 0.35s ease-out';
      el.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    }
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Photo Block (parallax tilt, no flip) ── */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative aspect-square rounded-xl overflow-hidden bg-white hover:border-ultraviolet/40 hover:shadow-glow transition-[box-shadow,border-color] duration-300"
        style={{ willChange: 'transform' }}
      >
        {/* No preserve-3d flip card here, so lazy-loading is safe (unlike TeamSection). */}
        <img
          src={judge.photo}
          alt={judge.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>

      {/* ── Name & Title ── */}
      <div className="flex justify-between">
        <div>
          <p className="font-display font-bold text-base text-text-primary">
            {judge.name}
          </p>
          <p className="font-body text-sm text-ultraviolet">
            {judge.title}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {(judge.companies ?? []).map((company) => (
            <img
              key={company.id}
              src={company.logo}
              alt={`${company.name} logo`}
              title={company.name}
              decoding="async"
              className="w-6 h-6 object-contain transition-all duration-200 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.85)] hover:scale-110"
            />
          ))}
        </div>
      </div>

    </div>
  );
}

export default function JudgesSection() {
  const { judges } = useJudges();
  const { settings } = useSiteSettings();
  // Absent key = hidden — judges stay teased until the admin reveals them.
  const revealed = settings.judges_revealed === 'true';

  return (
    <div className="section-wrapper">

      <h2 className="section-title text-center">
        Meet The Judges
      </h2>

      <div className="bg-surface rounded-3xl py-8 sm:py-14 px-6 sm:px-12 mt-6 sm:mt-10">
        {revealed && judges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {judges.map((judge) => (
              <JudgeCard key={judge.id} judge={judge} />
            ))}
          </div>
        ) : (
          <p className="font-body text-text-secondary text-center text-sm sm:text-2xl">
            To Be Announced!
          </p>
        )}
      </div>

    </div>
  );
}
