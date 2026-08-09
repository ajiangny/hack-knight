// Public registration form. Gated on the registration_open site setting: when
// it is off this renders the existing coming-soon page, which is why that
// component stayed put rather than being replaced.
//
// Fields follow MLH's member-event requirements (first/last name, email,
// phone, age, school, level of study, country of residence, plus the three
// MLH agreement checkboxes):
// https://guide.mlh.com/general-information/managing-registrations/registrations
// plus MLH's standard demographic questions (gender, pronouns,
// race/ethnicity, sexual orientation, major), dietary restrictions for
// catering, and an optional LinkedIn URL for post-event partner connections.
// A Google Drive link to the applicant's resume is also required; the CSV
// export handed to MLH then links straight to every file.
//
// Client-side validation here mirrors the server's rules for fast feedback
// only — POST /api/registrations is the authority and re-checks everything.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "../hooks/useSiteSettings";
import {
  AGE_MAX,
  AGE_MIN,
  COUNTRIES,
  DIETARY_RESTRICTIONS,
  GENDERS,
  GENDER_SELF_DESCRIBE_OPTION,
  LEVELS_OF_STUDY,
  MAJORS,
  MAJOR_OTHER_OPTION,
  PRONOUNS,
  PRONOUNS_OTHER_OPTION,
  RACES_ETHNICITIES,
  RACE_ETHNICITY_OTHER_OPTION,
  SEXUAL_ORIENTATIONS,
  SEXUAL_ORIENTATION_OTHER_OPTION,
} from "../lib/registrationOptions";
import {
  MLH_CODE_OF_CONDUCT_URL,
  MLH_CONTEST_TERMS_URL,
  MLH_DEV_URL,
  MLH_PRIVACY_POLICY_URL,
} from "../lib/mlh";
import { formatUsPhone } from "../lib/phone";
import ComingSoon from "../components/site/ComingSoon";
import SchoolCombobox from "../components/site/SchoolCombobox";
import SelectDropdown from "../components/site/SelectDropdown";
import TurnstileWidget from "../components/site/TurnstileWidget";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

const MAX_FIELD_LENGTH = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mirrors the server: loose shape check plus a 7–15 digit count (E.164 bound).
const PHONE_RE = /^\+?[\d\s().-]+$/;

const AGES = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) =>
  String(AGE_MIN + i),
);

// Mirrors the server: the resume must be a Google Drive (or Docs) link.
// Whether sharing is actually set to "anyone with the link" cannot be
// checked from the browser; the help text carries that instruction.
const MAX_RESUME_URL_LENGTH = 300;

function isDriveUrl(raw: string): boolean {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const host = new URL(withScheme).hostname.toLowerCase();
    return host === "drive.google.com" || host === "docs.google.com";
  } catch {
    return false;
  }
}

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: string; // select value; sent as a number
  school: string; // always an MLH-list entry or "", enforced by SchoolCombobox
  levelOfStudy: string;
  major: string;
  country: string;
  // Demographic selects; each *Other field is the free text shown when the
  // matching "self-describe"/"other" option is chosen. Pronouns are the one
  // question that may be skipped entirely.
  gender: string;
  genderSelfDescribe: string;
  pronouns: string;
  pronounsOther: string;
  sexualOrientation: string;
  sexualOrientationOther: string;
  majorOther: string;
  raceEthnicityOther: string;
  resumeUrl: string; // Google Drive link, required
  linkedinUrl: string; // optional
  website: string; // honeypot
}

const EMPTY: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  age: "",
  school: "",
  levelOfStudy: "",
  major: "",
  country: "United States of America", // ISO 3166-1 short name
  gender: "",
  genderSelfDescribe: "",
  pronouns: "",
  pronounsOther: "",
  sexualOrientation: "",
  sexualOrientationOther: "",
  majorOther: "",
  raceEthnicityOther: "",
  resumeUrl: "",
  linkedinUrl: "",
  website: "",
};

// The three MLH checkboxes: the first two are required to register, the
// email opt-in is genuinely optional.
interface Agreements {
  codeOfConduct: boolean;
  dataSharing: boolean;
  emails: boolean;
}

const NO_AGREEMENTS: Agreements = {
  codeOfConduct: false,
  dataSharing: false,
  emails: false,
};

type ErrorKey =
  | keyof FormValues
  | "raceEthnicity"
  | "codeOfConduct"
  | "dataSharing";
type FieldErrors = Partial<Record<ErrorKey, string>>;

// Mirrors the server: LinkedIn is optional, but when given it must be a
// linkedin.com URL (scheme optional — the server normalizes to https://).
const MAX_LINKEDIN_LENGTH = 200;

function isLinkedinUrl(raw: string): boolean {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const host = new URL(withScheme).hostname.toLowerCase();
    return host === "linkedin.com" || host.endsWith(".linkedin.com");
  } catch {
    return false;
  }
}

// Every visible field is required; the marker is decorative for screen
// readers because each field already reports its own "required" error.
function RequiredMark() {
  return (
    <span className="text-ultraviolet" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

// The free-text input revealed when a demographic question's
// "self-describe"/"other" option is selected, with its own error line.
function OtherInput({
  id,
  placeholder,
  value,
  onChange,
  disabled,
  error,
}: {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
}) {
  return (
    <>
      <input
        id={id}
        className="register-input mt-2"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={MAX_FIELD_LENGTH}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p className="register-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </>
  );
}

function validate(
  values: FormValues,
  raceEthnicity: string[],
  agreements: Agreements,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.firstName.trim()) errors.firstName = "First name is required";
  else if (values.firstName.trim().length > MAX_FIELD_LENGTH)
    errors.firstName = `Must be ${MAX_FIELD_LENGTH} characters or fewer`;

  if (!values.lastName.trim()) errors.lastName = "Last name is required";
  else if (values.lastName.trim().length > MAX_FIELD_LENGTH)
    errors.lastName = `Must be ${MAX_FIELD_LENGTH} characters or fewer`;

  if (!values.email.trim()) errors.email = "Email is required";
  else if (!EMAIL_RE.test(values.email.trim()))
    errors.email = "Enter a valid email address";

  const phone = values.phone.trim();
  const phoneDigits = phone.replace(/\D/g, "");
  if (!phone) errors.phone = "Phone number is required";
  else if (
    !PHONE_RE.test(phone) ||
    phoneDigits.length < 7 ||
    phoneDigits.length > 15
  )
    errors.phone = "Enter a valid phone number";

  if (!values.age) errors.age = "Select your age";

  if (!values.school) errors.school = "Select your school from the list";

  if (!values.levelOfStudy) errors.levelOfStudy = "Select your level of study";

  if (!values.major) errors.major = "Select your major or field of study";
  else if (values.major === MAJOR_OTHER_OPTION && !values.majorOther.trim())
    errors.majorOther = "Please specify your major";

  if (!values.country) errors.country = "Select your country of residence";

  if (!values.gender) errors.gender = "Select your gender";
  else if (
    values.gender === GENDER_SELF_DESCRIBE_OPTION &&
    !values.genderSelfDescribe.trim()
  )
    errors.genderSelfDescribe = "Please describe your gender";

  // Pronouns are optional; only the free text behind "Other" is checked.
  if (values.pronouns === PRONOUNS_OTHER_OPTION && !values.pronounsOther.trim())
    errors.pronounsOther = "Enter your pronouns";

  if (raceEthnicity.length === 0)
    errors.raceEthnicity = "Select at least one option";
  else if (
    raceEthnicity.includes(RACE_ETHNICITY_OTHER_OPTION) &&
    !values.raceEthnicityOther.trim()
  )
    errors.raceEthnicityOther = "Please specify your race/ethnicity";

  if (!values.sexualOrientation)
    errors.sexualOrientation = "Select an option";
  else if (
    values.sexualOrientation === SEXUAL_ORIENTATION_OTHER_OPTION &&
    !values.sexualOrientationOther.trim()
  )
    errors.sexualOrientationOther = "Please specify your identity";

  const linkedin = values.linkedinUrl.trim();
  if (linkedin && !isLinkedinUrl(linkedin))
    errors.linkedinUrl = "Enter a valid LinkedIn URL (e.g. linkedin.com/in/you)";

  const resumeLink = values.resumeUrl.trim();
  if (!resumeLink)
    errors.resumeUrl = "Share a Google Drive link to your resume";
  else if (!isDriveUrl(resumeLink))
    errors.resumeUrl = "Enter a Google Drive link (drive.google.com)";

  if (!agreements.codeOfConduct)
    errors.codeOfConduct = "Required to participate";
  if (!agreements.dataSharing) errors.dataSharing = "Required to participate";

  return errors;
}

export default function RegisterPage() {
  const { settings, loading } = useSiteSettings();
  const [values, setValues] = useState<FormValues>(EMPTY);
  // Multi-select answers live outside FormValues (string[] vs string).
  const [raceEthnicity, setRaceEthnicity] = useState<string[]>([]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [agreements, setAgreements] = useState<Agreements>(NO_AGREEMENTS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">(
    "idle",
  );
  const [formError, setFormError] = useState<string | null>(null);

  // The submit button sits at the bottom of a tall form. When the short
  // success card replaces it, the browser keeps the old scroll offset, which
  // now points past the end of the content and shows only the footer.
  useEffect(() => {
    if (status === "success") window.scrollTo(0, 0);
  }, [status]);

  function setField(field: keyof FormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    // Clear a field's error as soon as the user edits it; re-validated on submit.
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  }

  function toggle(list: string[], option: string): string[] {
    return list.includes(option)
      ? list.filter((o) => o !== option)
      : [...list, option];
  }

  function toggleRaceEthnicity(option: string) {
    setRaceEthnicity((list) => toggle(list, option));
    setErrors((e) =>
      e.raceEthnicity ? { ...e, raceEthnicity: undefined } : e,
    );
  }

  function setAgreement(field: keyof Agreements, checked: boolean) {
    setAgreements((a) => ({ ...a, [field]: checked }));
    setErrors((e) =>
      field !== "emails" && e[field] ? { ...e, [field]: undefined } : e,
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const found = validate(values, raceEthnicity, agreements);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setStatus("submitting");
    try {
      // Plain JSON. The *Other free-text fields are sent always but only
      // read when the matching "self-describe"/"other" option is chosen.
      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        age: Number(values.age),
        school: values.school,
        levelOfStudy: values.levelOfStudy,
        country: values.country,
        gender: values.gender,
        genderSelfDescribe: values.genderSelfDescribe.trim(),
        pronouns: values.pronouns,
        pronounsOther: values.pronounsOther.trim(),
        raceEthnicity,
        raceEthnicityOther: values.raceEthnicityOther.trim(),
        sexualOrientation: values.sexualOrientation,
        sexualOrientationOther: values.sexualOrientationOther.trim(),
        major: values.major,
        majorOther: values.majorOther.trim(),
        dietaryRestrictions: dietary,
        resumeUrl: values.resumeUrl.trim(),
        linkedinUrl: values.linkedinUrl.trim(),
        mlhCodeOfConduct: agreements.codeOfConduct,
        mlhDataSharing: agreements.dataSharing,
        mlhEmails: agreements.emails,
        website: values.website,
        turnstileToken: turnstileToken ?? "",
      };

      const res = await fetch(`${API_URL}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        setStatus("idle");
        setErrors({ email: "This email is already registered" });
        setFormError("This email is already registered.");
        return;
      }

      if (!res.ok) {
        const data: { message?: string } = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Something went wrong. Please try again.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("idle");
      setFormError((err as Error).message);
    }
  }

  // Render nothing until the setting is known — flashing the form and then
  // swapping it for the closed page (or vice versa) is worse than a beat of
  // blankness.
  if (loading) return null;

  // The server rejects submissions when this is off too; this is just the UI.
  if (settings.registration_open !== "true") return <ComingSoon />;

  const submitting = status === "submitting";

  return (
    <section
      className="section-wrapper"
      style={{ minHeight: "calc(100vh - 4rem)" }}
    >
      <div className="mb-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-mono uppercase text-sm text-text-secondary hover:text-ultraviolet hover:-translate-x-1 transition-all duration-300"
        >
          <span>&larr;</span> Back to Home
        </Link>
      </div>

      <h1 className="section-title text-center">
        Register for <span className="text-ultraviolet">HackKnight</span>
      </h1>

      {status === "success" ? (
        // Replaces the form rather than clearing it: a double submit becomes
        // impossible and the user gets unambiguous closure.
        <div
          className="bg-surface border border-ultraviolet/40 rounded-card shadow-card p-8 max-w-xl mx-auto text-center"
          role="status"
        >
          <h2 className="font-display font-bold text-2xl text-text-primary mb-3">
            You&rsquo;re registered
          </h2>
          <p className="font-body text-text-secondary mb-6">
            We&rsquo;ve saved your spot under{" "}
            <span className="text-text-primary">{values.email.trim()}</span>.
            Watch that inbox for check-in details closer to the event.
          </p>
          <Link to="/" className="btn-outline inline-block">
            Back to Home
          </Link>
        </div>
      ) : (
        <>
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-10 bg-surface border border-border rounded-card shadow-card
                       p-6 sm:p-8 max-w-xl mx-auto relative"
          >
            {/* Honeypot — off-screen, unreachable by keyboard, ignored by
                screen readers. Any value means a bot filled it. */}
            <input
              type="text"
              name="website"
              className="register-honeypot"
              value={values.website}
              onChange={(e) => setField("website", e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="register-label" htmlFor="firstName">
                  First Name
                  <RequiredMark />
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  className="register-input"
                  value={values.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  maxLength={MAX_FIELD_LENGTH}
                  autoComplete="given-name"
                  disabled={submitting}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? "firstName-error" : undefined}
                />
                {errors.firstName && (
                  <p className="register-error" id="firstName-error">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="register-label" htmlFor="lastName">
                  Last Name
                  <RequiredMark />
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  className="register-input"
                  value={values.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                  maxLength={MAX_FIELD_LENGTH}
                  autoComplete="family-name"
                  disabled={submitting}
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? "lastName-error" : undefined}
                />
                {errors.lastName && (
                  <p className="register-error" id="lastName-error">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label className="register-label" htmlFor="email">
                Email
                <RequiredMark />
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="register-input"
                value={values.email}
                onChange={(e) => setField("email", e.target.value)}
                maxLength={254}
                autoComplete="email"
                disabled={submitting}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p className="register-error" id="email-error">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-5 mt-5">
              <div>
                <label className="register-label" htmlFor="phone">
                  Phone Number
                  <RequiredMark />
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="register-input"
                  value={values.phone}
                  onChange={(e) => setField("phone", formatUsPhone(e.target.value))}
                  maxLength={20}
                  placeholder="+1 (212) 555-0100"
                  autoComplete="tel"
                  disabled={submitting}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                />
                {errors.phone && (
                  <p className="register-error" id="phone-error">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="register-label" htmlFor="age">
                  Age
                  <RequiredMark />
                </label>
                <SelectDropdown
                  id="age"
                  options={AGES}
                  placeholder="Select your age…"
                  value={values.age}
                  onChange={(age) => setField("age", age)}
                  disabled={submitting}
                  invalid={!!errors.age}
                  describedBy={errors.age ? "age-error" : undefined}
                />
                {errors.age && (
                  <p className="register-error" id="age-error">
                    {errors.age}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label className="register-label" htmlFor="school">
                School
                <RequiredMark />
              </label>
              <SchoolCombobox
                id="school"
                value={values.school}
                onChange={(school) => setField("school", school)}
                disabled={submitting}
                invalid={!!errors.school}
                describedBy={errors.school ? "school-error" : undefined}
              />
              {errors.school && (
                <p className="register-error" id="school-error">
                  {errors.school}
                </p>
              )}
            </div>

            <div className="mt-5">
              <label className="register-label" htmlFor="levelOfStudy">
                Level of Study
                <RequiredMark />
              </label>
              <SelectDropdown
                id="levelOfStudy"
                options={LEVELS_OF_STUDY}
                placeholder="Select your level of study…"
                value={values.levelOfStudy}
                onChange={(level) => setField("levelOfStudy", level)}
                disabled={submitting}
                invalid={!!errors.levelOfStudy}
                describedBy={
                  errors.levelOfStudy ? "levelOfStudy-error" : undefined
                }
              />
              {errors.levelOfStudy && (
                <p className="register-error" id="levelOfStudy-error">
                  {errors.levelOfStudy}
                </p>
              )}
            </div>

            <div className="mt-5">
              <label className="register-label" htmlFor="major">
                Major / Field of Study
                <RequiredMark />
              </label>
              <SelectDropdown
                id="major"
                options={MAJORS}
                placeholder="Select your major…"
                value={values.major}
                onChange={(major) => setField("major", major)}
                disabled={submitting}
                invalid={!!errors.major}
                describedBy={errors.major ? "major-error" : undefined}
              />
              {errors.major && (
                <p className="register-error" id="major-error">
                  {errors.major}
                </p>
              )}
              {values.major === MAJOR_OTHER_OPTION && (
                <OtherInput
                  id="majorOther"
                  placeholder="Your major…"
                  value={values.majorOther}
                  onChange={(v) => setField("majorOther", v)}
                  disabled={submitting}
                  error={errors.majorOther}
                />
              )}
            </div>

            <div className="mt-5">
              <label className="register-label" htmlFor="country">
                Country of Residence
                <RequiredMark />
              </label>
              <SelectDropdown
                id="country"
                options={COUNTRIES}
                value={values.country}
                onChange={(country) => setField("country", country)}
                disabled={submitting}
                invalid={!!errors.country}
                describedBy={errors.country ? "country-error" : undefined}
              />
              {errors.country && (
                <p className="register-error" id="country-error">
                  {errors.country}
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-5 mt-5">
              <div>
                <label className="register-label" htmlFor="gender">
                  Gender
                  <RequiredMark />
                </label>
                <SelectDropdown
                  id="gender"
                  options={GENDERS}
                  placeholder="Select your gender…"
                  value={values.gender}
                  onChange={(gender) => setField("gender", gender)}
                  disabled={submitting}
                  invalid={!!errors.gender}
                  describedBy={errors.gender ? "gender-error" : undefined}
                />
                {errors.gender && (
                  <p className="register-error" id="gender-error">
                    {errors.gender}
                  </p>
                )}
                {values.gender === GENDER_SELF_DESCRIBE_OPTION && (
                  <OtherInput
                    id="genderSelfDescribe"
                    placeholder="Self-describe your gender…"
                    value={values.genderSelfDescribe}
                    onChange={(v) => setField("genderSelfDescribe", v)}
                    disabled={submitting}
                    error={errors.genderSelfDescribe}
                  />
                )}
              </div>

              <div>
                <label className="register-label" htmlFor="pronouns">
                  Pronouns{" "}
                  <span className="text-text-muted">(Optional)</span>
                </label>
                <SelectDropdown
                  id="pronouns"
                  options={PRONOUNS}
                  placeholder="Select your pronouns…"
                  value={values.pronouns}
                  onChange={(pronouns) => setField("pronouns", pronouns)}
                  disabled={submitting}
                  invalid={!!errors.pronounsOther}
                />
                {values.pronouns === PRONOUNS_OTHER_OPTION && (
                  <OtherInput
                    id="pronounsOther"
                    placeholder="Your pronouns…"
                    value={values.pronounsOther}
                    onChange={(v) => setField("pronounsOther", v)}
                    disabled={submitting}
                    error={errors.pronounsOther}
                  />
                )}
              </div>
            </div>

            <fieldset className="mt-5">
              <legend className="register-label">
                Race / Ethnicity
                <RequiredMark />
              </legend>
              <p className="font-body text-xs text-text-muted mb-3">
                Select all that apply.
              </p>
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
                {RACES_ETHNICITIES.map((option) => (
                  <label
                    key={option}
                    className="flex items-start gap-3 font-body text-sm text-text-secondary"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-ultraviolet"
                      checked={raceEthnicity.includes(option)}
                      onChange={() => toggleRaceEthnicity(option)}
                      disabled={submitting}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {errors.raceEthnicity && (
                <p className="register-error" id="raceEthnicity-error">
                  {errors.raceEthnicity}
                </p>
              )}
              {raceEthnicity.includes(RACE_ETHNICITY_OTHER_OPTION) && (
                <OtherInput
                  id="raceEthnicityOther"
                  placeholder="Your race/ethnicity…"
                  value={values.raceEthnicityOther}
                  onChange={(v) => setField("raceEthnicityOther", v)}
                  disabled={submitting}
                  error={errors.raceEthnicityOther}
                />
              )}
            </fieldset>

            <div className="mt-5">
              <label className="register-label" htmlFor="sexualOrientation">
                Do you consider yourself to be any of the following?
                <RequiredMark />
              </label>
              <SelectDropdown
                id="sexualOrientation"
                options={SEXUAL_ORIENTATIONS}
                placeholder="Select an option…"
                value={values.sexualOrientation}
                onChange={(v) => setField("sexualOrientation", v)}
                disabled={submitting}
                invalid={!!errors.sexualOrientation}
                describedBy={
                  errors.sexualOrientation ? "sexualOrientation-error" : undefined
                }
              />
              {errors.sexualOrientation && (
                <p className="register-error" id="sexualOrientation-error">
                  {errors.sexualOrientation}
                </p>
              )}
              {values.sexualOrientation === SEXUAL_ORIENTATION_OTHER_OPTION && (
                <OtherInput
                  id="sexualOrientationOther"
                  placeholder="Your identity…"
                  value={values.sexualOrientationOther}
                  onChange={(v) => setField("sexualOrientationOther", v)}
                  disabled={submitting}
                  error={errors.sexualOrientationOther}
                />
              )}
            </div>

            <fieldset className="mt-5">
              <legend className="register-label">
                Dietary Restrictions{" "}
                <span className="text-text-muted">(Optional)</span>
              </legend>
              <p className="font-body text-xs text-text-muted mb-3">
                Select all that apply so we can plan catering.
              </p>
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
                {DIETARY_RESTRICTIONS.map((option) => (
                  <label
                    key={option}
                    className="flex items-start gap-3 font-body text-sm text-text-secondary"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-ultraviolet"
                      checked={dietary.includes(option)}
                      onChange={() => setDietary((d) => toggle(d, option))}
                      disabled={submitting}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-5">
              <label className="register-label" htmlFor="resumeUrl">
                Resume Link
                <RequiredMark />
              </label>
              <input
                id="resumeUrl"
                name="resumeUrl"
                type="url"
                className="register-input"
                placeholder="drive.google.com/file/d/…"
                value={values.resumeUrl}
                onChange={(e) => setField("resumeUrl", e.target.value)}
                maxLength={MAX_RESUME_URL_LENGTH}
                autoComplete="off"
                disabled={submitting}
                aria-invalid={!!errors.resumeUrl}
                aria-describedby={
                  errors.resumeUrl ? "resumeUrl-error" : "resumeUrl-help"
                }
              />
              <p
                className="font-body text-xs text-text-muted mt-2"
                id="resumeUrl-help"
              >
                Upload your resume to Google Drive, set sharing to
                &ldquo;Anyone with the link&rdquo; can view, and paste the
                link here.
              </p>
              {errors.resumeUrl && (
                <p className="register-error" id="resumeUrl-error">
                  {errors.resumeUrl}
                </p>
              )}
            </div>

            <div className="mt-5">
              <label className="register-label" htmlFor="linkedinUrl">
                LinkedIn URL{" "}
                <span className="text-text-muted">(Optional)</span>
              </label>
              <input
                id="linkedinUrl"
                name="linkedinUrl"
                type="url"
                className="register-input"
                placeholder="linkedin.com/in/you"
                value={values.linkedinUrl}
                onChange={(e) => setField("linkedinUrl", e.target.value)}
                maxLength={MAX_LINKEDIN_LENGTH}
                autoComplete="url"
                disabled={submitting}
                aria-invalid={!!errors.linkedinUrl}
                aria-describedby={
                  errors.linkedinUrl ? "linkedinUrl-error" : "linkedinUrl-help"
                }
              />
              <p
                className="font-body text-xs text-text-muted mt-2"
                id="linkedinUrl-help"
              >
                So our partners can connect with you about job opportunities
                after the event.
              </p>
              {errors.linkedinUrl && (
                <p className="register-error" id="linkedinUrl-error">
                  {errors.linkedinUrl}
                </p>
              )}
            </div>

            {/* MLH agreements — wording is MLH's, required verbatim for member
                events. The pre-partnership disclaimer is admin-toggleable
                (mlh_disclaimer_enabled) and shown unless explicitly turned
                off — it must stay up until MLH membership is official. */}
            <fieldset className="mt-8 border border-border rounded-xl p-5">
              <legend className="register-label px-2 mb-0">
                MLH Agreements
              </legend>

              {settings.mlh_disclaimer_enabled !== "false" && (
                <p className="font-body text-xs text-text-muted mb-4">
                  We are currently in the process of partnering with MLH. The
                  following 3 checkboxes are for this partnership. If we do
                  not end up partnering with MLH, your information will not be
                  shared.
                </p>
              )}

              <label className="mt-4 flex items-start gap-3 font-body text-sm text-text-secondary">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-ultraviolet"
                  checked={agreements.codeOfConduct}
                  onChange={(e) => setAgreement("codeOfConduct", e.target.checked)}
                  disabled={submitting}
                  aria-invalid={!!errors.codeOfConduct}
                  aria-describedby={
                    errors.codeOfConduct ? "codeOfConduct-error" : undefined
                  }
                />
                <span>
                  I have read and agree to the{" "}
                  <a
                    href={MLH_CODE_OF_CONDUCT_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ultraviolet hover:underline"
                  >
                    MLH Code of Conduct
                  </a>
                  .
                  <RequiredMark />
                </span>
              </label>
              {errors.codeOfConduct && (
                <p className="register-error" id="codeOfConduct-error">
                  {errors.codeOfConduct}
                </p>
              )}

              <label className="flex items-start gap-3 font-body text-sm text-text-secondary mt-4">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-ultraviolet"
                  checked={agreements.dataSharing}
                  onChange={(e) => setAgreement("dataSharing", e.target.checked)}
                  disabled={submitting}
                  aria-invalid={!!errors.dataSharing}
                  aria-describedby={
                    errors.dataSharing ? "dataSharing-error" : undefined
                  }
                />
                <span>
                  I authorize you to share my application/registration
                  information with Major League Hacking for event
                  administration, ranking, and administration (including the
                  creation of linked accounts on MLH and DEV (
                  <a
                    href={MLH_DEV_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ultraviolet hover:underline"
                  >
                    dev.to
                  </a>
                  )) in line with the MLH Privacy Policy. I further agree to
                  the terms of both the{" "}
                  <a
                    href={MLH_CONTEST_TERMS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ultraviolet hover:underline"
                  >
                    MLH Contest Terms and Conditions
                  </a>{" "}
                  and the{" "}
                  <a
                    href={MLH_PRIVACY_POLICY_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ultraviolet hover:underline"
                  >
                    MLH Privacy Policy
                  </a>
                  .
                  <RequiredMark />
                </span>
              </label>
              {errors.dataSharing && (
                <p className="register-error" id="dataSharing-error">
                  {errors.dataSharing}
                </p>
              )}

              <label className="flex items-start gap-3 font-body text-sm text-text-secondary mt-4">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-ultraviolet"
                  checked={agreements.emails}
                  onChange={(e) => setAgreement("emails", e.target.checked)}
                  disabled={submitting}
                />
                <span>
                  I authorize MLH + DEV to send me occasional emails about
                  relevant events, career opportunities, and community
                  announcements. <span className="text-text-muted">(Optional)</span>
                </span>
              </label>
            </fieldset>

            <div className="mt-6 flex justify-center">
              {TURNSTILE_SITE_KEY ? (
                <TurnstileWidget
                  siteKey={TURNSTILE_SITE_KEY}
                  onToken={setTurnstileToken}
                  onError={setFormError}
                />
              ) : (
                <p className="font-mono text-xs text-text-muted">
                  Captcha not configured (VITE_TURNSTILE_SITE_KEY).
                </p>
              )}
            </div>

            {formError && (
              <p className="register-error text-center mt-4" role="alert">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
              className="btn-primary w-full mt-6 disabled:opacity-50
                         disabled:cursor-not-allowed disabled:animate-none"
            >
              {submitting ? "Submitting…" : "Register"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
