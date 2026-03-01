/**
 * Resolve the backend API base URL.
 *
 * In production (static export served by FastAPI), the API is on the same origin.
 * In local dev, Next.js runs on :3000 and the API on :8000.
 */
export function getApiBase(): string {
  if (typeof window === "undefined") return "";

  // If the page is served by FastAPI (same origin), API is relative
  const origin = window.location.origin;

  // Local Next.js dev server on port 3000 → proxy to backend on 8000
  if (origin.includes("localhost:3000") || origin.includes("127.0.0.1:3000")) {
    return "http://localhost:8000";
  }

  // Otherwise (Railway, production) — same origin
  return "";
}
