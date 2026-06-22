type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export function checkRateLimit(input: {
  key: string
  limit: number
  windowMs: number
}): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now()
  const bucket = buckets.get(input.key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    })
    return {
      allowed: true,
      remaining: input.limit - 1,
      retryAfterSec: Math.ceil(input.windowMs / 1000),
    }
  }

  bucket.count += 1
  const remaining = Math.max(0, input.limit - bucket.count)
  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  return {
    allowed: bucket.count <= input.limit,
    remaining,
    retryAfterSec,
  }
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0]?.trim() || "unknown"
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return "unknown"
}
