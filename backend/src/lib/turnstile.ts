// Cloudflare Turnstile verification.
//
// The widget rendering on the page proves nothing on its own — a bot can post
// straight to the API and skip it. The token it produces only counts once
// Cloudflare has confirmed it here, server-side, with the secret key.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

/**
 * True when Cloudflare confirms the token. Fails closed on a network error or
 * malformed response — an unverifiable token is not a verified one.
 *
 * Skips verification entirely when TURNSTILE_SECRET_KEY is unset, so local
 * development works without Cloudflare credentials (and without outbound
 * network egress, which sandboxed dev environments often block). Production
 * must always set the key.
 */
export async function verifyTurnstile(
  token: string,
  ip?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.warn(
      "TURNSTILE_SECRET_KEY is unset — SKIPPING captcha verification. " +
        "This must never happen in production.",
    );
    return true;
  }

  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`Turnstile siteverify returned ${res.status}`);
      return false;
    }

    const data = (await res.json()) as SiteverifyResponse;
    if (!data.success) {
      console.warn("Turnstile rejected a token:", data["error-codes"] ?? []);
    }
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verification failed:", err);
    return false;
  }
}
