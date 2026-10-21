import { ApiError } from "./api";

// In-memory sliding window. Good enough for a single instance / MVP.
// On Vercel (many short-lived instances) swap this for Upstash Redis (@upstash/ratelimit) — same call signature.
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number, message = "Too many requests. Please try again later.") {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    throw new ApiError(429, message);
  }
  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > 5000) {
    for (const [k, v] of Array.from(buckets)) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
}
