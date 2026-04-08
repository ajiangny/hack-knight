// SchedulePage — Full 3-column grid at /schedule.
// Shows all three days simultaneously, identical to the original SchedulePreview grid.
// Uses standardized CSS from src/styles/components.css

import { useEffect } from 'react';
import {
  scheduleEvents,
  scheduleDays,
  formatHour,
  formatFullTime,
} from '../data/schedule';

/**
 * SMART PACKING ALGORITHM
 *
 * Objectives:
 * 1. Side-by-Side: Concurrent events (overlaps) are forced into distinct lanes (columns).
 * 2. Lane Re-use: Once an event ends, its lane is immediately available for the next one.
 * 3. Buffer Protection: Short events "reserve" their lane for 45 mins to prevent visual crush.
 */
function packEvents(events) {
  if (!events.length) return [];

  const sorted = [...events].sort((a, b) =>
    a.startHour - b.startHour ||
    scheduleEvents.indexOf(a) - scheduleEvents.indexOf(b)
  );

  const packed = [];
  const lanesUsedInClump = [];

  sorted.forEach(evt => {
    let laneIdx = -1;
    const start = evt.startHour;
    const isShort = (evt.endHour - evt.startHour) < 0.5;
    const bookingEnd = isShort ? Math.max(evt.endHour, start + 0.75) : evt.endHour;

    for (let i = 0; i < lanesUsedInClump.length; i++) {
      if (start >= lanesUsedInClump[i]) { laneIdx = i; break; }
    }

    if (laneIdx === -1) {
      laneIdx = lanesUsedInClump.length;
      lanesUsedInClump.push(bookingEnd);
    } else {
      lanesUsedInClump[laneIdx] = bookingEnd;
    }

    packed.push({ event: evt, laneIdx, totalLanes: 0 });
  });

  return packed.map(p => {
    const concurrent = packed.filter(other => {
      const pStart = p.event.startHour;
      const pEnd = Math.max(p.event.endHour, pStart + 0.1);
      const oStart = other.event.startHour;
      const oEnd = Math.max(other.event.endHour, oStart + 0.1);
      return pStart < oEnd && oStart < pEnd;
    });

    const maxLaneIdxAcrossGroup = Math.max(...concurrent.map(c => c.laneIdx), 0);
    const totalLanesForGroup = maxLaneIdxAcrossGroup + 1;

    let laneSpan = 1;
    for (let l = p.laneIdx + 1; l < totalLanesForGroup; l++) {
      if (!concurrent.some(c => c.laneIdx === l)) laneSpan++;
      else break;
    }

    return { ...p, totalLanes: totalLanesForGroup, laneSpan };
  });
}

function getRangeLabel(start, end) {
  const fmt = h => formatFullTime(h).replace(':00 ', '').replace(' ', '');
  return start === end ? fmt(start) : `${fmt(start)}–${fmt(end)}`;
}



export default function SchedulePage() {
  // Scroll to top on mount
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  // Grid bounds span ALL events so every day shares the same timescale
  const allStartHours = scheduleEvents.map(e => Math.floor(e.startHour));
  const allEndHours = scheduleEvents.map(e => Math.ceil(e.endHour));
  const minHour = Math.min(...allStartHours);
  const maxHour = Math.max(...allEndHours);
  const totalSlots = (maxHour - minHour) * 2 + 1;
  const getRow = h => Math.round((h - minHour) * 2) + 2;

  return (
    <main className="py-section">

      {/* ── PAGE HEADER (matches SponsorsPage style) ─────────────────────── */}
      <div className="text-center mb-12 px-container max-w-7xl mx-auto">
        <h1 className="section-title">Event Schedule</h1>
      </div>

      {/* ── FULL 3-COLUMN GRID ────────────────────────────────────────────── */}
      <div className="px-6">
        <div className="schedule-grid-wrapper">
          <div
            className="schedule-grid"
            style={{
              gridTemplateColumns: '5rem repeat(3, 1fr)',
              gridTemplateRows: `3.5rem repeat(${totalSlots}, 1.8rem)`,
            }}
          >
            {/* Header row */}
            <div className="schedule-grid-corner" />
            {scheduleDays.map((day, i) => (
              <div
                key={day.key}
                className="schedule-day-header"
                style={{ gridColumn: i + 2, gridRow: 1 }}
              >
                {day.label}
              </div>
            ))}

            {/* Time sidebar labels */}
            {Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i).map(hour => (
              <div
                key={`label-${hour}`}
                className="schedule-time-label"
                style={{ gridRow: `${getRow(hour)} / span 2`, gridColumn: 1 }}
              >
                {formatHour(hour)}
              </div>
            ))}

            {/* Background grid cells */}
            {Array.from({ length: totalSlots }, (_, slot) => (
              <div key={`bg-row-${slot}`} style={{ display: 'contents' }}>
                {scheduleDays.map((day, colIdx) => (
                  <div
                    key={`bg-cell-${day.key}-${slot}`}
                    className="schedule-cell"
                    style={{
                      gridRow: slot + 2,
                      gridColumn: colIdx + 2,
                      borderBottom:
                        slot % 2 === 0
                          ? '1px dashed rgba(255,255,255,0.05)'
                          : '1px solid rgba(255,255,255,0.05)',
                    }}
                  />
                ))}
              </div>
            ))}

            {/* Event cards — one pack per day column */}
            {scheduleDays.map((day, dIdx) => {
              const dayEvents = scheduleEvents.filter(e => e.day === day.key);
              const packed = packEvents(dayEvents);

              return packed.map((item, pIdx) => {
                const { event, laneIdx, totalLanes } = item;
                const startRow = getRow(event.startHour);
                const endRow = getRow(event.endHour);
                const span = Math.max(endRow - startRow, 1);

                return (
                  <div
                    key={`${day.key}-${pIdx}`}
                    className={`schedule-event color-${event.color ?? 'violet'}`}
                    style={{
                      gridRow: `${startRow} / span ${span}`,
                      gridColumn: dIdx + 2,
                      width: `calc(${(100 / totalLanes) * (item.laneSpan || 1)}% - 8px)`,
                      marginLeft: `calc(${laneIdx * (100 / totalLanes)}% + 4px)`,
                      marginTop: '2px',
                      marginBottom: '2px',
                    }}
                    title={event.label}
                  >
                    <span className="schedule-event-title">{event.label}</span>
                    <span className="schedule-event-time font-bold opacity-80 mt-0.5">
                      {getRangeLabel(event.startHour, event.endHour)}
                    </span>
                  </div>
                );
              });
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <a href="/register" className="btn-primary">
            Register Now
          </a>
        </div>
      </div>
    </main>
  );
}