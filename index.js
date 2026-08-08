import { Bot } from "grammy";
import http from "http";

import { config, assertRequiredConfig } from "./env.js";
import { connectDB } from "./connect.js";
import { logger } from "./logger.js";

import { startCommand } from "./start.js";
import { helpCommand } from "./help.js";
import { languageCommand, languageCallback } from "./language.js";
import { cleanCommand } from "./clean.js";
import { muammoCommand } from "./feedback.js";
import { grantCommand } from "./adminGrant.js";
import { User } from "./User.js";
import { Memory } from "./Memory.js";
import { queryAI, generateImage, queryClaude } from "./aiService.js";

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

// Til tanlash tugmalari
const languageKeyboard = {
  inline_keyboard: [
    [
      { text: "🇺🇿 O'zbekcha", callback_data: "set_lang_uz" },
      { text: "🇷🇺 Русский", callback_data: "set_lang_ru" },
      { text: "🇬🇧 English", callback_data: "set_lang_en" }
    ]
  ]
};

// Asosiy Menyu
const mainMenuKeyboard = {
  keyboard: [
    [{ text: "🌐 AI va Qidiruv" }, { text: "🎥 Media va Yaratish" }],
    [{ text: "💻 Kod va Instrumentlar" }, { text: "📜 Muloqot Tarixi" }]
  ],
  resize_keyboard: true
};

// 1-Bo'lim Sub-menyusi
const submenu1Keyboard = {
  keyboard: [
    [{ text: "🤖 AI Chat" }, { text: "🔍 Internet Qidiruv" }],
    [{ text: "🎬 Kino Topish" }],
    [{ text: "🔙 Ortga" }]
  ],
  resize_keyboard: true
};

// 2-Bo'lim Sub-menyusi
const submenu2Keyboard = {
  keyboard: [
    [{ text: "🎨 Rasm Yaratish" }, { text: "🖼 Rasm va Video O'qish" }],
    [{ text: "🔴 Dumaloq Video" }, { text: "🔗 Link orqali Yuklash" }],
    [{ text: "🔙 Ortga" }]
  ],
  resize_keyboard: true
};

// 3-Bo'lim Sub-menyusi
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
    {
      parse_mode: "Markdown",
      reply_markup: languageKeyboard
    }
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

// ================= ORTGA TUGMASI LOGIKASI =================

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

bot.hears("🖼 Rasm va Video O'qish", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "vision" }, { upsert: true });
  await ctx.reply("🖼 **Rasm va Video O'qish:**\nMenga rasm yoki video yuboring, uni tahlil qilib beraman.", { reply_markup: submenu2Keyboard });
});

bot.hears("🔴 Dumaloq Video", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "video_note" }, { upsert: true });
  await ctx.reply("🔴 **Dumaloq Video:**\nMenga oddiy video yuboring, uni dumaloq shaklga o'tkazib beraman.", { reply_markup: submenu2Keyboard });
});

bot.hears("🔗 Link orqali Yuklash", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "downloader" }, { upsert: true });
  await ctx.reply("🔗 **Media Yuklovchi:**\nRasm yoki video havolasini yuboring, uni yuklab beraman.", { reply_markup: submenu2Keyboard });
});

bot.hears("💻 Kod va Instrumentlar", async (ctx) => {
  await ctx.reply("💻 **Kod va Instrumentlar bo'limi:**\nKerakli vositani tanlang:", { reply_markup: submenu3Keyboard });
});

bot.hears("💻 Kod Yozish", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "coding" }, { upsert: true });
  await ctx.reply("💻 **Kod Yozish Assistent:**\nQaysi tilda va qanday vazifa uchun kod yozish kerakligini ayting:", { reply_markup: submenu3Keyboard });
});

bot.hears("🧠 Claude AI", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "claude" }, { upsert: true });
  await ctx.reply("🧠 **Claude AI Rejimi:**\nClaude AI modeli orqali tahlil qilish uchun savol yuboring:", { reply_markup: submenu3Keyboard });
});

bot.hears("📁 Fayl O'qish", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "file_read" }, { upsert: true });
  await ctx.reply("📁 **Fayl Tahlilchisi:**\nHujjat, kod fayli yoki matnli fayl tashlang, uni o'qib tushuntirib beraman.", { reply_markup: submenu3Keyboard });
});

bot.hears("🌐 Tarjima", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "translate" }, { upsert: true });
  await ctx.reply("🌐 **Tarjimon:**\nTarjima qilinishi kerak bo'lgan matnni va qaysi tilga o'girish kerakligini yuboring:", { reply_markup: submenu3Keyboard });
});

bot.hears("🎮 Mod Oyunlar", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "mod_games" }, { upsert: true });
  await ctx.reply("🎮 **Modli O'yinlar Qidiruvi:**\nO'zingizga kerakli o'yin nomini yozing. Men uning mod/apk faylini yoki yuklash linkini topib beraman:", { reply_markup: submenu3Keyboard });
});

bot.hears("📜 Muloqot Tarixi", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const memories = await Memory.find({ telegramId: userId, role: { $ne: "owner_reply" } })
      .sort({ createdAt: -1 })
      .limit(15);

    if (!memories || memories.length === 0) {
      await ctx.reply("📂 Sizning bot bilan bo'lgan muloqot tarixingiz topilmadi.", { reply_markup: mainMenuKeyboard });
      return;
    }

    let text = "📜 **Sizning Bot Bilan Muloqot Tarixingiz:**\n\n";
    memories.reverse().forEach((m, i) => {
      const sender = m.role === "user" ? "👤 Siz" : "🤖 AI";
      text += `${i + 1}. ${sender}: ${m.content.substring(0, 80)}\n`;
    });

    await ctx.reply(text, { reply_markup: mainMenuKeyboard });
  } catch (err) {
    logger.error(`General history error: ${err.message}`);
    await ctx.reply("❌ Muloqot tarixini ko'rsatishda xatolik yuz berdi.", { reply_markup: mainMenuKeyboard });
  }
});

// ================= MEDIA VA FAYLLARNI QABUL QILISH =================

bot.on("message:video", async (ctx) => {
  try {
    const waitMsg = await ctx.reply("🔄 Video dumaloq shaklga keltirilmoqda...");
    try {
      await ctx.replyWithVideoNote(ctx.message.video.file_id);
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
    } catch (err) {
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      await ctx.replyWithVideo(ctx.message.video.file_id, { caption: "📹 Videongiz yuklandi!" });
    }
  } catch (error) {
    logger.error(`Video handler error: ${error.message}`);
  }
});

bot.on("message:photo", async (ctx) => {
  await ctx.reply("🖼 Rasm qabul qilindi va tahlil uchun tayyorlandi!", { reply_markup: mainMenuKeyboard });
});

bot.on("message:document", async (ctx) => {
  await ctx.reply("📁 Hujjat/Fayl qabul qilindi. Tahlil qilinmoqda...", { reply_markup: mainMenuKeyboard });
});

// ================= MATNLI XABARLAR VA REJIMLARNI QAT'IY BOSHQARISH =================

bot.on("message:text", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    let user = await User.findOne({ telegramId: userId });
    if (!user) {
      user = await User.create({ telegramId: userId, currentMode: "ai_chat" });
    }

    const mode = user.currentMode || "ai_chat";

    // 1. Rasm Yaratish Rejimi
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

    let systemInstruction = "";

    // 3. Rejimlarga qat'iy ko'rsatmalar (Kino va Qidiruv uchun to'g'ri tizim)
    if (mode === "movie") {
      systemInstruction = `Sen professional kino va seriallar bo'yicha mutaxassissansan. Foydalanuvchi qaysi kino yoki serial nomini yozsa, o'sha kino haqida aniq va to'liq ma'lumot ber (kino nomi, chiqqan yili, rejissyori, bosh rollar va qisqacha mazmuni). Boshqa kinolarni o'zingdan o'ylab topib aralashtirma.`;
    } else if (mode === "search") {
      systemInstruction = "Sen internet qidiruv assistentisan. Foydalanuvchi so'ragan savol yoki kalit so'z bo'yicha internetdagi eng aniq va foydali faktlarni batafsil yoritib ber.";
    } else if (mode === "coding") {
      systemInstruction = "Sen tajribali dasturlash assistentisan. Kod yozish va xatolarni to'g'rilashda yordam ber.";
    } else if (mode === "translate") {
      systemInstruction = "Sen professional tarjimonsan. Berilgan matnni boshqa tilga xatosiz va tushunarli tarjima qil.";
    } else if (mode === "mod_games") {
      systemInstruction = "Sen mobil o'yinlar va modlar bo'yicha yordamchisan. O'yinlar haqida ma'lumot ber.";
    } else {
      systemInstruction = "Sen Telegram botdagi shaxsiy AI yordamchisan. Savollarga qisqa, aniq va do'stona javob ber.";
    }

    // Xotiraga saqlash va AI dan javob olish
    await Memory.create({ telegramId: userId, role: "user", content: text });

    const promptMessages = [
      { role: "system", content: systemInstruction },
      { role: "user", content: text }
    ];

    const aiReply = await queryAI(promptMessages, user.language || "uz") || "Javob olishda xatolik yuz berdi.";

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
logger.info("Telegram Bot successfully started with fixed movie and search modes!");
