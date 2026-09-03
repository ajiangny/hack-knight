// Admin dashboard shell — tab switcher + logout.
// Tabs stay mounted (hidden, not unmounted) so staged, unsaved changes
// survive switching between them; each tab reports its unsaved-change
// count so its nav label can show the ultraviolet dot.

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion, MotionConfig } from "motion/react";
import type { Session } from "@supabase/supabase-js";
import { useAuth } from "../hooks/useAuth";
import RegistrationsTab from "../components/admin/registrations/RegistrationsTab";
import ScheduleTab from "../components/admin/schedule/ScheduleTab";
import GalleryTab from "../components/admin/gallery/GalleryTab";
import TeamTab from "../components/admin/team/TeamTab";
import JudgesTab from "../components/admin/judges/JudgesTab";
import SponsorsTab from "../components/admin/sponsors/SponsorsTab";
import MiscTab from "../components/admin/MiscTab";

interface AdminTab {
  key: string;
  label: string;
  Component: ComponentType<{ onDirtyChange?: (count: number) => void }>;
}

const TABS: AdminTab[] = [
  // First: during the event this is the tab people open most.
  { key: "registrations", label: "Applications", Component: RegistrationsTab },
  { key: "schedule", label: "Schedule", Component: ScheduleTab },
  { key: "gallery", label: "Gallery", Component: GalleryTab },
  { key: "team", label: "Team", Component: TeamTab },
  { key: "judges", label: "Judges", Component: JudgesTab },
  { key: "sponsors", label: "Sponsors", Component: SponsorsTab },
  { key: "misc", label: "Misc", Component: MiscTab },
];

const WARN_BEFORE_MS = 5 * 60 * 1000;
const EXPIRY_POLL_MS = 60 * 1000;

/**
 * Warns before the session lapses. Supabase refreshes the token well ahead of
 * expiry, so this normally stays hidden — it is the safety net for a refresh
 * that cannot succeed, e.g. the Google account's access was revoked mid-visit.
 * Every tab holds its staged changes in memory, so the warning is the chance
 * to hit Save while saving still works.
 *
 * Deliberately does not sign out on expiry: a tab that slept past expires_at
 * gets a fresh token the moment it wakes, and forcing a sign-out would break
 * that. A genuinely dead session surfaces as a 401, which does redirect.
 */
function useSessionExpiryWarning(session: Session | null): number | null {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const expiresAt = session?.expires_at ?? null;

  useEffect(() => {
    if (expiresAt === null) return;
    const expiresAtMs = expiresAt * 1000;

    function check() {
      const remaining = expiresAtMs - Date.now();
      setMinutesLeft(
        remaining > 0 && remaining <= WARN_BEFORE_MS
          ? Math.ceil(remaining / 60_000)
          : null,
      );
    }

    check();
    const id = setInterval(check, EXPIRY_POLL_MS);
    return () => clearInterval(id);
  }, [expiresAt]);

  // Derived, not stored: no session means no warning, without a setState that
  // would cascade an extra render.
  return expiresAt === null ? null : minutesLeft;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState("registrations");
  const [dirty, setDirty] = useState<Record<string, number>>({});
  const { session, email, logout } = useAuth();
  const minutesLeft = useSessionExpiryWarning(session);

  async function handleLogout() {
    await logout();
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
            {email && (
              <span
                className="hidden sm:inline font-mono text-xs text-text-secondary mr-1 truncate max-w-[16rem]"
                title={email}
              >
                {email}
              </span>
            )}
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
