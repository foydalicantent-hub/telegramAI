import { InlineKeyboard } from "grammy";

export function languageKeyboard() {
  return new InlineKeyboard()
    .text("🇺🇿 O'zbekcha", "lang_uz")
    .text("🇷🇺 Русский", "lang_ru")
    .row()
    .text("🇺🇸 English", "lang_en");
}
