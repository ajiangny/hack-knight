// Fetches registrations for the admin dashboard. No static fallback, unlike
// the public hooks: there is no sensible offline stand-in for participant
// data, and inventing one would be misleading.

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import type { Registration } from "../types";

/** Raw row from the Express API (snake_case DB columns). */
interface RegistrationRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  major: string;
  cuny_school: string;
  created_at?: string;
}

function mapRegistration(r: RegistrationRow): Registration {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    major: r.major,
    cunySchool: r.cuny_school,
    createdAt: r.created_at,
  };
}

export function useRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiGet<RegistrationRow[]>("/registrations");
      setRegistrations(rows.map(mapRegistration));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { registrations, loading, error, refetch };
}
