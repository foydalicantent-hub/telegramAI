import { Memory } from "./Memory.js";
import { getOrCreateUser } from "./userService.js";
import { ensureLanguage } from "./User.js";
import { t } from "./utils/i18n.js";

export async function cleanCommand(ctx) {
  const user = await getOrCreateUser(ctx);
  const lang = ensureLanguage(user);

  await Memory.deleteMany({ telegramId: ctx.from.id });

  await ctx.reply(t(lang, "clean_done"));
}
