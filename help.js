import { getOrCreateUser } from "../services/userService.js";
import { ensureLanguage } from "../models/User.js";
import { t } from "../utils/i18n.js";

export async function helpCommand(ctx) {
  const user = await getOrCreateUser(ctx);
  const lang = ensureLanguage(user);

  await ctx.reply(`${t(lang, "help_title")}\n\n${t(lang, "help_body")}`, {
    parse_mode: "HTML",
  });
}
