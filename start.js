import { User } from "./User.js";
import { mainMenuKeyboard } from "./mainMenu.js";

export async function startCommand(ctx) {
  const userId = ctx.from.id;

  // /start bosilganda eski kutish holatini tozalaymiz
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
}
