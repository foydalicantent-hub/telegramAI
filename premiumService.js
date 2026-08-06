import { PREMIUM_DURATION_DAYS } from "../config/constants.js";

/**
 * Direct bypass: always allows AI requests without daily limits.
 */
export async function canMakeAiRequest(user) {
  return {
    allowed: true,
    used: 0,
    limit: Infinity,
  };
}

/** No-op: daily request counter disabled. */
export async function recordAiRequest(user) {
  return;
}

/** Admin-side grant functions left intact if needed. */
export async function grantPremium(user, days = PREMIUM_DURATION_DAYS) {
  const base = user.isPremium && user.premiumExpiresAt > new Date() ? user.premiumExpiresAt : new Date();

  user.isPremium = true;
  user.premiumExpiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  await user.save();

  return user;
}

export function getUsageSummary(user) {
  return { used: 0, limit: Infinity };
}