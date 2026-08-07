// The registration form's school dropdown, and the server-side allowlist it
// is validated against. Free text here would mean deduping "Baruch",
// "baruch college", and "CUNY Baruch" by hand at check-in.
//
// Scope: the 11 CUNY senior colleges only.
//
// KEEP IN SYNC with frontend/src/lib/cunySchools.ts — the frontend renders the
// dropdown from its copy and the backend rejects anything not in this one, so
// a school missing from either list cannot be registered.

export const CUNY_SCHOOLS = [
  "Baruch College",
  "Brooklyn College",
  "City College of New York",
  "College of Staten Island",
  "Hunter College",
  "John Jay College of Criminal Justice",
  "Lehman College",
  "Medgar Evers College",
  "New York City College of Technology",
  "Queens College",
  "York College",
] as const;

const SCHOOL_SET: ReadonlySet<string> = new Set(CUNY_SCHOOLS);

export function isValidCunySchool(value: string): boolean {
  return SCHOOL_SET.has(value);
}
