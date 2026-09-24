// Misc admin tab — one-off site settings that don't warrant their own tab.
// Countdown target date (staged + previewed live through the real public
// CountdownTimer component), the registration toggles (including whether the
// closed /register page reads "Opening Soon" or "Closed"), the MLH trust
// badge toggle, the "More Sponsors TBA!" teaser toggle, and the event location
// (name + optional Google Maps link) shown under the hero date.

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPut } from "../../lib/api";
import { MLH_BADGE_SRC, MLH_BADGE_ALT } from "../../lib/mlh";
import {
  DEFAULT_LOCATION_NAME,
  DEFAULT_LOCATION_URL,
  LOCATION_NAME_KEY,
  LOCATION_URL_KEY,
} from "../../lib/location";
import type { SiteSettings } from "../../types";
import CountdownTimer from "../site/CountdownTimer";
import { Panel, Field, SaveBar, DiffModal, Toggle, ScaledPreview, type Change } from "./ui";

const COUNTDOWN_KEY = "countdown_target";
const MLH_KEY = "mlh_badge_enabled";
const REGISTRATION_KEY = "registration_open";
const CLOSED_MODE_KEY = "registration_closed_mode";
const MLH_DISCLAIMER_KEY = "mlh_disclaimer_enabled";
const SPONSORS_TBA_KEY = "sponsors_tba_enabled";

type AppliedChange = Change & { apply: () => Promise<unknown> };

// "2026-10-09T00:00:00" -> { date: "2026-10-09", time: "00:00" }
function splitDateTime(value: string) {
  const [date, time] = value.split("T");
  return { date: date ?? "", time: (time ?? "00:00:00").slice(0, 5) };
}

function joinDateTime(date: string, time: string) {
  return `${date}T${time || "00:00"}:00`;
}

function formatDisplay(value: string | undefined) {
  const d = new Date(value ?? NaN);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MiscTab({ onDirtyChange }: { onDirtyChange?: (count: number) => void }) {
  const [serverSettings, setServerSettings] = useState<SiteSettings | null>(null);
  const [draftSettings, setDraftSettings] = useState<SiteSettings | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const settings = await apiGet<SiteSettings>("/settings");
      setServerSettings(settings);
      setDraftSettings({ ...settings });
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setDraft(key: string, value: string) {
    setDraftSettings((s) => ({ ...s, [key]: value }));
  }

  const changes = useMemo(() => {
    if (!serverSettings || !draftSettings) return [];
    const list: AppliedChange[] = [];

    if (draftSettings[COUNTDOWN_KEY] !== serverSettings[COUNTDOWN_KEY]) {
      list.push({
        kind: "edit",
        summary: "Countdown target date",
        detail: `${formatDisplay(serverSettings[COUNTDOWN_KEY])} → ${formatDisplay(
          draftSettings[COUNTDOWN_KEY],
        )}`,
        apply: () =>
          apiPut(`/settings/${COUNTDOWN_KEY}`, {
            value: draftSettings[COUNTDOWN_KEY],
          }),
      });
    }

    if (draftSettings[MLH_KEY] !== serverSettings[MLH_KEY]) {
      const on = draftSettings[MLH_KEY] === "true";
      list.push({
        kind: "edit",
        summary: "MLH trust badge",
        detail: on
          ? "Hidden → shown on the public site"
          : "Shown → hidden on the public site",
        apply: () =>
          apiPut(`/settings/${MLH_KEY}`, { value: draftSettings[MLH_KEY] }),
      });
    }

    if (draftSettings[REGISTRATION_KEY] !== serverSettings[REGISTRATION_KEY]) {
      const open = draftSettings[REGISTRATION_KEY] === "true";
      list.push({
        kind: "edit",
        summary: "Applications",
        detail: open
          ? "Closed → /register accepts submissions"
          : "Open → /register shows the closed page",
        apply: () =>
          apiPut(`/settings/${REGISTRATION_KEY}`, {
            value: draftSettings[REGISTRATION_KEY],
          }),
      });
    }

    // Absent key = "coming_soon", so compare effective values.
    const closedLabel = (v: string | undefined) =>
      v === "closed" ? "Applications closed" : "Opening soon";
    if (
      closedLabel(draftSettings[CLOSED_MODE_KEY]) !==
      closedLabel(serverSettings[CLOSED_MODE_KEY])
    ) {
      list.push({
        kind: "edit",
        summary: "Closed applications page",
        detail: `${closedLabel(serverSettings[CLOSED_MODE_KEY])} → ${closedLabel(
          draftSettings[CLOSED_MODE_KEY],
        )}`,
        apply: () =>
          apiPut(`/settings/${CLOSED_MODE_KEY}`, {
            value: draftSettings[CLOSED_MODE_KEY],
          }),
      });
    }

    if (draftSettings[SPONSORS_TBA_KEY] !== serverSettings[SPONSORS_TBA_KEY]) {
      const on = draftSettings[SPONSORS_TBA_KEY] === "true";
      list.push({
        kind: "edit",
        summary: "Sponsors TBA teaser",
        detail: on
          ? "Hidden → shown under the homepage sponsor carousel"
          : "Shown → hidden under the homepage sponsor carousel",
        apply: () =>
          apiPut(`/settings/${SPONSORS_TBA_KEY}`, {
            value: draftSettings[SPONSORS_TBA_KEY],
          }),
      });
    }

    if (draftSettings[MLH_DISCLAIMER_KEY] !== serverSettings[MLH_DISCLAIMER_KEY]) {
      const on = draftSettings[MLH_DISCLAIMER_KEY] === "true";
      list.push({
        kind: "edit",
        summary: "MLH pre-partnership disclaimer",
        detail: on
          ? "Hidden → shown on the application form"
          : "Shown → hidden on the application form",
        apply: () =>
          apiPut(`/settings/${MLH_DISCLAIMER_KEY}`, {
            value: draftSettings[MLH_DISCLAIMER_KEY],
          }),
      });
    }

    // Both keys may be absent (never saved), and an empty name falls back to
    // the default, so compare the effective values: retyping the default or
    // clearing a never-saved field is not a change.
    if (
      (draftSettings[LOCATION_NAME_KEY] || DEFAULT_LOCATION_NAME) !==
      (serverSettings[LOCATION_NAME_KEY] || DEFAULT_LOCATION_NAME)
    ) {
      list.push({
        kind: "edit",
        summary: "Event location name",
        detail: `${serverSettings[LOCATION_NAME_KEY] || DEFAULT_LOCATION_NAME} → ${
          draftSettings[LOCATION_NAME_KEY] || DEFAULT_LOCATION_NAME
        }`,
        apply: () =>
          apiPut(`/settings/${LOCATION_NAME_KEY}`, {
            value: draftSettings[LOCATION_NAME_KEY] ?? "",
          }),
      });
    }

    if (
      (draftSettings[LOCATION_URL_KEY] ?? DEFAULT_LOCATION_URL) !==
      (serverSettings[LOCATION_URL_KEY] ?? DEFAULT_LOCATION_URL)
    ) {
      const showUrl = (v: string | undefined) =>
        (v ?? DEFAULT_LOCATION_URL) || "(none — plain text)";
      list.push({
        kind: "edit",
        summary: "Event location link",
        detail: `${showUrl(serverSettings[LOCATION_URL_KEY])} → ${showUrl(
          draftSettings[LOCATION_URL_KEY],
        )}`,
        apply: () =>
          apiPut(`/settings/${LOCATION_URL_KEY}`, {
            value: draftSettings[LOCATION_URL_KEY] ?? "",
          }),
      });
    }

    return list;
  }, [serverSettings, draftSettings]);

  useEffect(() => {
    onDirtyChange?.(changes.length);
  }, [changes.length, onDirtyChange]);

  function discard() {
    setDraftSettings({ ...serverSettings });
  }

  async function applySave() {
    setSaving(true);
    setSaveError(null);
    try {
      for (const change of changes) await change.apply();
      setReviewOpen(false);
      await load();
    } catch (err) {
      setSaveError(`Save failed: ${(err as Error).message}. Please try again.`);
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (draftSettings === null) {
    return error ? <p className="admin-error">{error}</p> : null;
  }

  const countdownValue = draftSettings[COUNTDOWN_KEY] ?? "";
  const { date, time } = splitDateTime(countdownValue);
  const mlhOn = draftSettings[MLH_KEY] === "true";
  // Absent key = closed, matching how the backend reads it.
  const registrationOpen = draftSettings[REGISTRATION_KEY] === "true";
  // Absent key = "coming_soon", the page shown before applications ever open.
  const showClosed = draftSettings[CLOSED_MODE_KEY] === "closed";
  // Absent key = shown — the disclaimer must stay up until MLH membership is
  // official, so only an explicit "false" hides it.
  const disclaimerOn = draftSettings[MLH_DISCLAIMER_KEY] !== "false";
  // Absent key = shown, same as the disclaimer: the teaser should be up while
  // the sponsor lineup is still filling in.
  const sponsorsTbaOn = draftSettings[SPONSORS_TBA_KEY] !== "false";

  return (
    <div>
      {error && <p className="admin-error">{error}</p>}
      {saveError && !reviewOpen && <p className="admin-error">{saveError}</p>}

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <div className="flex flex-col gap-6">
          <Panel title="Countdown Timer">
            <p className="admin-help mb-4">
              The date and time the homepage countdown counts down to.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Event Date" htmlFor="countdown-date">
                <input
                  id="countdown-date"
                  type="date"
                  className="admin-input"
                  value={date}
                  onChange={(e) =>
                    setDraft(COUNTDOWN_KEY, joinDateTime(e.target.value, time))
                  }
                />
              </Field>
              <Field label="Event Time" htmlFor="countdown-time">
                <input
                  id="countdown-time"
                  type="time"
                  className="admin-input"
                  value={time}
                  onChange={(e) =>
                    setDraft(COUNTDOWN_KEY, joinDateTime(date, e.target.value))
                  }
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Applications">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <label
                  className="admin-label mb-0.5 cursor-pointer"
                  htmlFor="registration-open-toggle"
                >
                  Accept applications
                </label>
                <p className="admin-help">
                  When off, /register shows the closed page and the API
                  rejects submissions. Turn on when applications open.
                </p>
              </div>
              <Toggle
                id="registration-open-toggle"
                label="Accept applications"
                checked={registrationOpen}
                onChange={(next) =>
                  setDraft(REGISTRATION_KEY, next ? "true" : "false")
                }
              />
            </div>

            {/* Only matters while applications are off, so hide it otherwise. */}
            {!registrationOpen && (
              <div className="flex items-center justify-between gap-4 mt-5 pt-5 border-t border-border/40">
                <div className="min-w-0">
                  <label
                    className="admin-label mb-0.5 cursor-pointer"
                    htmlFor="registration-closed-toggle"
                  >
                    Show &quot;Applications Closed&quot;
                  </label>
                  <p className="admin-help">
                    What /register shows while applications are off. Off shows
                    &quot;Applications Opening Soon&quot;; on shows
                    &quot;Applications Closed&quot;.
                  </p>
                </div>
                <Toggle
                  id="registration-closed-toggle"
                  label="Show Applications Closed"
                  checked={showClosed}
                  onChange={(next) =>
                    setDraft(CLOSED_MODE_KEY, next ? "closed" : "coming_soon")
                  }
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-4 mt-5 pt-5 border-t border-border/40">
              <div className="min-w-0">
                <label
                  className="admin-label mb-0.5 cursor-pointer"
                  htmlFor="mlh-disclaimer-toggle"
                >
                  Pre-partnership disclaimer
                </label>
                <p className="admin-help">
                  Shows the &quot;we are in the process of partnering with
                  MLH&quot; note above the MLH checkboxes on the application
                  form. Leave on until HackKnight is an official MLH
                  member event.
                </p>
              </div>
              <Toggle
                id="mlh-disclaimer-toggle"
                label="Show MLH pre-partnership disclaimer"
                checked={disclaimerOn}
                onChange={(next) =>
                  setDraft(MLH_DISCLAIMER_KEY, next ? "true" : "false")
                }
              />
            </div>
          </Panel>

          <Panel title="MLH Trust Badge">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <label
                  className="admin-label mb-0.5 cursor-pointer"
                  htmlFor="mlh-badge-toggle"
                >
                  Show badge
                </label>
                <p className="admin-help">
                  Pins the official MLH trust badge to the top-left of the
                  public site. Turn on once MLH approves the badge.
                </p>
              </div>
              <Toggle
                id="mlh-badge-toggle"
                label="Show MLH trust badge"
                checked={mlhOn}
                onChange={(next) => setDraft(MLH_KEY, next ? "true" : "false")}
              />
            </div>
          </Panel>

          <Panel title="Sponsors">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <label
                  className="admin-label mb-0.5 cursor-pointer"
                  htmlFor="sponsors-tba-toggle"
                >
                  &quot;More Sponsors TBA!&quot; teaser
                </label>
                <p className="admin-help">
                  Shows a &quot;More Sponsors TBA!&quot; note under the homepage
                  sponsor carousel. Turn off once the lineup is final.
                </p>
              </div>
              <Toggle
                id="sponsors-tba-toggle"
                label="Show More Sponsors TBA teaser"
                checked={sponsorsTbaOn}
                onChange={(next) =>
                  setDraft(SPONSORS_TBA_KEY, next ? "true" : "false")
                }
              />
            </div>
          </Panel>

          <Panel title="Location">
            <p className="admin-help mb-4">
              Shown under the event date in the hero as &quot;Located @ …&quot;.
              With a link, the name opens it in a new tab; leave the link
              empty to show the name as plain text.
            </p>
            <div className="flex flex-col gap-3">
              <Field label="Location name" htmlFor="location-name">
                <input
                  id="location-name"
                  type="text"
                  className="admin-input"
                  value={draftSettings[LOCATION_NAME_KEY] ?? DEFAULT_LOCATION_NAME}
                  placeholder={DEFAULT_LOCATION_NAME}
                  onChange={(e) => setDraft(LOCATION_NAME_KEY, e.target.value)}
                />
              </Field>
              <Field label="Google Maps link (optional)" htmlFor="location-url">
                <input
                  id="location-url"
                  type="url"
                  className="admin-input"
                  value={draftSettings[LOCATION_URL_KEY] ?? DEFAULT_LOCATION_URL}
                  placeholder="https://www.google.com/maps/…"
                  onChange={(e) => setDraft(LOCATION_URL_KEY, e.target.value)}
                />
              </Field>
            </div>
          </Panel>
        </div>

        <Panel title="Live Preview" className="lg:sticky lg:top-6">
          <p className="admin-help mb-3">
            How the countdown will look after saving.
          </p>
          <div className="bg-black/20 border border-border/40 rounded-xl py-6 px-4">
            {/* The public timer sizes itself to the viewport, so it can be
                wider than this half-width panel — scale it down to fit. */}
            <ScaledPreview>
              <CountdownTimer targetDate={countdownValue} />
            </ScaledPreview>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <img
              src={MLH_BADGE_SRC}
              alt={MLH_BADGE_ALT}
              className={`w-14 shrink-0 transition-all duration-300 ease-brand
                ${mlhOn ? "" : "grayscale opacity-35"}`}
            />
            <p className="admin-help">
              MLH badge {mlhOn ? "shown" : "hidden"} on the public site
            </p>
          </div>
        </Panel>
      </div>

      <SaveBar
        count={changes.length}
        saving={saving}
        onSave={() => {
          setSaveError(null);
          setReviewOpen(true);
        }}
        onDiscard={discard}
      />

      <DiffModal
        open={reviewOpen}
        changes={changes}
        saving={saving}
        error={saveError}
        onConfirm={applySave}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  );
}
