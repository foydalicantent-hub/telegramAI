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
import { chatHandler } from "./chat.js";
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
    [{ text: "💻 Kod va Instrumentlar" }, { text: "🤖 Biznes Avto-javob" }],
    [{ text: "📜 Muloqot Tarixi" }, { text: "✨ Tez kunda (Bo'sh)" }]
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

const submenu4Keyboard = {
  keyboard: [
    [{ text: "📞 Kontakt ulashish", request_contact: true }],
    [{ text: "🟢 Yoqish" }, { text: "🔴 O'chirish" }],
    [{ text: "✏️ Matnni Tahrirlash" }, { text: "📋 Mijozlar Tarixi (Biznes)" }],
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
    user = await User.create({ telegramId: userId, language: lang });
  } else {
    user.language = lang;
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

// ================= BO'LIM 1: AI VA QIDIRUV (REJIMLARNI O'RNATISH) =================

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

// ================= BO'LIM 2: MEDIA VA YARATISH =================

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
  await ctx.reply("🔴 **Dumaloq Video (`video_note`):**\nMenga oddiy video yuboring, uni dumaloq shaklga o'tkazib beraman.", { reply_markup: submenu2Keyboard });
});

bot.hears("🔗 Link orqali Yuklash", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "downloader" }, { upsert: true });
  await ctx.reply("🔗 **Media Yuklovchi:**\nRasm yoki video havolasini (linkini) yuboring, uni yuklab beraman.", { reply_markup: submenu2Keyboard });
});

// ================= BO'LIM 3: KOD VA INSTRUMENTLAR =================

bot.hears("💻 Kod va Instrumentlar", async (ctx) => {
  await ctx.reply("💻 **Kod va Instrumentlar bo'limi:**\nKerakli vositani tanlang:", { reply_markup: submenu3Keyboard });
});

bot.hears("💻 Kod Yozish", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "coding" }, { upsert: true });
  await ctx.reply("💻 **Kod Yozish Assistent:**\nQaysi tilda va qanday vazifa uchun kod yozish kerakligini ayting:", { reply_markup: submenu3Keyboard });
});

bot.hears("🧠 Claude AI", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "claude" }, { upsert: true });
  await ctx.reply("🧠 **Claude AI Rejimi:**\nClaude AI modeli orqali chuqur tahlil va muloqot qilish uchun savol yuboring:", { reply_markup: submenu3Keyboard });
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

// ================= BO'LIM 4: BIZNES AVTO-JAVOB & MIJOZLAR =================

bot.hears("🤖 Biznes Avto-javob", async (ctx) => {
  await ctx.reply("🤖 **Telegram Business Avto-javob Sozlamalari:**", { reply_markup: submenu4Keyboard });
});

bot.hears("🟢 Yoqish", async (ctx) => {
  try {
    const userId = ctx.from.id;
    await User.findOneAndUpdate({ telegramId: userId }, { autoReplyActive: true }, { upsert: true });
    await ctx.reply("✅ **Biznes Avto-javob yoqildi!**", { reply_markup: submenu4Keyboard });
  } catch (err) {
    logger.error(`Turn on error: ${err.message}`);
  }
});

bot.hears("🔴 O'chirish", async (ctx) => {
  try {
    const userId = ctx.from.id;
    await User.findOneAndUpdate({ telegramId: userId }, { autoReplyActive: false }, { upsert: true });
    await ctx.reply("❌ **Biznes Avto-javob o'chirildi!**", { reply_markup: submenu4Keyboard });
  } catch (err) {
    logger.error(`Turn off error: ${err.message}`);
  }
});

bot.hears("✏️ Matnni Tahrirlash", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { waitingForInstruction: true }, { upsert: true });
  await ctx.reply("📝 **Mijozlarga 1-marta yuboriladigan javob matnini yuboring:**\n(Masalan: *Hozir bandman, tez orada javob beraman*)", { reply_markup: submenu4Keyboard });
});

bot.hears("📋 Mijozlar Tarixi (Biznes)", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const user = await User.findOne({ telegramId: userId });
    const isOwner = user && (user.businessConnectionId || user.telegramId === userId);

    if (!isOwner) {
      await ctx.reply("✨ Hali bo'sh", { reply_markup: submenu4Keyboard });
      return;
    }

    const memories = await Memory.find({
      telegramId: userId,
      content: { $regex: /Mijoz ID/ }
    }).sort({ createdAt: -1 });

    if (!memories || memories.length === 0) {
      await ctx.reply("📂 Hozircha saqlangan biznes mijozlar tarixi yo'q.", { reply_markup: submenu4Keyboard });
      return;
    }

    const uniqueClients = new Map();
    memories.forEach(m => {
      const match = m.content.match(/Mijoz ID: (\d+)/);
      const nameMatch = m.content.match(/Ism: ([^\]]+)/);
      if (match && match[1]) {
        const clientId = match[1];
        const clientName = nameMatch ? nameMatch[1].trim() : "Mijoz";
        if (!uniqueClients.has(clientId)) {
          uniqueClients.set(clientId, { name: clientName, date: new Date(m.createdAt).toLocaleString() });
        }
      }
    });

    if (uniqueClients.size === 0) {
      await ctx.reply("✨ Hali bo'sh", { reply_markup: submenu4Keyboard });
      return;
    }

    let text = "📋 **Biznes Mijozlar va Kontaktlar Ro'yxati:**\n\n";
    let index = 1;
    for (const [clientId, info] of uniqueClients) {
      text += `${index}. 👤 **Ism:** ${info.name}\n   🆔 **ID:** <code>${clientId}</code>\n   📅 Oxirgi aloqa: ${info.date}\n\n`;
      index++;
    }

    await ctx.reply(text, { parse_mode: "HTML", reply_markup: submenu4Keyboard });
  } catch (err) {
    logger.error(`Business history error: ${err.message}`);
    await ctx.reply("❌ Tarixni olishda xatolik yuz berdi.", { reply_markup: submenu4Keyboard });
  }
});

// ================= BO'LIM 5: MULOQOT TARIXI =================

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

bot.hears("✨ Tez kunda (Bo'sh)", async (ctx) => {
  await ctx.reply("✨ Hali bo'sh", { reply_markup: mainMenuKeyboard });
});

// ================= KONTAKT VA MEDIA HANDLERLARI =================

bot.on("message:contact", async (ctx) => {
  try {
    const contact = ctx.message.contact;
    const userId = ctx.from.id;

    if (contact && contact.phone_number) {
      await User.findOneAndUpdate(
        { telegramId: userId },
        { phoneNumber: contact.phone_number, autoReplyActive: true },
        { upsert: true }
      );

      await Memory.create({
        telegramId: userId,
        role: "user",
        content: `[Mijoz ID: ${userId}] [Ism: ${ctx.from.first_name || "Mijoz"}] Kontakt ulashdi: ${contact.phone_number}`
      });

      await ctx.reply("✅ **Telefon raqamingiz muvaffaqiyatli saqlandi!**", { reply_markup: mainMenuKeyboard });
    }
  } catch (err) {
    logger.error(`Contact handling error: ${err.message}`);
  }
});

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

// ================= BIZNES XABARLAR LOGIKASI =================

bot.on("business_connection", async (ctx) => {
  try {
    const conn = ctx.businessConnection;
    let user = await User.findOne({ telegramId: conn.user.id });
    if (user) {
      user.businessConnectionId = conn.id;
      await user.save();
    } else {
      await User.create({
        telegramId: conn.user.id,
        businessConnectionId: conn.id,
        autoReplyActive: true
      });
    }
  } catch (err) {
    logger.error(`Business connection error: ${err.message}`);
  }
});

bot.on("business_message", async (ctx) => {
  try {
    const message = ctx.businessMessage;
    const text = message.text || "";
    const senderId = message.from ? message.from.id : null;
    const senderName = message.from ? `${message.from.first_name || ""} ${message.from.last_name || ""}`.trim() : "Mijoz";

    if (!senderId) return;

    let owner = await User.findOne({ businessConnectionId: message.business_connection_id });
    if (!owner) {
      owner = await User.findOne({ businessConnectionId: { $exists: true, $ne: "" } }).sort({ updatedAt: -1 });
    }

    if (!owner || owner.autoReplyActive === false) return;

    if (message.is_outgoing || (message.from && message.from.id === owner.telegramId)) {
      await Memory.create({
        telegramId: owner.telegramId,
        role: "owner_reply",
        content: `[Mijoz ID: ${senderId}] Akkaunt egasi javob yozdi: ${text}`
      });
      return;
    }

    const lastOwnerReply = await Memory.findOne({
      telegramId: owner.telegramId,
      role: "owner_reply",
      content: { $regex: `\\[Mijoz ID: ${senderId}\\]` }
    }).sort({ createdAt: -1 });

    const filter = {
      telegramId: owner.telegramId,
      role: "assistant",
      content: { $regex: `\\[Mijoz ID: ${senderId}\\]` }
    };

    if (lastOwnerReply) {
      filter.createdAt = { $gt: lastOwnerReply.createdAt };
    }

    const aiRepliesCount = await Memory.countDocuments(filter);

    if (aiRepliesCount >= 3) {
      await bot.api.sendMessage(
        owner.telegramId,
        `📩 **Mijoz yozdi (AI to'xtatilgan, 3 marta javob berib bo'lindi):**\n👤 **Mijoz:** ${senderName} (ID: <code>${senderId}</code>)\n💬 **Xabar:** "${text}"`,
        { parse_mode: "HTML" }
      ).catch(() => {});
      return;
    }

    let finalReply = "";

    if (aiRepliesCount === 0) {
      finalReply = owner.businessInstruction || "Bandman, tez orada bog'lanaman.";
    } else {
      const phoneText = owner.phoneNumber ? ` Telefon raqami: ${owner.phoneNumber}.` : "";
      const systemPrompt = `Sen Telegram foydalanuvchisining shaxsiy biznes assistentisan. Akaunt egasi hozir band.\nAkaunt egasi ma'lumotlari:${phoneText}\nQOIDALAR:\n1. Mijoz so'roviga tabiiy va qisqa javob ber.\n2. O'zingni bot deb tanishtirma.`;

      const promptMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ];

      finalReply = await queryAI(promptMessages, owner.language || "uz") || "Tushunarli, tez orada bog'lanamiz.";
    }

    await Memory.create({
      telegramId: owner.telegramId,
      role: "assistant",
      content: `[Mijoz ID: ${senderId}] [Ism: ${senderName}] ${finalReply}`
    });

    await ctx.reply(finalReply, { business_connection_id: message.business_connection_id });

  } catch (error) {
    logger.error(`Business message error: ${error.message}`);
  }
});

// ================= MATNLI XABARLAR VA REJIMLAR BO'YICHA QAT'IY AJratilgan ISHLASH =================

bot.on("message:text", async (ctx, next) => {
  try {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    const user = await User.findOne({ telegramId: userId });

    // 1. Biznes tahrirlash holati
    if (user && user.waitingForInstruction) {
      user.businessInstruction = text;
      user.waitingForInstruction = false;
      user.autoReplyActive = true;
      await user.save();

      await ctx.reply(`✅ **Avto-javob matningiz saqlandi va yoqildi!**\n\nYangi matn:\n"${text}"`, { reply_markup: mainMenuKeyboard });
      return;
    }

    const mode = user?.currentMode || "ai_chat";

    // 2. Rasm Yaratish Rejimi (Faqat DALL-E)
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

    // 3. Claude AI Rejimi (Faqat Claude)
    if (mode === "claude") {
      const waitMsg = await ctx.reply("🧠 Claude AI tahlil qilmoqda, biroz kuting...");
      const claudeReply = await queryClaude(text) || "Claude AI javob berishda xatolik yuz berdi.";
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});

      await Memory.create({ telegramId: userId, role: "user", content: text });
      await Memory.create({ telegramId: userId, role: "assistant", content: claudeReply });
      await ctx.reply(claudeReply, { reply_markup: mainMenuKeyboard });
      return;
    }

    let promptMessages = [];

    // 4. Qolgan rejimlarni alohida va aniq taqsimlash
    if (mode === "movie") {
      promptMessages = [
        { role: "system", content: "Sen kino va seriallar bo'yicha mutaxassissansan. Foydalanuvchi so'ragan kino, serial yoki uning tarjima qilingan nomini, mazmunini va qayerdan topish mumkinligini aniq tushuntirib ber." },
        { role: "user", content: text }
      ];
    } else if (mode === "search") {
      promptMessages = [
        { role: "system", content: "Sen internet qidiruv yordamchisisan. Berilgan so'rov bo'yicha internetdan olingandek eng aniq, so'nggi ma'lumotlarni topib ber." },
        { role: "user", content: text }
      ];
    } else if (mode === "coding") {
      promptMessages = [
        { role: "system", content: "Sen tajribali dasturlash assistentisan. Kod yozish va xatoliklarni to'g'rilashda yordam ber." },
        { role: "user", content: text }
      ];
    } else if (mode === "translate") {
      promptMessages = [
        { role: "system", content: "Sen professional tarjimonsan. Berilgan matnni mos tilga aniq tarjima qilib ber." },
        { role: "user", content: text }
      ];
    } else if (mode === "mod_games") {
      promptMessages = [
        { role: "system", content: "Sen mobil o'yinlar va modlar bo'yicha yordamchisan. Foydalanuvchi so'ragan o'yin haqida ma'lumot ber." },
        { role: "user", content: text }
      ];
    } else {
      // Standart AI Chat (Faqat oddiy chat)
      const history = await Memory.find({ telegramId: userId }).sort({ createdAt: -1 }).limit(6);
      promptMessages = history.reverse().map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content
      }));
      promptMessages.push({ role: "user", content: text });
    }

    // Xotiraga yozamiz
    await Memory.create({ telegramId: userId, role: "user", content: text });

    // AI orqali javob olamiz
    const aiReply = await queryAI(promptMessages, user?.language || "uz") || "Javob olishda xatolik yuz berdi.";

    await Memory.create({ telegramId: userId, role: "assistant", content: aiReply });

    await ctx.reply(aiReply, { reply_markup: mainMenuKeyboard });

  } catch (error) {
    logger.error(`Text message error: ${error.message}`);
    return next();
  }
}, chatHandler);

bot.catch((err) => {
  logger.error(`Global Bot Error: ${err.message}`);
  const ctx = err.ctx;
  if (ctx) {
    ctx.reply("🙏 Tizimda xatolik yuz berdi.", { reply_markup: mainMenuKeyboard }).catch(() => {});
  }
});

bot.start();
logger.info("Telegram Bot successfully started with strictly separated modes!");
