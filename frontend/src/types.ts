// Shared domain types used across data, hooks, and components.
// API rows (snake_case) are mapped into these camelCase shapes by the hooks.

export type EventColor = "cyan" | "violet" | "green" | "orange";

export interface ScheduleEvent {
  /** UUID from the DB; absent on the bundled static fallback data. */
  id?: string;
  day: string;
  startHour: number;
  endHour: number;
  label: string;
  color: EventColor;
  sortOrder?: number;
}

export interface ScheduleDay {
  key: string;
  label: string;
}

export interface GalleryPhoto {
  src: string;
  alt: string;
}

export interface GalleryYear {
  year: string;
  photos: GalleryPhoto[];
}

export type SponsorTier = "platinum" | "gold" | "silver" | "bronze";

export interface Sponsor {
  id?: string;
  name: string;
  logo: string;
  tier: SponsorTier;
  url: string;
  companyBlurb?: string;
}

/** Company logo badge shown on a team member card (max 2 per member). */
export interface TeamCompany {
  id: string;
  name: string;
  logo: string;
}

export interface TeamMember {
  id?: string;
  name: string;
  title: string;
  photo: string;
  badge?: string | null;
  linkedin?: string | null;
  github?: string | null;
  companies?: TeamCompany[];
  sortOrder?: number;
}

export interface Faq {
  question: string;
  answer: string;
}

/** Key/value map from the site_settings table (Misc admin tab). */
export type SiteSettings = Record<string, string>;

/** A registration row, mapped from snake_case by useRegistrations. */
export interface Registration {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: number;
  major: string;
  school: string;
  levelOfStudy: string;
  country: string;
  mlhCodeOfConduct: boolean;
  mlhDataSharing: boolean;
  mlhEmails: boolean;
  createdAt?: string;
}

