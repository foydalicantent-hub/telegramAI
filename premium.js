import { getOrCreateUser } from "../services/userService.js";
import { ensureLanguage, refreshPremiumStatus } from "../models/User.js";
import { getUsageSummary } from "../services/premiumService.js";
import { FREE_DAILY_LIMIT } from "../config/constants.js";
import { t } from "../utils/i18n.js";

export async function premiumCommand(ctx) {
  const user = await getOrCreateUser(ctx);
  const lang = ensureLanguage(user);

  await refreshPremiumStatus(user);

  let statusText;
  if (user.isPremium) {
    statusText = t(lang, "premium_status_premium", {
      expires: user.premiumExpiresAt.toISOString().slice(0, 10),
    });
  } else {
    const { used, limit } = getUsageSummary(user);
    statusText = t(lang, "premium_status_free", { used, limit });
  }

  const infoText = t(lang, "premium_info", { limit: FREE_DAILY_LIMIT });

  await ctx.reply(`${statusText}\n\n${infoText}`, { parse_mode: "HTML" });
}
