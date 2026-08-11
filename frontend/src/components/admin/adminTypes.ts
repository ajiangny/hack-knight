// Draft shapes for the admin tabs. Server rows (snake_case) are augmented
// with staging fields (prefixed `_`) that only ever live in client state:
// `_new` marks a staged add (its id is a "tmp-*" placeholder), `_*File` /
// `_*Preview` hold a locally selected image and its object-URL preview.

import type { EventColor, ScheduleEvent, SponsorTier } from "../../types";

/* ── Schedule ── */

/** Event row in the schedule editor draft (real uuid or "tmp-N" id). */
export interface AdminEvent extends ScheduleEvent {
  id: string;
  _new?: boolean;
}

/** Modal form seed — no id until the event is staged. */
export type EventForm = Omit<AdminEvent, "id"> & { id?: string };

/** Raw row from the Express API. */
export interface ScheduleEventRow {
  id: string;
  day: string;
  start_hour: number | string;
  end_hour: number | string;
  label: string;
  color: EventColor | null;
  sort_order?: number;
}

/* ── Gallery ── */

export interface AdminPhoto {
  id: string;
  src: string;
  alt: string;
  sort_order?: number;
  _new?: boolean;
  _file?: File;
  _replaceFile?: File;
  _replacePreview?: string;
}

export interface AdminYear {
  id: string;
  year: string;
  photos: AdminPhoto[];
  _new?: boolean;
}

/* ── Companies (team badges) ── */

export interface AdminCompany {
  id: string;
  name: string;
  logo_url: string | null;
  sort_order?: number;
  _new?: boolean;
  _logoFile?: File | null;
  _logoPreview?: string | null;
}

/* ── Sponsors (own table, separate from badge companies) ── */

/** Raw sponsor row from the Express API. */
export interface SponsorRow {
  id: string;
  name: string;
  logo_url: string;
  tier: SponsorTier;
  url?: string | null;
  blurb?: string | null;
  sort_order?: number;
}

/** Sponsor normalized for the sponsors tab — nullable fields become "". */
export interface AdminSponsor {
  id: string;
  name: string;
  logo_url: string | null;
  tier: SponsorTier;
  url: string;
  blurb: string;
  sort_order?: number;
  _new?: boolean;
  _logoFile?: File | null;
  _logoPreview?: string | null;
}

/** Modal form seed — no id until the sponsor is staged. */
export type SponsorForm = Omit<AdminSponsor, "id"> & { id?: string };

/* ── Team members ── */

export interface AdminMember {
  id: string;
  name: string;
  title: string;
  linkedin_url: string;
  github_url: string;
  company1_id: string;
  company2_id: string;
  photo_url: string | null;
  badge_url: string | null;
  sort_order?: number;
  _new?: boolean;
  _photoFile?: File | null;
  _photoPreview?: string | null;
  _badgeFile?: File | null;
  _badgePreview?: string | null;
}

/** Modal form seed — no id until the member is staged. */
export type MemberForm = Omit<AdminMember, "id"> & { id?: string };

/** Raw member row from the Express API (nullable optional fields). */
export type RawMember = Omit<
  AdminMember,
  "linkedin_url" | "github_url" | "company1_id" | "company2_id"
> & {
  linkedin_url?: string | null;
  github_url?: string | null;
  company1_id?: string | null;
  company2_id?: string | null;
};
