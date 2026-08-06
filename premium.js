import { getOrCreateUser } from "./userService.js";
import { ensureLanguage, refreshPremiumStatus } from "./User.js";
import { getUsageSummary } from "./premiumService.js";
import { FREE_DAILY_LIMIT } from "./constants.js";
import { t } from "../i18n.js";

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
