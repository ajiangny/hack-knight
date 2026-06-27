// Team admin tab — list / add / delete members with photo upload.
// Minimal styling; functional baseline for a teammate to restyle later.

import { useEffect, useState } from "react";
import { apiGet, apiDelete, apiUpload, compressImage } from "../../lib/api";

const EMPTY_MEMBER = { name: "", title: "" };

export default function TeamTab() {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(EMPTY_MEMBER);
  const [photo, setPhoto] = useState(null);
  const [badge, setBadge] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setMembers(await apiGet("/team"));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addMember(e) {
    e.preventDefault();
    setError(null);
    if (!photo) {
      setError("Photo is required");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("title", form.title);
      const compressedPhoto = await compressImage(photo);
      formData.append("photo", compressedPhoto, photo.name);
      if (badge) {
        const compressedBadge = await compressImage(badge);
        formData.append("badge", compressedBadge, badge.name);
      }
      await apiUpload("/team", formData);
      setForm(EMPTY_MEMBER);
      setPhoto(null);
      setBadge(null);
      e.target.reset();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeMember(id) {
    if (!confirm("Delete this member?")) return;
    try {
      await apiDelete(`/team/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-tab">
      {error && <p className="admin-error">{error}</p>}

      <h2>Members</h2>
      <div className="admin-photo-grid">
        {members.map((m) => (
          <div key={m.id} className="admin-photo">
            <img src={m.photo_url} alt={m.name} />
            <div>
              {m.name} — {m.title}
            </div>
            <button onClick={() => removeMember(m.id)}>Delete</button>
          </div>
        ))}
      </div>

      <h2>Add Member</h2>
      <form onSubmit={addMember} className="admin-form">
        <input
          placeholder="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <label>
          Photo*{" "}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0] ?? null)}
            required
          />
        </label>
        <label>
          Badge{" "}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBadge(e.target.files[0] ?? null)}
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Add Member"}
        </button>
      </form>
    </div>
  );
}
