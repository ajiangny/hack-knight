// Add / edit judge modal for the judges tab — MemberModal minus the
// social links and character badge.

import { useRef, useState } from "react";
import { Field, Modal } from "../ui";
import type { AdminCompany, JudgeForm } from "../adminTypes";

/* ── File picker button with thumbnail preview ── */

interface FilePickProps {
  label: string;
  preview?: string | null;
  onFile: (file: File) => void;
}

function FilePick({ label, preview, onFile }: FilePickProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        {preview ? (
          <img
            src={preview}
            alt=""
            aria-hidden="true"
            className="w-14 h-14 rounded-lg object-cover"
          />
        ) : (
          <span className="font-mono text-xs text-text-muted">none</span>
        )}
        <button
          type="button"
          className="admin-btn-ghost"
          onClick={() => inputRef.current?.click()}
        >
          Choose…
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </Field>
  );
}

/* ── Modal ── */

interface JudgeModalProps {
  open: boolean;
  initial: JudgeForm | null;
  companies: AdminCompany[];
  trackUrl: (file: File) => string;
  onSubmit: (form: JudgeForm) => void;
  onClose: () => void;
}

export default function JudgeModal({ open, initial, companies, trackUrl, onSubmit, onClose }: JudgeModalProps) {
  const [form, setForm] = useState(initial);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form when a new judge is opened — state adjustment during
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
    if (!form.name.trim() || !form.title.trim()) {
      setFormError("Name and title are required");
      return;
    }
    if (isNew && !form._photoFile) {
      setFormError("A profile photo is required");
      return;
    }
    if (
      form.company1_id &&
      form.company2_id &&
      form.company1_id === form.company2_id
    ) {
      setFormError("Pick two different companies (or just one)");
      return;
    }
    onSubmit({ ...form, name: form.name.trim(), title: form.title.trim() });
  }

  function companyOptions(excludeId: string) {
    return companies.filter((c) => c.id !== excludeId);
  }

  return (
    <Modal
      open={open}
      title={isNew ? "Add Judge" : `Edit ${form.name}`}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name" htmlFor="judge-name">
            <input
              id="judge-name"
              className="admin-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </Field>
          <Field label="Title" htmlFor="judge-title">
            <input
              id="judge-title"
              className="admin-input"
              placeholder="e.g. Software Engineer"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Company Badge 1" htmlFor="judge-company1">
            <select
              id="judge-company1"
              className="admin-select"
              value={form.company1_id}
              onChange={(e) => setForm({ ...form, company1_id: e.target.value })}
            >
              <option value="">— None —</option>
              {companyOptions(form.company2_id).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Company Badge 2" htmlFor="judge-company2">
            <select
              id="judge-company2"
              className="admin-select"
              value={form.company2_id}
              onChange={(e) => setForm({ ...form, company2_id: e.target.value })}
            >
              <option value="">— None —</option>
              {companyOptions(form.company1_id).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="admin-help -mt-2">
          Company logos are shared with the Team tab — add new ones there,
          under Companies. Badge 1 shows first.
        </p>

        <FilePick
          label={isNew ? "Profile Photo (required)" : "Profile Photo"}
          preview={form._photoPreview ?? form.photo_url}
          onFile={(file) =>
            setForm({ ...form, _photoFile: file, _photoPreview: trackUrl(file) })
          }
        />

        {formError && <p className="admin-error">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="admin-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="admin-btn-primary">
            {isNew ? "Add Judge" : "Apply"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
