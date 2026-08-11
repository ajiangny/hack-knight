// Fetches sponsors from the Express API (backed by the sponsors table,
// which is separate from the badge companies shown in the team section).
// Falls back to the bundled static data if the API is unreachable.
// Cached across navigations by useApiData, so revisiting the page renders
// the fetched sponsors immediately instead of re-requesting them.

import { useMemo } from "react";
import { useApiData } from "./useApiData";
import { sponsors as staticSponsors } from "../data/sponsors";
import type { Sponsor, SponsorTier } from "../types";

const TIER_RANK: Record<SponsorTier, number> = {
  platinum: 0,
  gold: 1,
  silver: 2,
  bronze: 3,
};

/** Raw row from the Express API (snake_case DB columns). */
interface SponsorRow {
  id: string;
  name: string;
  logo_url: string;
  tier: SponsorTier;
  url?: string | null;
  blurb?: string | null;
  sort_order?: number;
}

function mapSponsor(s: SponsorRow): Sponsor {
  return {
    id: s.id,
    name: s.name,
    logo: s.logo_url,
    tier: s.tier,
    url: s.url || "#",
    companyBlurb: s.blurb || undefined,
  };
}

export function useSponsors() {
  const { data, loading, error } = useApiData<SponsorRow[]>("/sponsors");
  const sponsors = useMemo(() => {
    // The API already orders by the admin's drag order (sort_order, name);
    // sorting by tier here is stable, so that order is kept within each tier.
    const mapped = (Array.isArray(data) ? data : [])
      .map(mapSponsor)
      .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);
    return mapped.length > 0 ? mapped : staticSponsors;
  }, [data]);
  return { sponsors, loading, error };
}
