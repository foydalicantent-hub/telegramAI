import { getOrCreateUser } from "./userService.js";
import { ensureLanguage } from "./User.js";
import { t } from "./i18n.js";

export async function muammoCommand(ctx) {
  const user = await getOrCreateUser(ctx);
  const lang = ensureLanguage(user);

  user.awaitingFeedback = true;
  await user.save();

  await ctx.reply(t(lang, "muammo_prompt"));
}
