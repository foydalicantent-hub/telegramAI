import { Memory } from "../Memory.js";
import { getOrCreateUser } from "../userService.js";
import { ensureLanguage } from "../User.js";
import { HISTORY_DISPLAY_LIMIT } from "../constants.js";
import { t } from "../i18n.js";

function truncate(text, max = 200) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export async function historyCommand(ctx) {
  const user = await getOrCreateUser(ctx);
  const lang = ensureLanguage(user);

  const entries = await Memory.find({ telegramId: ctx.from.id })
    .sort({ createdAt: -1 })
    .limit(HISTORY_DISPLAY_LIMIT);

  if (!entries.length) {
    await ctx.reply(t(lang, "history_empty"));
    return;
  }

  const lines = entries
    .reverse()
    .map((entry) => `${entry.role === "user" ? "🧑" : "🤖"} ${truncate(entry.content)}`);

  await ctx.reply(`${t(lang, "history_title")}\n\n${lines.join("\n\n")}`, {
    parse_mode: "HTML",
  });
}
