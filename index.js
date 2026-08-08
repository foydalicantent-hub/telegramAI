import { Bot } from "grammy";
import http from "http";

import { config, assertRequiredConfig } from "./env.js";
import { connectDB } from "./connect.js";
import { logger } from "./logger.js";

import { User } from "./User.js";
import { Memory } from "./Memory.js";
import { queryAI, generateImage, queryClaude, searchMovie, searchInternet } from "./aiService.js";

assertRequiredConfig();
await connectDB();

const bot = new Bot(config.botToken);

// Render portini ushlab turuvchi HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running smoothly!");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`HTTP server is listening on port ${PORT}`);
});

await bot.api.setMyCommands([
  { command: "start", description: "Botni ishga tushirish / Til tanlash" },
  { command: "help", description: "Yordam va ko'rsatmalar" },
  { command: "clean", description: "Muloqot tarixini tozalash" },
  { command: "history", description: "Mijozlar tarixi" },
]);

// ================= KLAVIATURALAR VA MENYULAR =================

const languageKeyboard = {
  inline_keyboard: [
    [
      { text: "🇺🇿 O'zbekcha", callback_data: "set_lang_uz" },
      { text: "🇷🇺 Русский", callback_data: "set_lang_ru" },
      { text: "🇬🇧 English", callback_data: "set_lang_en" }
    ]
  ]
};

const mainMenuKeyboard = {
  keyboard: [
    [{ text: "🌐 AI va Qidiruv" }, { text: "🎥 Media va Yaratish" }],
    [{ text: "💻 Kod va Instrumentlar" }, { text: "📜 Muloqot Tarixi" }]
  ],
  resize_keyboard: true
};

const submenu1Keyboard = {
  keyboard: [
    [{ text: "🤖 AI Chat" }, { text: "🔍 Internet Qidiruv" }],
    [{ text: "🎬 Kino Topish" }],
    [{ text: "🔙 Ortga" }]
  ],
  resize_keyboard: true
};

const submenu2Keyboard = {
  keyboard: [
    [{ text: "🎨 Rasm Yaratish" }, { text: "🖼 Rasm va Video O'qish" }],
    [{ text: "🔴 Dumaloq Video" }, { text: "🔗 Link orqali Yuklash" }],
    [{ text: "🔙 Ortga" }]
  ],
  resize_keyboard: true
};

const submenu3Keyboard = {
  keyboard: [
    [{ text: "💻 Kod Yozish" }, { text: "🧠 Claude AI" }],
    [{ text: "📁 Fayl O'qish" }, { text: "🌐 Tarjima" }],
    [{ text: "🎮 Mod Oyunlar" }],
    [{ text: "🔙 Ortga" }]
  ],
  resize_keyboard: true
};

// ================= START VA TIL TANLASH =================

bot.command("start", async (ctx) => {
  await ctx.reply(
    "🌐 **Xush kelibsiz! Iltimos, muloqot tilini tanlang:**\n" +
    "🌐 **Добро пожаловать! Выберите язык:**\n" +
    "🌐 **Welcome! Please choose a language:**",
    { parse_mode: "Markdown", reply_markup: languageKeyboard }
  );
});

bot.callbackQuery(/^set_lang_/, async (ctx) => {
  const lang = ctx.callbackQuery.data.replace("set_lang_", "");
  const userId = ctx.from.id;

  let user = await User.findOne({ telegramId: userId });
  if (!user) {
    user = await User.create({ telegramId: userId, language: lang, currentMode: "ai_chat" });
  } else {
    user.language = lang;
    user.currentMode = "ai_chat";
    await user.save();
  }

  await ctx.answerCallbackQuery("✅ Til tanlandi!");
  await ctx.deleteMessage().catch(() => {});

  let text = "✅ **Til muvaffaqiyatli saqlandi!**\n\nQuyidagi menyulardan birini tanlang:";
  if (lang === "ru") text = "✅ **Язык успешно сохранен!**\n\nВыберите нужный раздел:";
  if (lang === "en") text = "✅ **Language successfully saved!**\n\nSelect a section below:";

  await ctx.reply(text, { parse_mode: "Markdown", reply_markup: mainMenuKeyboard });
});

bot.hears("🔙 Ortga", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "ai_chat" }, { upsert: true });
  await ctx.reply("🏠 **Asosiy menyuga qaytdingiz:**", { reply_markup: mainMenuKeyboard });
});

// ================= REJIMLARNI O'RNATISH (HEARS) =================

bot.hears("🌐 AI va Qidiruv", async (ctx) => {
  await ctx.reply("🌐 **AI va Qidiruv bo'limi:**\nKerakli xizmatni tanlang:", { reply_markup: submenu1Keyboard });
});

bot.hears("🤖 AI Chat", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "ai_chat" }, { upsert: true });
  await ctx.reply("🤖 **AI Chat rejimi faol!**\nSizni qiziqtirgan har qanday savolni yozib yuboring:", { reply_markup: submenu1Keyboard });
});

bot.hears("🔍 Internet Qidiruv", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "search" }, { upsert: true });
  await ctx.reply("🔍 **Internet Qidiruv:**\nNimani qidirmoqchisiz? Kalit so'z yoki savolingizni yuboring:", { reply_markup: submenu1Keyboard });
});

bot.hears("🎬 Kino Topish", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "movie" }, { upsert: true });
  await ctx.reply("🎬 **Kino Topish:**\nQaysi kino yoki serialni qidiryapsiz? Nomini yozing:", { reply_markup: submenu1Keyboard });
});

bot.hears("🎥 Media va Yaratish", async (ctx) => {
  await ctx.reply("🎥 **Media va Yaratish bo'limi:**\nKerakli xizmatni tanlang:", { reply_markup: submenu2Keyboard });
});

bot.hears("🎨 Rasm Yaratish", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "image_gen" }, { upsert: true });
  await ctx.reply("🎨 **Rasm Yaratish:**\nYaratilishi kerak bo'lgan rasm tasvirini batafsil yozib yuboring:", { reply_markup: submenu2Keyboard });
});

bot.hears("💻 Kod va Instrumentlar", async (ctx) => {
  await ctx.reply("💻 **Kod va Instrumentlar bo'limi:**\nKerakli vositani tanlang:", { reply_markup: submenu3Keyboard });
});

bot.hears("🧠 Claude AI", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "claude" }, { upsert: true });
  await ctx.reply("🧠 **Claude AI Rejimi:**\nClaude AI orqali tahlil qilish uchun savol yuboring:", { reply_markup: submenu3Keyboard });
});

bot.hears("📜 Muloqot Tarixi", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const memories = await Memory.find({ telegramId: userId }).sort({ createdAt: -1 }).limit(15);
    if (!memories.length) return ctx.reply("📂 Tarix topilmadi.", { reply_markup: mainMenuKeyboard });
    let text = "📜 **Muloqot Tarixi:**\n\n";
    memories.reverse().forEach((m, i) => text += `${i + 1}. ${m.role === "user" ? "Siz" : "AI"}: ${m.content.substring(0, 50)}\n`);
    await ctx.reply(text, { reply_markup: mainMenuKeyboard });
  } catch (err) {
    await ctx.reply("❌ Xatolik.", { reply_markup: mainMenuKeyboard });
  }
});

// ================= MATNLI XABARLARNI QAT'IY REJIMLAR BO'YICHA BOSHQARISH =================

bot.on("message:text", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    let user = await User.findOne({ telegramId: userId });
    if (!user) {
      user = await User.create({ telegramId: userId, currentMode: "ai_chat" });
    }

    const mode = user.currentMode || "ai_chat";

    // 1. Rasm Yaratish Rejimi (DALL-E)
    if (mode === "image_gen") {
      const waitMsg = await ctx.reply("🎨 Rasm yaratilmoqda, iltimos kuting...");
      const imageUrl = await generateImage(text);
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      
      if (imageUrl) {
        await ctx.replyWithPhoto(imageUrl, { caption: "🎨 AI tomonidan yaratilgan rasm!", reply_markup: mainMenuKeyboard });
      } else {
        await ctx.reply("❌ Rasm yaratishda xatolik yuz berdi.", { reply_markup: mainMenuKeyboard });
      }
      return;
    }

    // 2. Claude AI Rejimi
    if (mode === "claude") {
      const waitMsg = await ctx.reply("🧠 Claude AI tahlil qilmoqda, biroz kuting...");
      await Memory.create({ telegramId: userId, role: "user", content: text });
      const claudeReply = await queryClaude(text) || "Claude AI javob berishda xatolik yuz berdi.";
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      await Memory.create({ telegramId: userId, role: "assistant", content: claudeReply });
      await ctx.reply(claudeReply, { parse_mode: "Markdown", reply_markup: mainMenuKeyboard });
      return;
    }

    // 3. Kino Topish Rejimi
    if (mode === "movie") {
      const waitMsg = await ctx.reply("🎬 Kino qidirilmoqda...");
      const movieReply = await searchMovie(text);
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      await Memory.create({ telegramId: userId, role: "user", content: text });
      await Memory.create({ telegramId: userId, role: "assistant", content: movieReply });
      return ctx.reply(movieReply, { parse_mode: "Markdown", reply_markup: mainMenuKeyboard });
    }

    // 4. Internet Qidiruv Rejimi
    if (mode === "search") {
      const waitMsg = await ctx.reply("🔍 Internetdan qidirilmoqda...");
      const searchReply = await searchInternet(text);
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      await Memory.create({ telegramId: userId, role: "user", content: text });
      await Memory.create({ telegramId: userId, role: "assistant", content: searchReply });
      return ctx.reply(searchReply, { parse_mode: "Markdown", reply_markup: mainMenuKeyboard });
    }

    // 5. Oddiy AI Chat (Coding, Translate, Mod Games va qolganlar uchun)
    await Memory.create({ telegramId: userId, role: "user", content: text });
    const aiReply = await queryAI([{ role: "user", content: text }], user.language || "uz") || "Javob olishda xatolik yuz berdi.";
    await Memory.create({ telegramId: userId, role: "assistant", content: aiReply });

    await ctx.reply(aiReply, { parse_mode: "Markdown", reply_markup: mainMenuKeyboard });

  } catch (error) {
    logger.error(`Text message error: ${error.message}`);
    await ctx.reply("❌ Xatolik yuz berdi, qaytadan urinib ko'ring.", { reply_markup: mainMenuKeyboard });
  }
});

bot.catch((err) => {
  logger.error(`Global Bot Error: ${err.message}`);
  const ctx = err.ctx;
  if (ctx) {
    ctx.reply("🙏 Tizimda xatolik yuz berdi.", { reply_markup: mainMenuKeyboard }).catch(() => {});
  }
});

bot.start();
logger.info("Telegram Bot successfully started with all features fully operational!");
