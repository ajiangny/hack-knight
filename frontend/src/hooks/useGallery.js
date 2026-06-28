// Fetches gallery years + photos from the Express API.
// Falls back to the bundled static data if the API is unreachable.

import { useState, useEffect } from "react";
import staticGallery from "../data/gallery";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export function useGallery() {
  const [galleryData, setGalleryData] = useState(staticGallery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_URL}/gallery`);
        if (!res.ok) throw new Error("Failed to fetch gallery");
        const data = await res.json();
        if (cancelled) return;
        // The API shape ({ year, photos: [{ src, alt }] }) matches the
        // static data, so components consume it unchanged.
        if (Array.isArray(data) && data.length > 0) setGalleryData(data);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { galleryData, loading, error };
}
