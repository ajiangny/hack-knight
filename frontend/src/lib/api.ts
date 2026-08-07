// Auth-aware API helper for the admin dashboard.
// Reads the JWT from localStorage and attaches it to every request.

import imageCompression from "browser-image-compression";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "admin_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  notifyAuthChange();
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  notifyAuthChange();
}

/**
 * The `exp` claim (Unix seconds) from a JWT payload, or null when the token
 * is not a parseable JWT. The signature is deliberately NOT checked — that is
 * the server's job. This only lets the UI avoid rendering a dashboard it
 * already knows it cannot save from.
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    // JWTs use base64url; atob only understands standard base64.
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json) as { exp?: unknown };
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

/**
 * Milliseconds left on the stored session, or 0 when there is no usable
 * token. Drives the "save now" warning banner in the admin shell.
 */
export function getSessionRemainingMs(): number {
  const token = getToken();
  if (!token) return 0;
  const exp = getTokenExpiry(token);
  if (exp === null) return 0;
  return Math.max(0, exp * 1000 - Date.now());
}

/**
 * True only for a token that is present, well formed, and unexpired. A bare
 * presence check let an 8-hour-old token render the dashboard, where every
 * write then failed. Kept pure so it is safe as a `useSyncExternalStore`
 * snapshot — clearing is `pruneExpiredToken`'s job.
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  return getSessionRemainingMs() > 0;
}

/** Drop a token that can no longer authenticate anything, and notify. */
export function pruneExpiredToken(): void {
  if (getToken() && !isAuthenticated()) logout();
}

/* ── Auth change notifications ──────────────────────────────────
   The token lives in localStorage, which React cannot observe. Publishing
   changes here lets `useAuth` re-render the route guard the instant the
   token is set or cleared — including by a 401 raised deep inside a save. */

const authListeners = new Set<() => void>();

function notifyAuthChange(): void {
  for (const listener of authListeners) listener();
}

export function subscribeToAuth(callback: () => void): () => void {
  authListeners.add(callback);
  return () => {
    authListeners.delete(callback);
  };
}

// `storage` fires only in *other* tabs, so logging out in one tab logs out
// the rest. A null key means the whole store was cleared.
window.addEventListener("storage", (e) => {
  if (e.key === null || e.key === TOKEN_KEY) notifyAuthChange();
});

// A tab reopened after the session lapsed starts clean rather than flashing
// the dashboard before the first write fails.
pruneExpiredToken();

/**
 * Authenticated fetch. Attaches the JWT, throws on non-2xx, and clears the
 * token on 401 so the auth guard can bounce the user back to login.
 * Returns parsed JSON, or null for 204 responses.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    // logout() notifies subscribers, so the guard redirects before any
    // caller gets a chance to swallow this error.
    logout();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const data: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(data.message ?? `Request failed (${res.status})`);
  }

  // 204 No Content — callers that DELETE ignore the return value.
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export const apiGet = <T = unknown>(path: string) => apiFetch<T>(path);

export const apiPost = <T = unknown>(path: string, body: unknown) =>
  apiFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const apiPut = <T = unknown>(path: string, body: unknown) =>
  apiFetch<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const apiDelete = (path: string) => apiFetch<null>(path, { method: "DELETE" });

// Multipart upload. Do NOT set Content-Type — the browser adds the boundary.
export const apiUpload = <T = unknown>(
  path: string,
  formData: FormData,
  method: string = "POST",
) => apiFetch<T>(path, { method, body: formData });

/**
 * Compress an image in the browser before upload to stay well under Vercel's
 * 4.5 MB request body limit.
 */
export function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });
}
