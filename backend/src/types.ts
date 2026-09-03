export interface ScheduleEvent {
  id: string;
  day: "fri" | "sat" | "sun";
  start_hour: number;
  end_hour: number;
  label: string;
  color: string;
  sort_order: number;
  created_at?: string;
}

export interface CreateScheduleEventBody {
  day: "fri" | "sat" | "sun";
  start_hour: number;
  end_hour: number;
  label: string;
  color?: string;
  sort_order?: number;
}

export type UpdateScheduleEventBody = Partial<CreateScheduleEventBody>;

export interface ScheduleDay {
  key: string;
  label: string;
  sort_order: number;
}

export interface UpdateScheduleDayBody {
  label: string;
}

export interface GalleryYear {
  id: string;
  year: string;
  sort_order: number;
  created_at?: string;
}

export interface GalleryPhoto {
  id: string;
  year_id: string;
  src: string;
  alt: string;
  sort_order: number;
  created_at?: string;
}

export interface GalleryYearWithPhotos extends GalleryYear {
  photos: GalleryPhoto[];
}

export type SponsorTier = "platinum" | "gold" | "silver" | "bronze";

// Sponsors are their own table, separate from the badge companies below.
export interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  tier: SponsorTier;
  url: string | null;
  blurb: string | null;
  sort_order: number;
  created_at?: string;
}

// Badge companies — logos worn by team members (max 2 each).
export interface Company {
  id: string;
  name: string;
  logo_url: string;
  sort_order: number;
  created_at?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  photo_url: string;
  badge_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  company1_id: string | null;
  company2_id: string | null;
  sort_order: number;
  created_at?: string;
}

// GET /api/team embeds the resolved company rows (order: company1, company2).
export interface TeamMemberWithCompanies extends TeamMember {
  companies: Company[];
}

export interface CreateTeamMemberBody {
  name: string;
  title: string;
  linkedin_url?: string;
  github_url?: string;
  company1_id?: string;
  company2_id?: string;
  sort_order?: number;
}

export type UpdateTeamMemberBody = Partial<CreateTeamMemberBody>;

// Judges — like team members but no character badge or social links.
export interface Judge {
  id: string;
  name: string;
  title: string;
  photo_url: string;
  company1_id: string | null;
  company2_id: string | null;
  sort_order: number;
  created_at?: string;
}

// GET /api/judges embeds the resolved company rows (order: company1, company2).
export interface JudgeWithCompanies extends Judge {
  companies: Company[];
}

export interface CreateJudgeBody {
  name: string;
  title: string;
  company1_id?: string;
  company2_id?: string;
  sort_order?: number;
}

export type UpdateJudgeBody = Partial<CreateJudgeBody>;

// PUT /api/team/reorder, PUT /api/gallery/photos/reorder,
// PUT /api/companies/reorder, PUT /api/sponsors/reorder,
// PUT /api/judges/reorder
export interface ReorderBody {
  order: { id: string; sort_order: number }[];
}

export interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  age: number;
  school: string;
  level_of_study: string;
  country: string;
  // Demographic answers hold the list option verbatim, except where the
  // participant chose a "self-describe"/"other" option — then the column
  // holds their typed text instead.
  gender: string;
  // Null when the participant skipped the question (pronouns are optional).
  pronouns: string | null;
  race_ethnicity: string[];
  sexual_orientation: string;
  major: string;
  dietary_restrictions: string[];
  // Normalized to an https:// URL; null when not provided (optional).
  linkedin_url: string | null;
  mlh_code_of_conduct: boolean;
  mlh_data_sharing: boolean;
  mlh_emails: boolean;
  // Google Drive link to the resume, normalized to https://. Required by the
  // API on every new registration.
  resume_url: string | null;
  created_at?: string;
}

// POST /api/registrations body (JSON). The route validates every field.
export interface CreateRegistrationBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  age?: number;
  school?: string;
  levelOfStudy?: string;
  country?: string;
  // The *Other fields carry the free text for the corresponding
  // "self-describe"/"other" option and are read only when it is chosen.
  gender?: string;
  genderSelfDescribe?: string;
  pronouns?: string;
  pronounsOther?: string;
  raceEthnicity?: string[];
  raceEthnicityOther?: string;
  sexualOrientation?: string;
  sexualOrientationOther?: string;
  major?: string;
  majorOther?: string;
  dietaryRestrictions?: string[];
  linkedinUrl?: string;
  // Google Drive link to the resume; required.
  resumeUrl?: string;
  // MLH member-event checkboxes: the first two must be true to register,
  // mlhEmails is the optional opt-in.
  mlhCodeOfConduct?: boolean;
  mlhDataSharing?: boolean;
  mlhEmails?: boolean;
  turnstileToken?: string;
  website?: string; // honeypot
}

export interface SiteSetting {
  key: string;
  value: string;
  updated_at?: string;
}

export interface UpdateSiteSettingBody {
  value: string;
}
