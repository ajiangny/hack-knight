// Fetches gallery years + photos from the Express API.
// Falls back to the bundled static data if the API is unreachable.
// Cached across navigations by useApiData, so revisiting the page renders
// the fetched photos immediately instead of re-requesting them.

import { useApiData } from "./useApiData";
import staticGallery from "../data/gallery";
import type { GalleryYear } from "../types";

export function useGallery() {
  const { data, loading, error } = useApiData<GalleryYear[]>("/gallery");
  // The API shape ({ year, photos: [{ src, alt }] }) matches the
  // static data, so components consume it unchanged.
  const galleryData =
    Array.isArray(data) && data.length > 0 ? data : staticGallery;
  return { galleryData, loading, error };
}
