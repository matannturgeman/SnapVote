export const RATE_LIMITS = {
  VOTES: {
    TTL: 60,
    LIMIT: 10,
  },
  AUTH_LOGIN: {
    TTL: 60,
    LIMIT: 5,
  },
  AUTH_REGISTER: {
    TTL: 60,
    LIMIT: 3,
  },
  SHARE_LINK_CREATE: {
    TTL: 60,
    LIMIT: 5,
  },
  POLL_CREATE: {
    TTL: 60,
    LIMIT: 10,
  },
  REPORT_CREATE: {
    TTL: 60,
    LIMIT: 5,
  },
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;
