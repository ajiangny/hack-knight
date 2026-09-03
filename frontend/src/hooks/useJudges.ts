// Fetches judges from the Express API.
// Unlike useTeam there is no static fallback — an empty or unreachable API
// simply means the section renders its "To Be Announced!" state.

import { useMemo } from "react";
import { useApiData } from "./useApiData";
import type { Judge } from "../types";

/** Raw row from the Express API (snake_case DB columns). */
interface JudgeRow {
  id: string;
  name: string;
  title: string;
  photo_url: string;
  companies?: Array<{ id: string; name: string; logo_url: string }>;
  sort_order?: number;
}

function mapJudge(j: JudgeRow): Judge {
  return {
    id: j.id,
    name: j.name,
    title: j.title,
    photo: j.photo_url,
    // Company logo badges (max 2), already ordered badge 1 → badge 2.
    companies: (j.companies ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      logo: c.logo_url,
    })),
    sortOrder: j.sort_order,
  };
}

export function useJudges() {
  const { data, loading, error } = useApiData<JudgeRow[]>("/judges");
  const judges = useMemo(
    () => (Array.isArray(data) ? data.map(mapJudge) : []),
    [data],
  );
  return { judges, loading, error };
}
