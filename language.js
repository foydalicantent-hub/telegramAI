import { InlineKeyboard } from "grammy";
import { getOrCreateUser } from "./userService.js";
import { ensureLanguage } from "./User.js";
import { t } from "./i18n.js";

export function languageKeyboard() {
  return new InlineKeyboard()
    .text("🇺🇿 O'zbekcha", "lang_uz")
    .text("🇷🇺 Русский", "lang_ru")
    .row()
    .text("🇺🇸 English", "lang_en");
}

export async function languageCommand(ctx) {
  const user = await getOrCreateUser(ctx);
  const lang = ensureLanguage(user);

  await ctx.reply(t(lang, "choose_language"), {
    reply_markup: languageKeyboard(),
  });
}

export async function languageCallback(ctx) {
  const data = ctx.callbackQuery.data;
  const lang = data.split("_")[1]; // lang_uz -> uz

  const user = await getOrCreateUser(ctx);
  user.language = lang;
  await user.save();

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(t(lang, "language_changed"));
}
