// Gallery admin tab — manage years and their photos.
// Minimal styling; functional baseline for a teammate to restyle later.

import { useEffect, useState } from "react";
import {
  apiGet,
  apiPost,
  apiDelete,
  apiUpload,
  compressImage,
} from "../../lib/api";

export default function GalleryTab() {
  const [years, setYears] = useState([]);
  const [newYear, setNewYear] = useState("");
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(null); // yearId currently uploading

  async function load() {
    try {
      setYears(await apiGet("/gallery"));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addYear(e) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("/gallery/years", { year: newYear });
      setNewYear("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeYear(id) {
    if (!confirm("Delete this year and all its photos?")) return;
    try {
      await apiDelete(`/gallery/years/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadPhotos(yearId, fileList) {
    setError(null);
    setUploading(yearId);
    try {
      const formData = new FormData();
      for (const file of fileList) {
        const compressed = await compressImage(file);
        formData.append("photos", compressed, file.name);
      }
      await apiUpload(`/gallery/years/${yearId}/photos`, formData);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(null);
    }
  }

  async function removePhoto(id) {
    if (!confirm("Delete this photo?")) return;
    try {
      await apiDelete(`/gallery/photos/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-tab">
      {error && <p className="admin-error">{error}</p>}

      <h2>Add Year</h2>
      <form onSubmit={addYear} className="admin-form">
        <input
          placeholder="e.g. 2026"
          value={newYear}
          onChange={(e) => setNewYear(e.target.value)}
          required
        />
        <button type="submit">Add Year</button>
      </form>

      {years.map((year) => (
        <div key={year.id} className="admin-year">
          <div className="admin-year-head">
            <h3>{year.year}</h3>
            <button onClick={() => removeYear(year.id)}>Delete Year</button>
          </div>

          <div className="admin-photo-grid">
            {year.photos?.map((photo) => (
              <div key={photo.id} className="admin-photo">
                <img src={photo.src} alt={photo.alt} />
                <button onClick={() => removePhoto(photo.id)}>×</button>
              </div>
            ))}
          </div>

          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading === year.id}
            onChange={(e) => uploadPhotos(year.id, e.target.files)}
          />
          {uploading === year.id && <span> uploading…</span>}
        </div>
      ))}
    </div>
  );
}
