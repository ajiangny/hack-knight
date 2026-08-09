// Dropdown options for the public registration form, and the allowlists the
// API validates against — a value missing here cannot be registered.
//
// KEEP IN SYNC with frontend/src/lib/registrationOptions.ts — the frontend
// renders its dropdowns from a mirrored copy. Duplicated rather than shared
// because the frontend and backend are separate builds with no common module
// path (same arrangement as the school lists had).

// MLH's standard Level of Study options — registrations are shared with MLH,
// so the values match their forms verbatim rather than a local paraphrase.
export const LEVELS_OF_STUDY = [
  "Less than Secondary / High School",
  "Secondary / High School",
  "Undergraduate University (2 year - community college or similar)",
  "Undergraduate University (3+ year)",
  "Graduate University (Masters, Professional, Doctoral, etc)",
  "Code School / Bootcamp",
  "Other Vocational / Trade Program or Apprenticeship",
  "Post Doctorate",
  "Other",
  "I'm not currently a student",
  "Prefer not to answer",
] as const;

// Country of Residence options: ISO 3166-1 English short names, the standard
// MLH recommends (iso.org/iso-3166-country-codes.html). Generated from the
// official 249-entry list — regenerate rather than hand-editing.
export const COUNTRIES = [
  "Afghanistan",
  "Åland Islands",
  "Albania",
  "Algeria",
  "American Samoa",
  "Andorra",
  "Angola",
  "Anguilla",
  "Antarctica",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Aruba",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bermuda",
  "Bhutan",
  "Bolivia, Plurinational State of",
  "Bonaire, Sint Eustatius and Saba",
  "Bosnia and Herzegovina",
  "Botswana",
  "Bouvet Island",
  "Brazil",
  "British Indian Ocean Territory",
  "Brunei Darussalam",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cayman Islands",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Christmas Island",
  "Cocos (Keeling) Islands",
  "Colombia",
  "Comoros",
  "Congo",
  "Congo, Democratic Republic of the",
  "Cook Islands",
  "Costa Rica",
  "Côte d'Ivoire",
  "Croatia",
  "Cuba",
  "Curaçao",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Falkland Islands (Malvinas)",
  "Faroe Islands",
  "Fiji",
  "Finland",
  "France",
  "French Guiana",
  "French Polynesia",
  "French Southern Territories",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Gibraltar",
  "Greece",
  "Greenland",
  "Grenada",
  "Guadeloupe",
  "Guam",
  "Guatemala",
  "Guernsey",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Heard Island and McDonald Islands",
  "Holy See",
  "Honduras",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran, Islamic Republic of",
  "Iraq",
  "Ireland",
  "Isle of Man",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jersey",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Korea, Democratic People's Republic of",
  "Korea, Republic of",
  "Kuwait",
  "Kyrgyzstan",
  "Lao People's Democratic Republic",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Macao",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Martinique",
  "Mauritania",
  "Mauritius",
  "Mayotte",
  "Mexico",
  "Micronesia, Federated States of",
  "Moldova, Republic of",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Montserrat",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands, Kingdom of the",
  "New Caledonia",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Niue",
  "Norfolk Island",
  "North Macedonia",
  "Northern Mariana Islands",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine, State of",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Pitcairn",
  "Poland",
  "Portugal",
  "Puerto Rico",
  "Qatar",
  "Réunion",
  "Romania",
  "Russian Federation",
  "Rwanda",
  "Saint Barthélemy",
  "Saint Helena, Ascension and Tristan da Cunha",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Martin (French part)",
  "Saint Pierre and Miquelon",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Sint Maarten (Dutch part)",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Georgia and the South Sandwich Islands",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Svalbard and Jan Mayen",
  "Sweden",
  "Switzerland",
  "Syrian Arab Republic",
  "Taiwan, Province of China",
  "Tajikistan",
  "Tanzania, United Republic of",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tokelau",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Türkiye",
  "Turkmenistan",
  "Turks and Caicos Islands",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom of Great Britain and Northern Ireland",
  "United States Minor Outlying Islands",
  "United States of America",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Venezuela, Bolivarian Republic of",
  "Viet Nam",
  "Virgin Islands (British)",
  "Virgin Islands (U.S.)",
  "Wallis and Futuna",
  "Western Sahara",
  "Yemen",
  "Zambia",
  "Zimbabwe",
] as const;

// MLH requires collecting age; 13 is their minimum age to participate.
export const AGE_MIN = 13;
export const AGE_MAX = 100;

/* ── Participant demographics and profile ───────────────────────
   MLH's standard demographic questions plus event logistics. Options match
   the wording the organizers were given verbatim. Where a question offers a
   "self-describe"/"other" option (the *_OTHER_OPTION constants below), the
   form reveals a free-text input and the API stores the typed text in place
   of the placeholder option. */

// Multi-select: a participant can be, say, both Vegetarian and Halal.
// Selecting nothing is the "no restrictions" answer, so there is no
// explicit "None" option.
export const DIETARY_RESTRICTIONS = [
  "Vegetarian",
  "Vegan",
  "Celiac Disease",
  "Allergies",
  "Kosher",
  "Halal",
] as const;

export const GENDERS = [
  "Man",
  "Woman",
  "Non-Binary",
  "Prefer to self-describe",
  "Prefer Not to Answer",
] as const;

export const GENDER_SELF_DESCRIBE_OPTION = "Prefer to self-describe";

// Pronouns are always optional — the form accepts no answer at all.
export const PRONOUNS = [
  "She/Her",
  "He/Him",
  "They/Them",
  "She/They",
  "He/They",
  "Prefer Not to Answer",
  "Other",
] as const;

export const PRONOUNS_OTHER_OPTION = "Other";

// Multi-select ("select all that apply"), per MLH's registration form.
export const RACES_ETHNICITIES = [
  "Asian Indian",
  "Black or African",
  "Chinese",
  "Filipino",
  "Guamanian or Chamorro",
  "Hispanic / Latino / Spanish Origin",
  "Japanese",
  "Korean",
  "Middle Eastern",
  "Native American or Alaskan Native",
  "Native Hawaiian",
  "Samoan",
  "Vietnamese",
  "White",
  "Other Asian (Thai, Cambodian, etc)",
  "Other Pacific Islander",
  "Other (Please Specify)",
  "Prefer Not to Answer",
] as const;

export const RACE_ETHNICITY_OTHER_OPTION = "Other (Please Specify)";

// Asked as "Do you consider yourself to be any of the following?"
export const SEXUAL_ORIENTATIONS = [
  "Heterosexual or straight",
  "Gay or lesbian",
  "Bisexual",
  "Different identity",
  "Prefer Not to Answer",
] as const;

export const SEXUAL_ORIENTATION_OTHER_OPTION = "Different identity";

export const MAJORS = [
  "Computer science, computer engineering, or software engineering",
  "Another engineering discipline (such as civil, electrical, mechanical, etc.)",
  "Information systems, information technology, or system administration",
  "A natural science (such as biology, chemistry, physics, etc.)",
  "Mathematics or statistics",
  "Web development or web design",
  "Business discipline (such as accounting, finance, marketing, etc.)",
  "Humanities discipline (such as literature, history, philosophy, etc.)",
  "Social science (such as anthropology, psychology, political science, etc.)",
  "Fine arts or performing arts (such as graphic design, music, studio art, etc.)",
  "Health science (such as nursing, pharmacy, radiology, etc.)",
  "Other (please specify)",
  "Undecided / No Declared Major",
  "My school does not offer majors / primary areas of study",
  "Prefer not to answer",
] as const;

export const MAJOR_OTHER_OPTION = "Other (please specify)";

const LEVEL_SET: ReadonlySet<string> = new Set(LEVELS_OF_STUDY);
const COUNTRY_SET: ReadonlySet<string> = new Set(COUNTRIES);
const DIETARY_SET: ReadonlySet<string> = new Set(DIETARY_RESTRICTIONS);
const GENDER_SET: ReadonlySet<string> = new Set(GENDERS);
const PRONOUN_SET: ReadonlySet<string> = new Set(PRONOUNS);
const RACE_SET: ReadonlySet<string> = new Set(RACES_ETHNICITIES);
const ORIENTATION_SET: ReadonlySet<string> = new Set(SEXUAL_ORIENTATIONS);
const MAJOR_SET: ReadonlySet<string> = new Set(MAJORS);

export function isValidLevelOfStudy(value: string): boolean {
  return LEVEL_SET.has(value);
}

export function isValidCountry(value: string): boolean {
  return COUNTRY_SET.has(value);
}

export function isValidDietaryRestriction(value: string): boolean {
  return DIETARY_SET.has(value);
}

export function isValidGender(value: string): boolean {
  return GENDER_SET.has(value);
}

export function isValidPronouns(value: string): boolean {
  return PRONOUN_SET.has(value);
}

export function isValidRaceEthnicity(value: string): boolean {
  return RACE_SET.has(value);
}

export function isValidSexualOrientation(value: string): boolean {
  return ORIENTATION_SET.has(value);
}

export function isValidMajor(value: string): boolean {
  return MAJOR_SET.has(value);
}
