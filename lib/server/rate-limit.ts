/**
 * Best-effort per-key login attempt throttle. In-memory, so it resets on cold
 * start and isn't shared across serverless instances — good enough to close
 * the "brute-force a 5-digit code in seconds" gap (an attacker is now limited
 * to a handful of guesses per window instead of unlimited offline hashing).
 * For durable, multi-instance protection, swap this for a shared store
 * (e.g. Upstash Redis) without changing the call site below.
 */
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkAndRecordLoginAttempt(key: string): { allowed: boolean } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false };
  }

  entry.count += 1;
  return { allowed: true };
}
