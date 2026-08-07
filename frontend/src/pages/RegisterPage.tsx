// Public registration form. Gated on the registration_open site setting: when
// it is off this renders the existing coming-soon page, which is why that
// component stayed put rather than being replaced.
//
// Client-side validation here mirrors the server's rules for fast feedback
// only — POST /api/registrations is the authority and re-checks everything.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { CUNY_SCHOOLS } from "../lib/cunySchools";
import ComingSoon from "../components/site/ComingSoon";
import TurnstileWidget from "../components/site/TurnstileWidget";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

const MAX_FIELD_LENGTH = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  major: string;
  cunySchool: string;
  website: string; // honeypot
}

const EMPTY: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  major: "",
  cunySchool: "",
  website: "",
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

function validate(values: FormValues): FieldErrors {
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

  if (!values.major.trim()) errors.major = "Major is required";
  else if (values.major.trim().length > MAX_FIELD_LENGTH)
    errors.major = `Must be ${MAX_FIELD_LENGTH} characters or fewer`;

  if (!values.cunySchool) errors.cunySchool = "Select your school";

  return errors;
}

export default function RegisterPage() {
  const { settings, loading } = useSiteSettings();
  const [values, setValues] = useState<FormValues>(EMPTY);
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const found = validate(values);
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
          major: values.major.trim(),
          cunySchool: values.cunySchool,
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
            Open to students at the CUNY senior colleges. One registration per
            email address.
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

            <div className="mt-5">
              <label className="register-label" htmlFor="major">
                Major
              </label>
              <input
                id="major"
                name="major"
                className="register-input"
                value={values.major}
                onChange={(e) => setField("major", e.target.value)}
                maxLength={MAX_FIELD_LENGTH}
                placeholder="e.g. Computer Science"
                disabled={submitting}
                aria-invalid={!!errors.major}
                aria-describedby={errors.major ? "major-error" : undefined}
              />
              {errors.major && (
                <p className="register-error" id="major-error">
                  {errors.major}
                </p>
              )}
            </div>

            <div className="mt-5">
              <label className="register-label" htmlFor="cunySchool">
                CUNY School
              </label>
              {/* A select, never free text — deduping typed school names
                  afterwards is miserable. */}
              <select
                id="cunySchool"
                name="cunySchool"
                className="register-select"
                value={values.cunySchool}
                onChange={(e) => setField("cunySchool", e.target.value)}
                disabled={submitting}
                aria-invalid={!!errors.cunySchool}
                aria-describedby={errors.cunySchool ? "cunySchool-error" : undefined}
              >
                <option value="">Select your school…</option>
                {CUNY_SCHOOLS.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
              {errors.cunySchool && (
                <p className="register-error" id="cunySchool-error">
                  {errors.cunySchool}
                </p>
              )}
            </div>

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
