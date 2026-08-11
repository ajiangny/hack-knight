// Add / edit sponsor modal for the sponsors tab.

import { useRef, useState } from "react";
import type { SponsorTier } from "../../../types";
import { Field, Modal } from "../ui";
import type { SponsorForm } from "../adminTypes";
import { TIERS } from "./sponsorUtils";

interface SponsorModalProps {
  open: boolean;
  initial: SponsorForm | null;
  trackUrl: (file: File) => string;
  onSubmit: (form: SponsorForm) => void;
  onClose: () => void;
}

export default function SponsorModal({ open, initial, trackUrl, onSubmit, onClose }: SponsorModalProps) {
  const [form, setForm] = useState(initial);
  const [formError, setFormError] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Reset the form when a new sponsor is opened — state adjustment during
  // render (not an effect) so the previous form persists through the
  // modal's exit animation.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    if (initial) {
      setForm(initial);
      setFormError(null);
    }
  }

  if (!form) return null;
  const isNew = !form.id;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (isNew && !form._logoFile) {
      setFormError("A logo is required");
      return;
    }
    onSubmit({
      ...form,
      name: form.name.trim(),
      url: form.url.trim(),
      blurb: form.blurb.trim(),
    });
  }

  const logoPreview = form._logoPreview ?? form.logo_url;

  return (
    <Modal
      open={open}
      title={isNew ? "Add Sponsor" : `Edit ${form.name}`}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name" htmlFor="sponsor-name">
            <input
              id="sponsor-name"
              className="admin-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </Field>
          <Field label="Tier" htmlFor="sponsor-tier">
            <select
              id="sponsor-tier"
              className="admin-select"
              value={form.tier}
              onChange={(e) =>
                setForm({ ...form, tier: e.target.value as SponsorTier })
              }
            >
              {TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Website URL" htmlFor="sponsor-url">
          <input
            id="sponsor-url"
            className="admin-input"
            type="url"
            placeholder="https://…"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
        </Field>

        <Field label="Blurb" htmlFor="sponsor-blurb">
          <textarea
            id="sponsor-blurb"
            className="admin-input min-h-24 resize-y"
            placeholder="Shown on the /sponsors page — optional"
            value={form.blurb}
            onChange={(e) => setForm({ ...form, blurb: e.target.value })}
          />
        </Field>

        <Field label={isNew ? "Logo (required)" : "Logo"}>
          <div className="flex items-center gap-3">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt=""
                aria-hidden="true"
                className="w-14 h-14 object-contain bg-black/30 rounded-lg p-1.5"
              />
            ) : (
              <span className="font-mono text-xs text-text-muted">none</span>
            )}
            <button
              type="button"
              className="admin-btn-ghost"
              onClick={() => logoRef.current?.click()}
            >
              Choose…
            </button>
          </div>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setForm({ ...form, _logoFile: file, _logoPreview: trackUrl(file) });
              e.target.value = "";
            }}
          />
        </Field>

        {formError && <p className="admin-error">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="admin-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="admin-btn-primary">
            {isNew ? "Add Sponsor" : "Apply"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
