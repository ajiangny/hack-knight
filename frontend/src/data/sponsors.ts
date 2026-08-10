import type { Sponsor } from "../types";
import placeholder from '../assets/logos/placeholder.png';

// Placeholder sponsors shown until real ones are added in the admin dashboard.
// Names, logos and links are intentionally blank — no real company is implied.
// When real logos arrive, add individual imports here:
// import bloomberg from '../assets/logos/bloomberg.png';
// import mlh       from '../assets/logos/mlh.png';
// etc.

const blurbPlaceholder = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."

export const sponsors: Sponsor[] = [
  { name: "Company", logo: placeholder, tier: "platinum", url: "#", companyBlurb: blurbPlaceholder },
  { name: "Company", logo: placeholder, tier: "gold",     url: "#", companyBlurb: blurbPlaceholder },
  { name: "Company", logo: placeholder, tier: "silver",   url: "#", companyBlurb: blurbPlaceholder },
  { name: "Company", logo: placeholder, tier: "silver",   url: "#", companyBlurb: blurbPlaceholder },
  { name: "Company", logo: placeholder, tier: "bronze",   url: "#" },
  { name: "Company", logo: placeholder, tier: "bronze",   url: "#" },
  { name: "Company", logo: placeholder, tier: "bronze",   url: "#" },
];
