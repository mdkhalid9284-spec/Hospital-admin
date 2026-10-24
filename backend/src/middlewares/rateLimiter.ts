import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP. Please try again after 15 minutes.',
    },
  },
});

/**
 * IP-level network anti-abuse limiter for auth routes.
 * Skips successful logins so legitimate usage/demo testing does not exhaust IP budget.
 * Uses a high threshold (50 reqs/15m) to defend against network flooding,
 * while specific account backoff (5 failed tries -> 6th throttled) is enforced in AuthService.
 */
export const authIpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 50, // 50 requests per IP per 15 mins
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_IP_THROTTLED',
      message: 'Too many authentication attempts from this network. Please try again after 15 minutes.',
    },
  },
});
