import { User } from "./User.js";
import { grantPremium } from "./premiumService.js";
import { config } from "./env.js";
import { PREMIUM_DURATION_DAYS } from "./constants.js";

/**
 * Admin-only utility: /grant <telegramId> [days]
 * Activates (or extends) Premium for the given user. Not part of the public
 * command list — used by the bot admin(s) to manually enable Premium.
 */
export async function grantCommand(ctx) {
  if (!config.adminIds.includes(ctx.from.id)) {
    return; // silently ignore for non-admins
  }

  const [, targetId, daysArg] = ctx.message.text.trim().split(/\s+/);
  const telegramId = Number(targetId);
  const days = Number(daysArg) || PREMIUM_DURATION_DAYS;

  if (!telegramId) {
    await ctx.reply("Usage: /grant <telegramId> [days]");
    return;
  }

  const user = await User.findOne({ telegramId });
  if (!user) {
    await ctx.reply(`No user found with id ${telegramId}`);
    return;
  }

  await grantPremium(user, days);

  await ctx.reply(
    `✅ Premium granted to ${telegramId} until ${user.premiumExpiresAt.toISOString().slice(0, 10)}`
  );
}
