import { Request, Response, NextFunction } from 'express'

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store — fine for now
// Replace with Redis when scaling to multiple servers
const store = new Map<string, RateLimitEntry>()

const createRateLimiter = (
  maxRequests: number,
  windowMinutes: number,
  errorMessage = 'too_many_requests'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}-${req.path}`
    const now = Date.now()
    const windowMs = windowMinutes * 60 * 1000

    const entry = store.get(key)

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({
        error: errorMessage,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000)
      })
      return
    }

    entry.count++
    next()
  }
}

// OTP specific — 3 requests per hour per IP
export const otpRateLimit = createRateLimiter(3, 60, 'otp_rate_limit_exceeded')

// General API — 100 requests per minute per IP
export const apiRateLimit = createRateLimiter(100, 1, 'rate_limit_exceeded')