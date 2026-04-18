// src/api/client.ts — base fetch wrapper
//
// VITE_API_URL can be either:
//   - a relative path like "/api"  (dev, via Vite proxy) — resolved against window.location.origin
//   - a full URL like "http://localhost:4000/api" (prod, or no proxy)
const BASE = import.meta.env.VITE_API_URL ?? "/api";

function buildUrl(path: string): URL {
  const full = `${BASE}${path}`;
  // If BASE is absolute (starts with http:// or https://) `new URL(full)` works.
  // Otherwise we resolve against the page origin so relative bases like "/api" are valid.
  return /^https?:\/\//i.test(full)
    ? new URL(full)
    : new URL(full, window.location.origin);
}

export async function apiFetch<T>(
  path: string,
  params?: Record<string, string | number>
): Promise<T> {
  const url = buildUrl(path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    });
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
