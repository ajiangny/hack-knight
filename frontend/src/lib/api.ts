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
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

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
