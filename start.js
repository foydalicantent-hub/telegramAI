import { mainMenuKeyboard } from "./mainMenu.js";
import { User } from "./User.js";

export async function startCommand(ctx) {
  const userId = ctx.from.id;

  // /start bosilganda agar eski kutish holati qolgan bo'lsa, uni tozalab tashlaymiz
  await User.findOneAndUpdate(
    { telegramId: userId },
    { waitingForInstruction: false },
    { upsert: true }
  );

  await ctx.reply(
    "👋 Assalomu alaykum! Telegram Business va AI yordamchi botiga xush kelibsiz. Kerakli funksiyani tanlang:",
    {
      reply_markup: mainMenuKeyboard,
    }
  );
} mana start.js
