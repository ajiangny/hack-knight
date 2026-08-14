// components/SponsorsCarousel.tsx
// Displays sponsor logos on the homepage: a static centered row when there are
// only a few, an infinite scrolling carousel once there are CAROUSEL_MIN or more.
// Imports sponsor data from data/sponsors.ts
// Has a link to the full /sponsors page and an admin-toggleable
// "More Sponsors TBA!" teaser (sponsors_tba_enabled site setting).

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';            // Link for navigating to /sponsors
import { motion } from 'motion/react';              // Framer Motion for infinite carousel loop
import { useSponsors } from '../../hooks/useSponsors';  // fetches sponsors from the API (static fallback)
import { useSiteSettings } from '../../hooks/useSiteSettings';  // sponsors_tba_enabled toggle
import type { Sponsor } from '../../types';

// Pixels per second the strip travels, so the pace stays the same whether there
// are 6 sponsors or 20.
const SCROLL_SPEED = 45;

// With fewer sponsors than this, skip the carousel and show a plain static row —
// looping a handful of logos looks repetitive and busy.
const CAROUSEL_MIN = 6;

// In the static row, cards grow by this much for every sponsor short of
// CAROUSEL_MIN, so a lone sponsor gets the biggest card and the sizes ease
// back down to the carousel's default as more sponsors sign on.
const GROWTH_PER_MISSING_SPONSOR = 0.12;

/** One logo card — a link only when the sponsor has a real URL. */
function SponsorCard({ sponsor, duplicate }: { sponsor: Sponsor; duplicate: boolean }) {
  // Dimensions are the old fixed sizes (w-36 h-24 / sm:w-56 sm:h-36, logo
  // max-h-14 / sm:max-h-20) multiplied by --logo-scale, which the static row
  // sets from the sponsor count. It's unset in the carousel, so the fallback
  // of 1 keeps these at the default minimum size there.
  const className = "card-sponsor shrink-0 flex items-center justify-center p-3 sm:p-8 " +
    "w-[calc(9rem*var(--logo-scale,1))] h-[calc(6rem*var(--logo-scale,1))] " +
    "sm:w-[calc(14rem*var(--logo-scale,1))] sm:h-[calc(9rem*var(--logo-scale,1))]";
  const logo = <img src={sponsor.logo} alt={sponsor.name} className="max-w-[85%] max-h-[calc(3.5rem*var(--logo-scale,1))] sm:max-h-[calc(5rem*var(--logo-scale,1))] object-contain" />;

  if (!sponsor.url || sponsor.url === '#') return <div className={className}>{logo}</div>;
  return (
    // Repeated cards are hidden from assistive tech, so keep them out of the
    // tab order too.
    <a
      href={sponsor.url}
      target="_blank"
      rel="noreferrer"
      className={className}
      tabIndex={duplicate ? -1 : undefined}
    >
      {logo}
    </a>
  );
}

export default function SponsorsCarousel() {
  const { sponsors } = useSponsors();
  const { settings } = useSiteSettings();
  // Shown unless the admin explicitly turns it off (sponsors_tba_enabled) —
  // like the MLH disclaimer, a missing key means the row was never saved,
  // and while the sponsor list is short the teaser should default to on.
  const showTba = settings.sponsors_tba_enabled !== 'false';
  // Few enough sponsors that a scrolling strip isn't needed — render them as a
  // plain centered row instead. The measurement refs below stay unattached in
  // that mode, so the layout effect bails out and no animation runs.
  const isStatic = sponsors.length < CAROUSEL_MIN;

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  // Width of one copy of the sponsor list (including the gap that follows it)
  // and of the strip it has to fill. Both are measured from the DOM because
  // they depend on the breakpoint and on how many sponsors there are.
  const [metrics, setMetrics] = useState({ groupWidth: 0, viewportWidth: 0 });

  // Repeat the list until a single pass is at least as wide as the strip —
  // otherwise a short list (1–2 sponsors) leaves visible dead space as the
  // track scrolls. The track then renders two identical halves of `copies`
  // groups each, so animating to -50% lands exactly on the seam.
  const copies = metrics.groupWidth > 0
    ? Math.max(1, Math.ceil(metrics.viewportWidth / metrics.groupWidth))
    : 1;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const group = groupRef.current;
    if (!viewport || !track || !group) return;

    const measure = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const groupWidth = group.offsetWidth + gap;
      const viewportWidth = viewport.offsetWidth;
      setMetrics(prev =>
        prev.groupWidth === groupWidth && prev.viewportWidth === viewportWidth
          ? prev
          : { groupWidth, viewportWidth },
      );
    };

    measure();
    // Re-measure on resize: the cards, the gap and the strip all change size
    // across breakpoints, which changes how many copies are needed.
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(group);
    return () => observer.disconnect();
  }, [sponsors]);

  // One half of the track scrolls past per loop; keep that at a constant speed.
  const distance = copies * metrics.groupWidth;
  const duration = distance > 0 ? distance / SCROLL_SPEED : 40;

  return (
    <div className="section-wrapper my-0.5">

      {/* Header — outside the surface card, above it */}
      <h2 className="section-title text-center text-2xl sm:text-4xl md:text-6xl mb-6 sm:mb-10">Our Sponsors</h2>

      {/* Surface card — sponsor logos, static row or carousel strip */}
      <div className="bg-surface rounded-3xl py-6 sm:py-12">
        {isStatic ? (
          /* Static centered row — wraps onto extra lines on narrow screens.
             --logo-scale grows the cards when there are few sponsors:
             5 sponsors ≈ 1.12×, down to 1 sponsor = 1.6× the default size. */
          <div
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 px-4 py-3 sm:py-6"
            style={{ '--logo-scale': 1 + (CAROUSEL_MIN - sponsors.length) * GROWTH_PER_MISSING_SPONSOR } as CSSProperties}
          >
            {sponsors.map((sponsor, index) => (
              <SponsorCard key={sponsor.id ?? index} sponsor={sponsor} duplicate={false} />
            ))}
          </div>
        ) : (
        /* Horizontal scrolling row of sponsor logos */
        <div
          ref={viewportRef}
          className="w-full py-3 sm:py-6 overflow-hidden relative flex"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
          }}
        >
          <motion.div
            ref={trackRef}
            className="flex items-center gap-4 sm:gap-8 w-max pr-4 sm:pr-8"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              ease: "linear",
              duration,
              repeat: Infinity
            }}
          >
            {/* Two identical halves, each `copies` repeats of the sponsor list.
                Each group repeats the parent's gap so the spacing stays even,
                and the trailing padding matches one gap so the seam is exact. */}
            {Array.from({ length: copies * 2 }, (_, groupIndex) => (
              <div
                key={groupIndex}
                ref={groupIndex === 0 ? groupRef : undefined}
                className="flex items-center gap-4 sm:gap-8"
                aria-hidden={groupIndex > 0}
              >
                {sponsors.map((sponsor, index) => (
                  <SponsorCard key={sponsor.id ?? index} sponsor={sponsor} duplicate={groupIndex > 0} />
                ))}
              </div>
            ))}
          </motion.div>
        </div>
        )}
      </div>

      {/* Teaser under the carousel while the sponsor lineup is still filling
          in — admin-toggleable via sponsors_tba_enabled. */}
      {showTba && (
        <p className="font-body text-text-secondary text-center text-sm sm:text-lg mt-6 sm:mt-8">
          More Sponsors TBA!
        </p>
      )}

      {/* "View All" button — outside the surface card, below it */}
      <div className="text-center mt-6 sm:mt-8">
        <Link to="/sponsors" className="btn-outline text-xs px-4 py-2 sm:text-base sm:px-6 sm:py-3">View All Sponsors</Link> {/* navigates to the dedicated /sponsors page */}
      </div>

    </div>
  );
}
