// Fetches team members from the Express API.
// Falls back to the bundled static data if the API is unreachable.
// Cached across navigations by useApiData, so revisiting the page renders
// the fetched members immediately instead of re-requesting them.

import { useMemo } from "react";
import { useApiData } from "./useApiData";
import { teamMembers as staticTeam } from "../data/team";
import type { TeamMember } from "../types";

/** Raw row from the Express API (snake_case DB columns). */
interface TeamMemberRow {
  id: string;
  name: string;
  title: string;
  photo_url: string;
  badge_url: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  companies?: Array<{ id: string; name: string; logo_url: string }>;
  sort_order?: number;
}

// Backend rows are snake_case; the components expect photo / badge.
function mapMember(m: TeamMemberRow): TeamMember {
  return {
    id: m.id,
    name: m.name,
    title: m.title,
    photo: m.photo_url,
    badge: m.badge_url,
    linkedin: m.linkedin_url || null,
    github: m.github_url || null,
    // Company logo badges (max 2), already ordered badge 1 → badge 2.
    companies: (m.companies ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      logo: c.logo_url,
    })),
    sortOrder: m.sort_order,
  };
}

export function useTeam() {
  const { data, loading, error } = useApiData<TeamMemberRow[]>("/team");
  const teamMembers = useMemo(
    () =>
      Array.isArray(data) && data.length > 0
        ? data.map(mapMember)
        : staticTeam,
    [data],
  );
  return { teamMembers, loading, error };
}
