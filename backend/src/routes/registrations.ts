// Participant registration. The POST route is the only public write endpoint
// in this API, so it carries the abuse handling: honeypot, validation, rate
// limit, captcha. Reads are admin-only — the table holds student PII.

import { Router, Request, Response } from "express";
import { supabase } from "../db/supabase.js";
import { authenticateAdmin } from "../middleware/auth.js";
import {
  AGE_MAX,
  AGE_MIN,
  isValidCountry,
  isValidLevelOfStudy,
} from "../lib/registrationOptions.js";
import { isValidSchool } from "../lib/schools.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { CreateRegistrationBody, Registration, SiteSetting } from "../types.js";

const registrationsRouter = Router();

const MAX_FIELD_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 limit on a full address
const MAX_EXPORT_ROWS = 1000;

// Deliberately loose: an over-clever regex rejects valid addresses. The real
// confirmation that an address works is mail reaching it.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Loose for the same reason: enough structure to catch garbage, not so strict
// it rejects a valid international format. The digit count is checked
// separately (7–15 digits, per E.164's upper bound).
const PHONE_RE = /^\+?[\d\s().-]+$/;

/* ── Rate limiting ──────────────────────────────────────────────
   In-memory, so it is per-instance and best-effort only: Vercel can run
   several serverless instances concurrently and recycles them freely, which
   resets these counters. It raises the cost of a naive flood, nothing more.
   The durable version would be a registration_attempts table keyed by IP
   hash; at this event's expected volume that is not worth the write load. */

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const attempts = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  recent.push(now);
  attempts.set(ip, recent);

  // Bound the map so a spray of distinct IPs cannot grow it without limit.
  if (attempts.size > 5000) {
    for (const [key, times] of attempts) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
        attempts.delete(key);
      }
    }
  }

  return recent.length > RATE_LIMIT_MAX;
}

/**
 * Client IP. Express's req.ip is the socket address unless `trust proxy` is
 * set, which on Vercel is the proxy rather than the visitor, so read the
 * forwarded header first and take its left-most entry.
 */
function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return raw?.split(",")[0]?.trim() || req.ip || "unknown";
}

/** Whether registration is currently accepting submissions. */
async function isRegistrationOpen(): Promise<boolean> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "registration_open")
    .maybeSingle<Pick<SiteSetting, "value">>();

  // Closed unless explicitly opened: a missing row or a failed read must never
  // accidentally open registration.
  if (error || !data) return false;
  return data.value === "true";
}

/* ── POST /api/registrations  (public) ──────────────────────────
   Ordered cheapest-rejection-first, so a flood costs us as little as
   possible: honeypot and validation are free, the rate limit is local, and
   only then do we spend a network round trip on the captcha. */

registrationsRouter.post(
  "/",
  async (req: Request<{}, {}, CreateRegistrationBody>, res: Response) => {
    const body = req.body ?? ({} as CreateRegistrationBody);

    // 1. Honeypot. A hidden field no human fills in. Answer 200 and write
    //    nothing — an error would tell the bot which field gave it away.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      res.json({ success: true });
      return;
    }

    // 2. Validate. The frontend mirrors these rules for fast feedback; this is
    //    the copy that decides.
    const firstName = (body.firstName ?? "").trim();
    const lastName = (body.lastName ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const phone = (body.phone ?? "").trim();
    const age = Number(body.age);
    // Must match MLH's verified school list exactly (the form's combobox only
    // submits list entries) — uniform names, no deduping at check-in.
    const school = (body.school ?? "").trim();
    const levelOfStudy = (body.levelOfStudy ?? "").trim();
    const country = (body.country ?? "").trim();
    // Strict === true so a truthy string like "false" cannot count as agreed.
    const mlhCodeOfConduct = body.mlhCodeOfConduct === true;
    const mlhDataSharing = body.mlhDataSharing === true;
    const mlhEmails = body.mlhEmails === true;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !school ||
      !levelOfStudy ||
      !country
    ) {
      res.status(422).json({ message: "All fields are required" });
      return;
    }

    // School is absent here on purpose: it is checked against the MLH list
    // below, which bounds it more tightly than any length cap.
    if (
      firstName.length > MAX_FIELD_LENGTH ||
      lastName.length > MAX_FIELD_LENGTH
    ) {
      res.status(422).json({
        message: `Name must be ${MAX_FIELD_LENGTH} characters or fewer`,
      });
      return;
    }

    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
      res.status(422).json({ message: "Enter a valid email address" });
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (
      !PHONE_RE.test(phone) ||
      phoneDigits.length < 7 ||
      phoneDigits.length > 15
    ) {
      res.status(422).json({ message: "Enter a valid phone number" });
      return;
    }

    if (!Number.isInteger(age) || age < AGE_MIN || age > AGE_MAX) {
      res.status(422).json({ message: "Select your age" });
      return;
    }

    if (!isValidSchool(school)) {
      res.status(422).json({ message: "Select a school from the list" });
      return;
    }

    if (!isValidLevelOfStudy(levelOfStudy)) {
      res.status(422).json({ message: "Select a level of study from the list" });
      return;
    }

    if (!isValidCountry(country)) {
      res.status(422).json({ message: "Select a country from the list" });
      return;
    }

    // MLH requires agreement to the Code of Conduct and the data-sharing
    // terms; the email opt-in is the one box that may stay unchecked.
    if (!mlhCodeOfConduct || !mlhDataSharing) {
      res.status(422).json({
        message:
          "You must agree to the MLH Code of Conduct and data sharing terms",
      });
      return;
    }

    // 3. Rate limit by IP (best-effort, see note above).
    if (isRateLimited(clientIp(req))) {
      res
        .status(429)
        .json({ message: "Too many attempts. Please try again later." });
      return;
    }

    // 4. Captcha. The widget on the page proves nothing without this.
    if (!(await verifyTurnstile(body.turnstileToken ?? "", clientIp(req)))) {
      res
        .status(400)
        .json({ message: "Captcha verification failed. Please try again." });
      return;
    }

    // 5. Registration window. The frontend gate can be bypassed by posting
    //    directly, so this check is what actually closes registration.
    if (!(await isRegistrationOpen())) {
      res.status(403).json({ message: "Registration is currently closed" });
      return;
    }

    // 6. Insert.
    const { error } = await supabase.from("registrations").insert({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      age,
      school,
      level_of_study: levelOfStudy,
      country,
      mlh_code_of_conduct: mlhCodeOfConduct,
      mlh_data_sharing: mlhDataSharing,
      mlh_emails: mlhEmails,
    });

    if (error) {
      // 23505 = unique_violation on registrations_email_unique.
      if (error.code === "23505") {
        res.status(409).json({ message: "This email is already registered" });
        return;
      }
      console.error("Failed to insert registration:", error);
      res.status(500).json({ message: "Server error" });
      return;
    }

    // No echo of the stored row: a public endpoint has no reason to confirm
    // what is on file for an address.
    res.status(201).json({ success: true });
  },
);

/* ── Admin reads ────────────────────────────────────────────────*/

const SEARCHABLE = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "school",
  "level_of_study",
  "country",
];

/** Rows newest-first, optionally filtered by `?search=`. */
async function fetchRegistrations(search?: string) {
  let query = supabase
    .from("registrations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_EXPORT_ROWS);

  const term = search?.trim();
  if (term) {
    // Escape PostgREST's or() delimiters so a comma or paren in the search
    // box cannot break out of the filter expression.
    const safe = term.replace(/[,()\\]/g, " ").trim();
    if (safe) {
      query = query.or(SEARCHABLE.map((c) => `${c}.ilike.%${safe}%`).join(","));
    }
  }

  return query.returns<Registration[]>();
}

// GET /api/registrations  (admin)
registrationsRouter.get(
  "/",
  authenticateAdmin,
  async (req: Request, res: Response) => {
    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;
    const { data, error } = await fetchRegistrations(search);

    if (error) {
      console.error("Failed to fetch registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
      return;
    }

    res.json(data ?? []);
  },
);

/** One CSV field: quote always, double any internal quote (RFC 4180). */
function csvField(value: string | number | boolean | null | undefined): string {
  // Booleans are the MLH checkbox columns; Yes/No reads better than t/f in a
  // spreadsheet handed to organizers.
  const text =
    typeof value === "boolean" ? (value ? "Yes" : "No") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

const CSV_COLUMNS: Array<[header: string, key: keyof Registration]> = [
  ["First Name", "first_name"],
  ["Last Name", "last_name"],
  ["Email", "email"],
  ["Phone Number", "phone"],
  ["Age", "age"],
  ["School", "school"],
  ["Level of Study", "level_of_study"],
  ["Country of Residence", "country"],
  ["MLH Code of Conduct", "mlh_code_of_conduct"],
  ["MLH Data Sharing", "mlh_data_sharing"],
  ["MLH Email Opt-In", "mlh_emails"],
  ["Registered At", "created_at"],
];

// GET /api/registrations/export  (admin) — the check-in day download.
registrationsRouter.get(
  "/export",
  authenticateAdmin,
  async (_req: Request, res: Response) => {
    const { data, error } = await fetchRegistrations();

    if (error) {
      console.error("Failed to export registrations:", error);
      res.status(500).json({ message: "Failed to export registrations" });
      return;
    }

    const rows = data ?? [];
    const csv = [
      CSV_COLUMNS.map(([header]) => csvField(header)).join(","),
      ...rows.map((row) =>
        CSV_COLUMNS.map(([, key]) => csvField(row[key])).join(","),
      ),
    ].join("\r\n");

    const today = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="hackknight-registrations-${today}.csv"`,
    );
    // BOM so Excel reads UTF-8 names correctly instead of mojibake.
    res.send(`﻿${csv}`);
  },
);

// DELETE /api/registrations/:id  (admin) — test rows and deletion requests.
registrationsRouter.delete(
  "/:id",
  authenticateAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const { error } = await supabase
      .from("registrations")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      console.error("Failed to delete registration:", error);
      res.status(500).json({ message: "Failed to delete registration" });
      return;
    }

    res.status(204).send();
  },
);

export default registrationsRouter;
