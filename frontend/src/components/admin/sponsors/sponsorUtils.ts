// Shared tier vocabulary + sponsor shapes/helpers for the sponsors tab.

import type { SponsorTier } from "../../../types";
import type { AdminSponsor, SponsorForm, SponsorRow } from "../adminTypes";

export const TIERS: Array<{ value: SponsorTier; label: string }> = [
  { value: "platinum", label: "Platinum" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "bronze", label: "Bronze" },
];

export const EMPTY_SPONSOR: SponsorForm = {
  name: "",
  tier: "bronze",
  url: "",
  blurb: "",
  logo_url: null,
  _logoFile: null,
  _logoPreview: null,
};

export function normalizeSponsor(s: SponsorRow): AdminSponsor {
  return {
    ...s,
    url: s.url ?? "",
    blurb: s.blurb ?? "",
  };
}

type SponsorFields = Pick<AdminSponsor, "name" | "tier" | "url" | "blurb">;

export function sponsorFieldsEqual(a: SponsorFields, b: SponsorFields): boolean {
  return (
    a.name === b.name &&
    a.tier === b.tier &&
    a.url === b.url &&
    a.blurb === b.blurb
  );
}

export function tierLabel(tier: string): string {
  return TIERS.find((t) => t.value === tier)?.label ?? tier;
}

export function tierMembers(sponsors: AdminSponsor[], tier: SponsorTier): AdminSponsor[] {
  return sponsors
    .filter((s) => s.tier === tier)
    .slice()
    .sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
    );
}
