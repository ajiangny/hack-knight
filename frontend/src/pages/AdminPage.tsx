// Admin dashboard shell — tab switcher + logout.
// Tabs stay mounted (hidden, not unmounted) so staged, unsaved changes
// survive switching between them; each tab reports its unsaved-change
// count so its nav label can show the ultraviolet dot.

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion, MotionConfig } from "motion/react";
import { getSessionRemainingMs, logout, pruneExpiredToken } from "../lib/api";
import ScheduleTab from "../components/admin/schedule/ScheduleTab";
import GalleryTab from "../components/admin/gallery/GalleryTab";
import TeamTab from "../components/admin/team/TeamTab";
import SponsorsTab from "../components/admin/sponsors/SponsorsTab";
import MiscTab from "../components/admin/MiscTab";

interface AdminTab {
  key: string;
  label: string;
  Component: ComponentType<{ onDirtyChange?: (count: number) => void }>;
}

const TABS: AdminTab[] = [
  { key: "schedule", label: "Schedule", Component: ScheduleTab },
  { key: "gallery", label: "Gallery", Component: GalleryTab },
  { key: "team", label: "Team", Component: TeamTab },
  { key: "sponsors", label: "Sponsors", Component: SponsorsTab },
  { key: "misc", label: "Misc", Component: MiscTab },
];

const WARN_BEFORE_MS = 5 * 60 * 1000;
const EXPIRY_POLL_MS = 60 * 1000;

/**
 * Warns before the session lapses. Every tab holds its staged, unsaved
 * changes in memory, so redirecting the moment the token expires silently
 * destroys that work — the banner is the chance to hit Save first. Returns
 * whole minutes left once inside the warning window, otherwise null.
 */
function useSessionExpiryWarning(): number | null {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    function check() {
      const remaining = getSessionRemainingMs();
      // Already gone: clearing the token makes RequireAuth redirect.
      if (remaining <= 0) {
        pruneExpiredToken();
        return;
      }
      setMinutesLeft(
        remaining <= WARN_BEFORE_MS ? Math.ceil(remaining / 60_000) : null,
      );
    }

    check();
    const id = setInterval(check, EXPIRY_POLL_MS);
    return () => clearInterval(id);
  }, []);

  return minutesLeft;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState("schedule");
  const [dirty, setDirty] = useState<Record<string, number>>({});
  const minutesLeft = useSessionExpiryWarning();

  function handleLogout() {
    logout();
    navigate("/admin/login");
  }

  const handleDirtyChange = useCallback((key: string, count: number) => {
    setDirty((d) => (d[key] === count ? d : { ...d, [key]: count }));
  }, []);

  return (
    // reducedMotion="user" — JS-driven animations (save bar, modals, drag
    // shuffle) honor the OS setting; CSS transitions are covered globally.
    <MotionConfig reducedMotion="user">
      <main className="admin-page">
        <header className="admin-header">
          <div>
            <p className="admin-subtitle">HackKnight</p>
            <h1 className="admin-title">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="admin-btn-ghost">
              View Site
            </Link>
            <button type="button" onClick={handleLogout} className="admin-btn-ghost">
              Log Out
            </button>
          </div>
        </header>

        {minutesLeft !== null && (
          <p className="admin-warning" role="status">
            Your session expires in {minutesLeft} minute
            {minutesLeft === 1 ? "" : "s"} — save any unsaved changes now, then
            log in again.
          </p>
        )}

        <nav className="admin-tabs" aria-label="Admin sections">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`admin-tab-btn${active === tab.key ? " admin-tab-btn-active" : ""
                }`}
              aria-current={active === tab.key ? "page" : undefined}
            >
              {tab.label}
              {dirty[tab.key] > 0 && (
                <span
                  className="admin-tab-dot"
                  title={`${dirty[tab.key]} unsaved changes`}
                />
              )}
              {active === tab.key && (
                <Motion.span
                  layoutId="admin-tab-underline"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-pill bg-ultraviolet"
                  style={{ boxShadow: "0 0 8px var(--color-ultraviolet)" }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                />
              )}
            </button>
          ))}
        </nav>

        {TABS.map((tab) => (
          <div key={tab.key} hidden={active !== tab.key}>
            <tab.Component
              onDirtyChange={(count) => handleDirtyChange(tab.key, count)}
            />
          </div>
        ))}
      </main>
    </MotionConfig>
  );
}
