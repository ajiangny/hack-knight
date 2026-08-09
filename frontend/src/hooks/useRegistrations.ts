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
  phone: string;
  age: number;
  school: string;
  level_of_study: string;
  country: string;
  gender: string;
  pronouns: string | null;
  race_ethnicity: string[];
  sexual_orientation: string;
  major: string;
  dietary_restrictions: string[];
  linkedin_url: string | null;
  mlh_code_of_conduct: boolean;
  mlh_data_sharing: boolean;
  mlh_emails: boolean;
  resume_path: string | null;
  created_at?: string;
}

function mapRegistration(r: RegistrationRow): Registration {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    age: r.age,
    school: r.school,
    levelOfStudy: r.level_of_study,
    country: r.country,
    gender: r.gender,
    pronouns: r.pronouns,
    // ?? [] covers rows written before the demographics migration.
    raceEthnicity: r.race_ethnicity ?? [],
    sexualOrientation: r.sexual_orientation,
    major: r.major,
    dietaryRestrictions: r.dietary_restrictions ?? [],
    linkedinUrl: r.linkedin_url,
    mlhCodeOfConduct: r.mlh_code_of_conduct,
    mlhDataSharing: r.mlh_data_sharing,
    mlhEmails: r.mlh_emails,
    resumePath: r.resume_path,
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
