import { User } from "./User.js";

// Rasmda ko'rsatilgan aniq asosiy menyu
const mainMenuKeyboard = {
  keyboard: [
    [{ text: "🌐 AI va Qidiruv" }, { text: "🎥 Media va Yaratish" }],
    [{ text: "💻 Kod va Instrumentlar" }, { text: "⚡️ Biznes Avto-javob" }],
    [{ text: "📜 Muloqot Tarixi" }, { text: "✨ Tez kunda (Bo'sh)" }]
  ],
  resize_keyboard: true
};

export async function startCommand(ctx) {
  const userId = ctx.from.id;

  await User.findOneAndUpdate(
    { telegramId: userId },
    { waitingForInstruction: false },
    { upsert: true }
  );

  await ctx.reply(
    "👋 Assalomu alaykum! Kerakli bo'limni tanlang:",
    {
      reply_markup: mainMenuKeyboard,
    }
  );
}
