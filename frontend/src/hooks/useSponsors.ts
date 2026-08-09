// Fetches sponsors from the Express API (backed by the companies table —
// a company is a sponsor once it has a sponsor_tier).
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
interface CompanyRow {
  id: string;
  name: string;
  logo_url: string;
  sponsor_tier: SponsorTier | null;
  sponsor_url?: string | null;
  sponsor_blurb?: string | null;
}

function mapCompany(c: CompanyRow & { sponsor_tier: SponsorTier }): Sponsor {
  return {
    id: c.id,
    name: c.name,
    logo: c.logo_url,
    tier: c.sponsor_tier,
    url: c.sponsor_url || "#",
    companyBlurb: c.sponsor_blurb || undefined,
  };
}

export function useSponsors() {
  const { data, loading, error } = useApiData<CompanyRow[]>("/companies");
  const sponsors = useMemo(() => {
    const mapped = (Array.isArray(data) ? data : [])
      .filter(
        (c): c is CompanyRow & { sponsor_tier: SponsorTier } =>
          !!c.sponsor_tier,
      )
      .map(mapCompany)
      .sort(
        (a, b) =>
          TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
          a.name.localeCompare(b.name),
      );
    return mapped.length > 0 ? mapped : staticSponsors;
  }, [data]);
  return { sponsors, loading, error };
}
