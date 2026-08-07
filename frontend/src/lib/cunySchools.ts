// School options for the registration form's dropdown.
//
// Scope: the 11 CUNY senior colleges only.
//
// KEEP IN SYNC with backend/src/lib/cunySchools.ts — the backend rejects any
// value not in its copy, so a school missing from either list cannot be
// registered. Duplicated rather than shared because the frontend and backend
// are separate builds with no common module path.

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
