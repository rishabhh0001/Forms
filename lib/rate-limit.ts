export class RateLimiter {
  private cache = new Map<string, { count: number; expiresAt: number }>();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  check(ip: string): boolean {
    const now = Date.now();
    const record = this.cache.get(ip);

    // Cleanup old records periodically to prevent memory leaks
    if (this.cache.size > 10000) {
      for (const [key, val] of this.cache.entries()) {
        if (val.expiresAt < now) this.cache.delete(key);
      }
    }

    if (!record || record.expiresAt < now) {
      this.cache.set(ip, { count: 1, expiresAt: now + this.windowMs });
      return true;
    }

    record.count++;
    if (record.count > this.maxRequests) {
      return false;
    }

    return true;
  }
}

// Upload: 10 requests per 1 minute
export const uploadRateLimit = new RateLimiter(10, 60 * 1000);

// Submit: 15 requests per 1 minute
export const submitRateLimit = new RateLimiter(15, 60 * 1000);

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return (forwarded ? forwarded.split(",")[0] : realIp) || "127.0.0.1";
}
