// Public registration form. Gated on the registration_open site setting: when
// it is off this renders the existing coming-soon page, which is why that
// component stayed put rather than being replaced.
//
// Fields follow MLH's member-event requirements (first/last name, email,
// phone, age, school, level of study, country of residence, plus the three
// MLH agreement checkboxes):
// https://guide.mlh.com/general-information/managing-registrations/registrations
//
// Client-side validation here mirrors the server's rules for fast feedback
// only — POST /api/registrations is the authority and re-checks everything.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "../hooks/useSiteSettings";
import {
  AGE_MAX,
  AGE_MIN,
  COUNTRIES,
  LEVELS_OF_STUDY,
} from "../lib/registrationOptions";
import {
  MLH_CODE_OF_CONDUCT_URL,
  MLH_CONTEST_TERMS_URL,
  MLH_DEV_URL,
  MLH_PRIVACY_POLICY_URL,
} from "../lib/mlh";
import ComingSoon from "../components/site/ComingSoon";
import SchoolCombobox from "../components/site/SchoolCombobox";
import TurnstileWidget from "../components/site/TurnstileWidget";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

const MAX_FIELD_LENGTH = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mirrors the server: loose shape check plus a 7–15 digit count (E.164 bound).
const PHONE_RE = /^\+?[\d\s().-]+$/;

const AGES = Array.from(
  { length: AGE_MAX - AGE_MIN + 1 },
  (_, i) => AGE_MIN + i,
);

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: string; // select value; sent as a number
  school: string; // always an MLH-list entry or "", enforced by SchoolCombobox
  levelOfStudy: string;
  country: string;
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
  country: "United States",
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

type ErrorKey = keyof FormValues | "codeOfConduct" | "dataSharing";
type FieldErrors = Partial<Record<ErrorKey, string>>;

function validate(values: FormValues, agreements: Agreements): FieldErrors {
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

  if (!values.country) errors.country = "Select your country of residence";

  if (!agreements.codeOfConduct)
    errors.codeOfConduct = "Required to participate";
  if (!agreements.dataSharing) errors.dataSharing = "Required to participate";

  return errors;
}

export default function RegisterPage() {
  const { settings, loading } = useSiteSettings();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [agreements, setAgreements] = useState<Agreements>(NO_AGREEMENTS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">(
    "idle",
  );
  const [formError, setFormError] = useState<string | null>(null);

  function setField(field: keyof FormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    // Clear a field's error as soon as the user edits it; re-validated on submit.
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
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

    const found = validate(values, agreements);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(`${API_URL}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          age: Number(values.age),
          school: values.school,
          levelOfStudy: values.levelOfStudy,
          country: values.country,
          mlhCodeOfConduct: agreements.codeOfConduct,
          mlhDataSharing: agreements.dataSharing,
          mlhEmails: agreements.emails,
          website: values.website,
          turnstileToken: turnstileToken ?? "",
        }),
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
          <p className="section-subtitle text-center max-w-xl mx-auto">
            Open to all college students. One registration per email address.
          </p>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-surface border border-border rounded-card shadow-card
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
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="register-input"
                  value={values.phone}
                  onChange={(e) => setField("phone", e.target.value)}
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
                </label>
                <select
                  id="age"
                  name="age"
                  className="register-select"
                  value={values.age}
                  onChange={(e) => setField("age", e.target.value)}
                  disabled={submitting}
                  aria-invalid={!!errors.age}
                  aria-describedby={errors.age ? "age-error" : undefined}
                >
                  <option value="">Select your age…</option>
                  {AGES.map((age) => (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  ))}
                </select>
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
              </label>
              <select
                id="levelOfStudy"
                name="levelOfStudy"
                className="register-select"
                value={values.levelOfStudy}
                onChange={(e) => setField("levelOfStudy", e.target.value)}
                disabled={submitting}
                aria-invalid={!!errors.levelOfStudy}
                aria-describedby={
                  errors.levelOfStudy ? "levelOfStudy-error" : undefined
                }
              >
                <option value="">Select your level of study…</option>
                {LEVELS_OF_STUDY.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              {errors.levelOfStudy && (
                <p className="register-error" id="levelOfStudy-error">
                  {errors.levelOfStudy}
                </p>
              )}
            </div>

            <div className="mt-5">
              <label className="register-label" htmlFor="country">
                Country of Residence
              </label>
              <select
                id="country"
                name="country"
                className="register-select"
                value={values.country}
                onChange={(e) => setField("country", e.target.value)}
                autoComplete="country-name"
                disabled={submitting}
                aria-invalid={!!errors.country}
                aria-describedby={errors.country ? "country-error" : undefined}
              >
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              {errors.country && (
                <p className="register-error" id="country-error">
                  {errors.country}
                </p>
              )}
            </div>

            {/* MLH agreements — wording is MLH's, required verbatim for member
                events. The disclaimer can be removed once HackKnight reaches
                MLH's official membership stage. */}
            <fieldset className="mt-8 border border-border rounded-xl p-5">
              <legend className="register-label px-2 mb-0">
                MLH Agreements
              </legend>

              <p className="font-body text-xs text-text-muted mb-4">
                We are currently in the process of partnering with MLH. The
                following 3 checkboxes are for this partnership. If we do not
                end up partnering with MLH, your information will not be
                shared.
              </p>

              <label className="flex items-start gap-3 font-body text-sm text-text-secondary">
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
