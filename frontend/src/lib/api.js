// Auth-aware API helper for the admin dashboard.
// Reads the JWT from localStorage and attaches it to every request.

import imageCompression from "browser-image-compression";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "admin_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

/**
 * Authenticated fetch. Attaches the JWT, throws on non-2xx, and clears the
 * token on 401 so the auth guard can bounce the user back to login.
 * Returns parsed JSON, or null for 204 responses.
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    logout();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? `Request failed (${res.status})`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const apiGet = (path) => apiFetch(path);

export const apiPost = (path, body) =>
  apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const apiPut = (path, body) =>
  apiFetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const apiDelete = (path) => apiFetch(path, { method: "DELETE" });

// Multipart upload. Do NOT set Content-Type — the browser adds the boundary.
export const apiUpload = (path, formData, method = "POST") =>
  apiFetch(path, { method, body: formData });

/**
 * Compress an image in the browser before upload to stay well under Vercel's
 * 4.5 MB request body limit.
 */
export function compressImage(file) {
  return imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });
}
