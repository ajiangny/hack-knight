// Fetches the site_settings key/value map from the Express API (Misc admin
// tab). Callers read individual keys and supply their own fallback defaults,
// so an unreachable API degrades to the bundled behavior.
//
// Backed by the shared useApiData cache: after the first paint fetches the
// map (the Navbar does on every public page), later navigations — clicking
// Apply Now in particular — render from the cached value instantly instead
// of holding a loading state.

import { useApiData } from "./useApiData";
import type { SiteSettings } from "../types";

const EMPTY: SiteSettings = {};

// Pass `enabled: false` to skip the fetch entirely (e.g. when a caller
// already has its own values, such as the admin live preview).
export function useSiteSettings({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, loading, error } = useApiData<SiteSettings>("/settings", {
    enabled,
  });
  const settings = data && typeof data === "object" ? data : EMPTY;
  return { settings, loading, error };
}
