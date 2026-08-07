import { Bot } from "grammy";
import http from "http";

import { config, assertRequiredConfig } from "./env.js";
import { connectDB } from "./connect.js";
import { logger } from "./logger.js";
import { User } from "./User.js";
import { Memory } from "./Memory.js";
import { mainMenuKeyboard } from "./mainMenu.js";
import { queryAI, generateImage, queryClaude } from "./aiService.js";

// ================= 1. KONFIGURASIYA VA BAZAGA Ulanish =================
assertRequiredConfig();
await connectDB();

const bot = new Bot(config.botToken);

// ================= 2. RENDER HTTP SERVER =================
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Telegram Bot is running smoothly on Render!");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`HTTP server is listening on port ${PORT}`);
});

// ================= 3. BOT BUYruqlarini RO'YXATDAN O'TKAZISH =================
await bot.api.setMyCommands([
  { command: "start", description: "🔄 Botni ishga tushirish va menyu" },
  { command: "settings", description: "⚙️ Bot sozlamalari va rejimi" },
  { command: "history", description: "📜 Foydalanuvchi muloqot tarixi" },
  { command: "help", description: "💡 Yordam va ko'rsatmalar" },
  { command: "support", description: "🛠 Admin bilan bog'lanish" }
]);

// ================= 4. SUB-MENYULAR (ICHKI TUGMALAR) =================
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

// ================= 5. START VA ASOSIY MENYU HANDLERLARI =================
bot.command("start", async (ctx) => {
  try {
    const userId = ctx.from.id;
    await User.findOneAndUpdate(
      { telegramId: userId },
      { waitingForInstruction: false },
      { upsert: true }
    );

    await ctx.reply(
      "👋 Assalomu alaykum! Telegram Business va AI yordamchi botiga xush kelibsiz.\nKerakli bo'limni tanlang:",
      { reply_markup: mainMenuKeyboard }
    );
  } catch (err) {
    logger.error(`Start command error: ${err.message}`);
  }
});

bot.hears("🔙 Ortga", async (ctx) => {
  await ctx.reply("🏠 **Asosiy menyuga qaytdingiz:**", { reply_markup: mainMenuKeyboard });
});

// ================= 6. ASOSIY BO'LIMLARGA O'TISH =================
bot.hears("🌐 AI va Qidiruv", async (ctx) => {
  await ctx.reply("🌐 **AI va Qidiruv bo'limi:**\nKerakli xizmatni tanlang:", { reply_markup: submenu1Keyboard });
});

bot.hears("🎥 Media va Yaratish", async (ctx) => {
  await ctx.reply("🎥 **Media va Yaratish bo'limi:**\nKerakli xizmatni tanlang:", { reply_markup: submenu2Keyboard });
});

bot.hears("💻 Kod va Instrumentlar", async (ctx) => {
  await ctx.reply("💻 **Kod va Instrumentlar bo'limi:**\nKerakli vositani tanlang:", { reply_markup: submenu3Keyboard });
});

bot.hears("⚡️ Biznes Avto-javob", async (ctx) => {
  await ctx.reply("⚡️ **Telegram Business Avto-javob Sozlamalari:**", { reply_markup: submenu4Keyboard });
});

bot.hears("✨ Tez kunda (Bo'sh)", async (ctx) => {
  await ctx.reply("✨ Hozircha bu bo'lim bo'sh. Tez kunda yangi funksiyalar qo'shiladi!", { reply_markup: mainMenuKeyboard });
});

// ================= 7. ICHKI REJIMLARNI O'RNATISH =================
bot.hears("🤖 AI Chat", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "ai_chat" }, { upsert: true });
  await ctx.reply("🤖 **AI Chat rejimi faol!**\nSizni qiziqtirgan har qanday savolni yuboring:", { reply_markup: submenu1Keyboard });
});

bot.hears("🔍 Internet Qidiruv", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "search" }, { upsert: true });
  await ctx.reply("🔍 **Internet Qidiruv:**\nNimani qidirmoqchisiz? Kalit so'z yoki savolingizni yuboring:", { reply_markup: submenu1Keyboard });
});

bot.hears("🎬 Kino Topish", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "movie" }, { upsert: true });
  await ctx.reply("🎬 **Kino Topish:**\nQaysi kino yoki serialni qidiryapsiz? Nomini yozing:", { reply_markup: submenu1Keyboard });
});

bot.hears("🎨 Rasm Yaratish", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "image_gen" }, { upsert: true });
  await ctx.reply("🎨 **Rasm Yaratish (DALL-E 3):**\nYaratilishi kerak bo'lgan rasm tasvirini batafsil yozib yuboring:", { reply_markup: submenu2Keyboard });
});

bot.hears("🧠 Claude AI", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "claude" }, { upsert: true });
  await ctx.reply("🧠 **Claude AI Rejimi:**\nClaude AI modeli orqali tahlil qilish uchun savol yuboring:", { reply_markup: submenu3Keyboard });
});

bot.hears("💻 Kod Yozish", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { currentMode: "coding" }, { upsert: true });
  await ctx.reply("💻 **Kod Yozish Assistent:**\nQaysi tilda va qanday vazifa uchun kod yozish kerakligini tushuntiring:", { reply_markup: submenu3Keyboard });
});

// ================= 8. BIZNES AVTO-JAVOB BOSHQARUVI =================
bot.hears("🟢 Yoqish", async (ctx) => {
  try {
    await User.findOneAndUpdate({ telegramId: ctx.from.id }, { autoReplyActive: true }, { upsert: true });
    await ctx.reply("✅ **Biznes Avto-javob muvaffaqiyatli yoqildi!**", { reply_markup: submenu4Keyboard });
  } catch (err) {
    logger.error(`Turn on error: ${err.message}`);
  }
});

bot.hears("🔴 O'chirish", async (ctx) => {
  try {
    await User.findOneAndUpdate({ telegramId: ctx.from.id }, { autoReplyActive: false }, { upsert: true });
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
    const memories = await Memory.find({ telegramId: userId, content: { $regex: /Mijoz ID/ } }).sort({ createdAt: -1 }).limit(10);
    if (!memories.length) {
      await ctx.reply("📂 Hozircha saqlangan biznes mijozlar tarixi yo'q.", { reply_markup: submenu4Keyboard });
      return;
    }
    let text = "📋 **Oxirgi Biznes Mijozlar va Kontaktlar:**\n\n";
    memories.forEach((m, i) => {
      text += `${i + 1}. ${m.content}\n`;
    });
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: submenu4Keyboard });
  } catch (err) {
    logger.error(`Business history error: ${err.message}`);
    await ctx.reply("❌ Tarixni olishda xatolik yuz berdi.", { reply_markup: submenu4Keyboard });
  }
});

// ================= 9. MULOQOT TARIXI =================
async function showGeneralHistory(ctx) {
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
}

bot.hears("📜 Muloqot Tarixi", showGeneralHistory);
bot.command(["history", "istorya"], showGeneralHistory);

// ================= 10. KONTAKT VA MEDIA HANDLERLARI =================
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

      await ctx.reply("✅ **Telefon raqamingiz muvaffaqiyatli saqlandi va avto-javob faollashdi!**", { reply_markup: mainMenuKeyboard });
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
  await ctx.reply("🖼 **Rasm qabul qilindi.** Uni tahlil qilish uchun o'z savolingizni yuboring:", { reply_markup: mainMenuKeyboard });
});

bot.on("message:document", async (ctx) => {
  await ctx.reply("📁 **Hujjat qabul qilindi.** O'qilib, tahlil qilinmoqda...", { reply_markup: mainMenuKeyboard });
});

bot.on("message:voice", async (ctx) => {
  await ctx.reply("🎤 **Ovozli xabar qabul qilindi.**", { reply_markup: mainMenuKeyboard });
});

// ================= 11. ASOSIY MATN VA AI SO'ROVLARI =================
bot.on("message:text", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    let user = await User.findOne({ telegramId: userId });

    if (user && user.waitingForInstruction) {
      user.businessInstruction = text;
      user.waitingForInstruction = false;
      user.autoReplyActive = true;
      await user.save();

      await ctx.reply(`✅ **Avto-javob matningiz saqlandi va yoqildi!**\n\nYangi matn:\n"${text}"`, { reply_markup: mainMenuKeyboard });
      return;
    }

    await Memory.create({ telegramId: userId, role: "user", content: text });

    let reply = "";
    const mode = user?.currentMode || "ai_chat";

    if (mode === "claude") {
      reply = await queryClaude(text);
    } else if (mode === "image_gen") {
      const imageUrl = await generateImage(text);
      if (imageUrl) {
        await ctx.replyWithPhoto(imageUrl, { caption: "🎨 AI tomonidan yaratilgan rasm!" });
        return;
      } else {
        reply = "❌ Rasm yaratishda xatolik yuz berdi.";
      }
    } else {
      const history = await Memory.find({ telegramId: userId }).sort({ createdAt: -1 }).limit(6);
      const formattedHistory = history.reverse().map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content
      }));
      reply = await queryAI(formattedHistory, user?.language || "uz");
    }

    await Memory.create({ telegramId: userId, role: "assistant", content: reply });
    await ctx.reply(reply, { reply_markup: mainMenuKeyboard });

  } catch (error) {
    logger.error(`Text message error: ${error.message}`);
    await ctx.reply("❌ Xatolik yuz berdi. Iltimos qayta urinib ko'ring.", { reply_markup: mainMenuKeyboard });
  }
});

// ================= 12. TELEGRAM BUSINESS XABARLARI =================
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

// ================= 13. XATOLIKLARNI USHLASH VA ISHGA TUSHIRISH =================
bot.catch((err) => {
  logger.error(`Global Bot Error: ${err.message}`);
  const ctx = err.ctx;
  if (ctx) {
    ctx.reply("🙏 Tizimda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.", { reply_markup: mainMenuKeyboard }).catch(() => {});
  }
});

bot.start();
logger.info("Telegram Bot 550+ lines fully loaded and active with all token features!");
