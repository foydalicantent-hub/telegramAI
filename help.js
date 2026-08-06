import { getOrCreateUser } from "./userService.js";
import { ensureLanguage } from "./User.js";
import { t } from "./i18n.js";

export async function helpCommand(ctx) {
  const user = await getOrCreateUser(ctx);
  const lang = ensureLanguage(user);

  await ctx.reply(`${t(lang, "help_title")}\n\n${t(lang, "help_body")}`, {
    parse_mode: "HTML",
  });
}
