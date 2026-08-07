// Shared tier vocabulary + sponsor shapes/helpers for the sponsors tab.

import type { SponsorTier } from "../../../types";
import type { AdminCompany, AdminSponsor, SponsorForm } from "../adminTypes";

export const TIERS: Array<{ value: SponsorTier; label: string }> = [
  { value: "platinum", label: "Platinum" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "bronze", label: "Bronze" },
];

export const EMPTY_SPONSOR: SponsorForm = {
  name: "",
  sponsor_tier: "bronze",
  sponsor_url: "",
  sponsor_blurb: "",
  logo_url: null,
  _logoFile: null,
  _logoPreview: null,
};

export function normalizeSponsor(c: AdminCompany): AdminSponsor {
  return {
    ...c,
    sponsor_tier: c.sponsor_tier ?? "",
    sponsor_url: c.sponsor_url ?? "",
    sponsor_blurb: c.sponsor_blurb ?? "",
  };
}

type SponsorFields = Pick<AdminSponsor, "name" | "sponsor_tier" | "sponsor_url" | "sponsor_blurb">;

export function sponsorFieldsEqual(a: SponsorFields, b: SponsorFields): boolean {
  return (
    a.name === b.name &&
    a.sponsor_tier === b.sponsor_tier &&
    a.sponsor_url === b.sponsor_url &&
    a.sponsor_blurb === b.sponsor_blurb
  );
}

export function tierLabel(tier: string): string {
  return TIERS.find((t) => t.value === tier)?.label ?? tier;
}

export function tierMembers(companies: AdminSponsor[], tier: SponsorTier): AdminSponsor[] {
  return companies
    .filter((c) => c.sponsor_tier === tier)
    .slice()
    .sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
    );
}
