import { Bot } from "grammy";
import http from "http";

import { config, assertRequiredConfig } from "./env.js";
import { connectDB } from "./connect.js";
import { logger } from "./logger.js";

import { startCommand } from "./start.js";
import { helpCommand } from "./help.js";
import { languageCommand, languageCallback } from "./language.js";
import { cleanCommand } from "./clean.js";
import { historyCommand } from "./history.js";
import { muammoCommand } from "./feedback.js";
import { grantCommand } from "./adminGrant.js";
import { chatHandler } from "./chat.js";
import { mainMenuKeyboard } from "./mainMenu.js";
import { getOrCreateUser } from "./userService.js";
import { ensureLanguage, User } from "./models/User.js";
import { Memory } from "./models/Memory.js";
import { queryAI } from "./aiService.js";

assertRequiredConfig();
await connectDB();

const bot = new Bot(config.botToken);

// Render serverini ushlab turish
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

// ================= KLAVIATURALAR VA MENYULAR (7 TA OYNA) =================

// Asosiy Menyu (5 ta Bo'lim)
const mainMenuKeyboard = {
  keyboard: [
    [{ text: "🌐 AI va Qidiruv" }, { text: "🎥 Media va Yaratish" }],
    [{ text: "💻 Kod va Instrumentlar" }, { text: "🤖 Biznes Avto-javob" }],
    [{ text: "📜 Muloqot Tarixi" }, { text: "✨ Tez kunda (Bo'sh)" }]
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

// 4-Bo'lim Sub-menyusi (Biznes & Mijozlar)
const submenu4Keyboard = {
  keyboard: [
    [{ text: "📞 Kontakt ulashish", request_contact: true }],
    [{ text: "🟢 Yoqish" }, { text: "🔴 O'chirish" }],
    [{ text: "✏️ Matnni Tahrirlash" }, { text: "📋 Mijozlar Tarixi (Biznes)" }],
    [{ text: "🔙 Ortga" }]
  ],
  resize_keyboard: true
};

// ================= START BUYRUG'I =================

bot.command("start", startCommand);
bot.command("help", helpCommand);
bot.command("clean", cleanCommand);
bot.command(["history", "istorya"], historyCommand);
bot.command("muammo", muammoCommand);
bot.command("grant", grantCommand);

// ================= ORTGA TUGMASI LOGIKASI =================

bot.hears("🔙 Ortga", async (ctx) => {
  await ctx.reply("🏠 **Asosiy menyuga qaytdingiz:**", { reply_markup: mainMenuKeyboard });
});

// ================= BO'LIM 1: AI VA QIDIRUV =================

bot.hears("🌐 AI va Qidiruv", async (ctx) => {
  await ctx.reply("🌐 **AI va Qidiruv bo'limi:**\nKerakli xizmatni tanlang:", { reply_markup: submenu1Keyboard });
});

bot.hears("🤖 AI Chat", async (ctx) => {
  await ctx.reply("🤖 **AI Chat rejimi faol!**\nSizni qiziqtirgan har qanday savolni yozib yuboring:", { reply_markup: submenu1Keyboard });
});

bot.hears("🔍 Internet Qidiruv", async (ctx) => {
  await ctx.reply("🔍 **Internet Qidiruv:**\nNimani qidirmoqchisiz? Kalit so'z yoki savolingizni yuboring:", { reply_markup: submenu1Keyboard });
});

bot.hears("🎬 Kino Topish", async (ctx) => {
  await ctx.reply("🎬 **Kino Topish:**\nQaysi kino yoki serialni qidiryapsiz? Nomini yozing:", { reply_markup: submenu1Keyboard });
});

// ================= BO'LIM 2: MEDIA VA YARATISH =================

bot.hears("🎥 Media va Yaratish", async (ctx) => {
  await ctx.reply("🎥 **Media va Yaratish bo'limi:**\nKerakli xizmatni tanlang:", { reply_markup: submenu2Keyboard });
});

bot.hears("🎨 Rasm Yaratish", async (ctx) => {
  await ctx.reply("🎨 **Rasm Yaratish:**\nYaratilishi kerak bo'lgan rasm tasvirini batafsil yozib yuboring:", { reply_markup: submenu2Keyboard });
});

bot.hears("🖼 Rasm va Video O'qish", async (ctx) => {
  await ctx.reply("🖼 **Rasm va Video O'qish:**\nMenga rasm yoki video yuboring, uni tahlil qilib beraman.", { reply_markup: submenu2Keyboard });
});

bot.hears("🔴 Dumaloq Video", async (ctx) => {
  await ctx.reply("🔴 **Dumaloq Video (`video_note`):**\nMenga oddiy video yuboring, uni dumaloq shaklga o'tkazib beraman.", { reply_markup: submenu2Keyboard });
});

bot.hears("🔗 Link orqali Yuklash", async (ctx) => {
  await ctx.reply("🔗 **Media Yuklovchi:**\nRasm yoki video havolasini (linkini) yuboring, uni yuklab beraman.", { reply_markup: submenu2Keyboard });
});

// ================= BO'LIM 3: KOD VA INSTRUMENTLAR =================

bot.hears("💻 Kod va Instrumentlar", async (ctx) => {
  await ctx.reply("💻 **Kod va Instrumentlar bo'limi:**\nKerakli vositani tanlang:", { reply_markup: submenu3Keyboard });
});

bot.hears("💻 Kod Yozish", async (ctx) => {
  await ctx.reply("💻 **Kod Yozish Assistent:**\nQaysi tilda va qanday vazifa uchun kod yozish kerakligini ayting:", { reply_markup: submenu3Keyboard });
});

bot.hears("🧠 Claude AI", async (ctx) => {
  await ctx.reply("🧠 **Claude AI Rejimi:**\nClaude AI modeli orqali chuqur tahlil va muloqot qilish uchun savol yuboring:", { reply_markup: submenu3Keyboard });
});

bot.hears("📁 Fayl O'qish", async (ctx) => {
  await ctx.reply("📁 **Fayl Tahlilchisi:**\nHujjat, kod fayli yoki matnli fayl tashlang, uni o'qib tushuntirib beraman.", { reply_markup: submenu3Keyboard });
});

bot.hears("🌐 Tarjima", async (ctx) => {
  await ctx.reply("🌐 **Tarjimon:**\nTarjima qilinishi kerak bo'lgan matnni va qaysi tilga o'girish kerakligini yuboring:", { reply_markup: submenu3Keyboard });
});

bot.hears("🎮 Mod Oyunlar", async (ctx) => {
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

    const memories = await Memory.find({ telegramId: userId, content: { $regex: /Mijoz ID/ } }).sort({ createdAt: -1 });

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

// ================= BO'LIM 6: TEZ KUNDA =================

bot.hears("✨ Tez kunda (Bo'sh)", async (ctx) => {
  await ctx.reply("✨ Hali bo'sh", { reply_markup: mainMenuKeyboard });
});

// ================= KONTAKT VA MEDIA HANDLERLAR =================

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

// ================= MATNLI XABARLAR VA CHAT HANDLER =================

bot.on("message:text", async (ctx, next) => {
  try {
    const userId = ctx.from.id;
    const user = await User.findOne({ telegramId: userId });

    if (user && user.waitingForInstruction) {
      user.businessInstruction = ctx.message.text;
      user.waitingForInstruction = false;
      user.autoReplyActive = true;
      await user.save();

      await ctx.reply(`✅ **Avto-javob matningiz saqlandi va yoqildi!**\n\nYangi matn:\n"${ctx.message.text}"`, { reply_markup: mainMenuKeyboard });
      return;
    }
  } catch (error) {
    logger.error(`Instruction text error: ${error.message}`);
  }

  return next();
}, chatHandler);

bot.catch((err) => {
  logger.error(`Global Bot Error: ${err.message}`);
  const ctx = err.ctx;
  if (ctx) {
    ctx.reply("🙏 Tizimda xatolik yuz berdi.", { reply_markup: mainMenuKeyboard }).catch(() => {});
  }
});

bot.start();
logger.info("Telegram Bot successfully started with all 7 sections restored!");
