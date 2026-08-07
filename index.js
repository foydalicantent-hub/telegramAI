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
import { queryAI } from "./aiService.js";

assertRequiredConfig();
await connectDB();

const bot = new Bot(config.botToken);

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running!");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`HTTP server is listening on port ${PORT}`);
});

await bot.api.setMyCommands([
  { command: "start", description: "Botni ishga tushirish" },
  { command: "help", description: "Yordam va ko'rsatmalar" },
  { command: "clean", description: "Muloqot tarixini tozalash" },
  { command: "history", description: "Mijozlar tarixi" },
]);

bot.command("start", startCommand);
bot.command("help", helpCommand);
bot.command("language", languageCommand);
bot.command("clean", cleanCommand);
bot.command("muammo", muammoCommand);
bot.command("grant", grantCommand);

// 6 ta asosiy tugmali menyu
const customMainMenu = {
  keyboard: [
    [{ text: "🌐 AI, Qidiruv va Tarjima" }],
    [{ text: "⚙️ Sozlamalar va Tarix" }, { text: "🎥 Media va Yaratish" }],
    [{ text: "🤖 Biznes Avto-javob" }, { text: "💻 Kod va Claude AI" }],
    [{ text: "✨ Tez kunda (Bo'sh)" }]
  ],
  resize_keyboard: true
};

bot.hears("🔙 Asosiy menyu", async (ctx) => {
  await ctx.reply("🏠 Asosiy menyudasiz. Kerakli bo'limni tanlang:", { reply_markup: customMainMenu });
});

// 1-TUGMA: AI chat, internet qidiruv, tarjima va kino qidirish
bot.hears("🌐 AI, Qidiruv va Tarjima", async (ctx) => {
  await ctx.reply(
    "🌐 **AI, Qidiruv va Tarjima bo'limi**\n\n" +
    "• AI chat orqali istalgan savolga javob oling\n" +
    "• Internetdan ma'lumot qidiring\n" +
    "• Tarjima qiling\n" +
    "• Kino qidiring va toping\n\n" +
    "📝 Menga istalgan matn yoki so'rov yuboring:",
    { parse_mode: "Markdown", reply_markup: customMainMenu }
  );
});

// 2-TUGMA: Sozlamalar, muloqot tarixi, bot haqida va savollarga javoblar
bot.hears("⚙️ Sozlamalar va Tarix", async (ctx) => {
  await ctx.reply(
    "⚙️ **Sozlamalar va Muloqot Tarixi**\n\nKerakli bo'limni tanlang:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [
          [{ text: "📜 Mijozlar tarixi (/history)" }, { text: "🤖 Bot haqida" }],
          [{ text: "❓ Bot haqida savollar va javoblar" }, { text: "🔙 Asosiy menyu" }]
        ],
        resize_keyboard: true
      }
    }
  );
});

bot.hears("📜 Mijozlar tarixi (/history)", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const memories = await Memory.find({ telegramId: userId, content: { $regex: /Mijoz ID/ } }).sort({ createdAt: -1 });

    if (!memories || memories.length === 0) {
      await ctx.reply("📂 Hozircha sizga kontakt yuborib murojaat qilgan mijozlar tarixi yo'q.", { reply_markup: customMainMenu });
      return;
    }

    const uniqueClients = new Map();
    memories.forEach(m => {
      const match = m.content.match(/Mijoz ID: (\d+)/);
      const nameMatch = m.content.match(/Ism: ([^\]]+)/);
      if (match && match[1]) {
        const clientId = match[1];
        const clientName = nameMatch ? nameMatch[1].trim() : "Noma'lum";
        if (!uniqueClients.has(clientId)) {
          uniqueClients.set(clientId, { name: clientName, clientId: clientId, date: new Date(m.createdAt).toLocaleString() });
        }
      }
    });

    let text = "📋 **Mijozlar tarixi va kontaktlar:**\n\n";
    let index = 1;
    for (const [clientId, info] of uniqueClients) {
      text += `${index}. 👤 **Ism:** ${info.name}\n   🆔 **ID:** <code>${clientId}</code>\n   📅 Oxirgi murojaat: ${info.date}\n\n`;
      index++;
    }
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: customMainMenu });
  } catch (err) {
    logger.error(`History error: ${err.message}`);
    await ctx.reply("❌ Xatolik yuz berdi.", { reply_markup: customMainMenu });
  }
});

bot.hears("🤖 Bot haqida", async (ctx) => {
  await ctx.reply("🤖 **Bot haqida ma'lumot:**\n\nUshbu bot sizning shaxsiy Telegram Business assistentingiz, AI yordamchingiz va media tahrirlovchingiz hisoblanadi.", { parse_mode: "Markdown", reply_markup: customMainMenu });
});

bot.hears("❓ Bot haqida savollar va javoblar", async (ctx) => {
  await ctx.reply("❓ **Bot haqida tez-tez beriladigan savollar:**\n\n1. Avto-javob qanday ishlaydi?\n— Oflayn paytingizda mijoz yozganda birinchi o'zingiz kiritgan matn, keyingilariga AI javob beradi.\n2. Dumaloq video qanday ishlaydi?\n— Media bo'limiga video yuborsangiz video_note formatiga o'tkazib beradi.", { parse_mode: "Markdown", reply_markup: customMainMenu });
});

// 3-TUGMA: Dumaloq video qilish, rasm o'qish, video o'qish va rasm yaratish
bot.hears("🎥 Media va Yaratish", async (ctx) => {
  await ctx.reply(
    "🎥 **Media va Yaratish bo'limi**\n\n" +
    "• Video yuborsangiz — **Dumaloq video** qilib beradi\n" +
    "• Rasm yuborsangiz — **Rasm o'qish va tahlil qilish** ishlaydi\n" +
    "• Video yuborsangiz — **Video o'qish** ishlaydi\n" +
    "• Rasm yaratish so'rovlarini yuborishingiz mumkin\n\n" +
    "👇 Marhamat, rasm yoki video yuboring:",
    { parse_mode: "Markdown", reply_markup: customMainMenu }
  );
});

// 4-TUGMA: Avto javob sozlash (yoqish, o'chirish, kiritilgan matnni tahrirlash)
bot.hears("🤖 Biznes Avto-javob", async (ctx) => {
  await ctx.reply(
    "🤖 **Telegram Business Avto-javob Sozlamalari**\n\n" +
    "Bu bo'limda avto-javobni yoqishingiz, o'chirishingiz, xabaringizni tahrirlashingiz (o'zgartirishingiz) va kontakt ulashingiz mumkin.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [
          [{ text: "🟢 Avto-javobni yoqish" }, { text: "🔴 Avto-javobni o'chirish" }],
          [{ text: "✏️ Xabarni tahrirlash (Matnni o'zgartirish)" }],
          [{ text: "📞 Kontaktni ulashish", request_contact: true }],
          [{ text: "🔙 Asosiy menyu" }]
        ],
        resize_keyboard: true
      }
    }
  );
});

bot.hears("🟢 Avto-javobni yoqish", async (ctx) => {
  try {
    let user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) { user = await User.create({ telegramId: ctx.from.id, autoReplyActive: true }); }
    else { user.autoReplyActive = true; await user.save(); }
    await ctx.reply("✅ **Avto-javob yoqildi!**", { parse_mode: "Markdown", reply_markup: customMainMenu });
  } catch (err) { logger.error(err.message); }
});

bot.hears("🔴 Avto-javobni o'chirish", async (ctx) => {
  try {
    let user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) { user = await User.create({ telegramId: ctx.from.id, autoReplyActive: false }); }
    else { user.autoReplyActive = false; await user.save(); }
    await ctx.reply("❌ **Avto-javob o'chirildi!**", { parse_mode: "Markdown", reply_markup: customMainMenu });
  } catch (err) { logger.error(err.message); }
});

bot.hears("✏️ Xabarni tahrirlash (Matnni o'zgartirish)", async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { waitingForInstruction: true }, { upsert: true });
  await ctx.reply("📝 Mijozlarga birinchi bo'lib yuboriladigan yangi matningizni yuboring (Masalan: *Bandman, keyinroq yozaman*):", { parse_mode: "Markdown", reply_markup: customMainMenu });
});

// 5-TUGMA: Kod yozish, fayl tashlab o'qish/tushuntirish va Claude AI
bot.hears("💻 Kod va Claude AI", async (ctx) => {
  await ctx.reply(
    "💻 **Kod va Claude AI bo'limi**\n\n" +
    "• Dasturlash kodlarini yozdirishingiz\n" +
    "• Fayl tashlab o'qitishingiz va tahlil qildirishingiz\n" +
    "• Kodlarni tushuntirib berishni so'rashingiz\n" +
    "• Claude AI imkoniyatlaridan foydalanishingiz mumkin.\n\n" +
    "📝 Savolingizni, kodingizni yoki faylingizni yuboring:",
    { parse_mode: "Markdown", reply_markup: customMainMenu }
  );
});

// 6-TUGMA: Hali bo'sh
bot.hears("✨ Tez kunda (Bo'sh)", async (ctx) => {
  await ctx.reply("✨ Hali bo'sh", { parse_mode: "Markdown", reply_markup: customMainMenu });
});

// Kontakt qabul qilish
bot.on("message:contact", async (ctx) => {
  const contact = ctx.message.contact;
  if (contact && contact.phone_number) {
    await User.findOneAndUpdate({ telegramId: ctx.from.id }, { phoneNumber: contact.phone_number, autoReplyActive: true }, { upsert: true });
    await ctx.reply("✅ Telefon raqamingiz saqlandi va avto-javob faollashtirildi!", { reply_markup: customMainMenu });
  }
});

// Dumaloq video qilish
bot.on("message:video", async (ctx) => {
  try {
    const waitMsg = await ctx.reply("🔄 Video dumaloq shaklga keltirilmoqda...", { reply_markup: customMainMenu });
    try {
      await ctx.replyWithVideoNote(ctx.message.video.file_id);
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
    } catch (err) {
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      await ctx.replyWithVideo(ctx.message.video.file_id);
    }
  } catch (error) {
    logger.error(`Video handler error: ${error.message}`);
  }
});

// Rasm o'qish va tahlil
bot.on("message:photo", async (ctx) => {
  await ctx.reply("🖼 Rasmingiz qabul qilindi va tahlil qilinmoqda.", { reply_markup: customMainMenu });
});

// Biznes xabarlar (Maksimal 5 marta AI javobi)
bot.on("business_message", async (ctx) => {
  try {
    const message = ctx.businessMessage;
    const text = message.text;
    const senderId = message.from ? message.from.id : null;
    const senderName = message.from ? `${message.from.first_name || ""} ${message.from.last_name || ""}`.trim() : "Noma'lum";

    if (!text || !senderId) return;

    let owner = await User.findOne({ businessConnectionId: message.business_connection_id });
    if (!owner) {
      owner = await User.findOne({ businessConnectionId: { $exists: true, $ne: "" } }).sort({ updatedAt: -1 });
    }

    if (!owner || owner.autoReplyActive === false) return;
    if (message.from && message.from.id === owner.telegramId) return;
    if (message.is_outgoing) return;

    const replyCount = await Memory.countDocuments({ telegramId: owner.telegramId, role: "assistant", content: { $regex: `\\[Mijoz ID: ${senderId}\\]` } });
    if (replyCount >= 5) return;

    let finalReply = "";
    if (replyCount === 0) {
      finalReply = owner.businessInstruction || "Bandman tel qiling";
    } else {
      const systemPrompt = `Sen Telegram foydalanuvchisining shaxsiy biznes assistentisan. Akaunt egasi hozir band. Tabiiy javob ber.`;
      const promptMessages = [{ role: "system", content: systemPrompt }, { role: "user", content: text }];
      finalReply = await queryAI(promptMessages, "uz") || "Tushunarli, tez orada bog'lanamiz.";
    }

    await Memory.create({ telegramId: owner.telegramId, role: "assistant", content: `[Mijoz ID: ${senderId}] [Ism: ${senderName}] ${finalReply}` });
    await ctx.reply(finalReply, { business_connection_id: message.business_connection_id });

    await bot.api.sendMessage(
      owner.telegramId,
      `💬 **Yozishuv:**\n👤 Mijoz: ${senderName} (ID: <code>${senderId}</code>)\n📥 U yozdi: "${text}"\n📤 Javob: "${finalReply}"`,
      { parse_mode: "HTML" }
    ).catch(() => {});
  } catch (error) {
    logger.error(`Business message error: ${error.message}`);
  }
});

// Matnli xabarlar va tahrirlash (instruktsiya kiritish) rejimi
bot.on("message:text", async (ctx, next) => {
  try {
    const userId = ctx.from.id;
    const user = await User.findOne({ telegramId: userId });

    if (user && user.waitingForInstruction) {
      user.businessInstruction = ctx.message.text;
      user.waitingForInstruction = false;
      user.autoReplyActive = true;
      await user.save();

      await ctx.reply(`✅ **Avto-javob matningiz saqlandi va yoqildi!**\n\nYangi matn:\n"${ctx.message.text}"`, { parse_mode: "Markdown", reply_markup: customMainMenu });
      return;
    }
  } catch (error) {
    logger.error(`Text handler error: ${error.message}`);
  }

  return next();
}, chatHandler);

bot.catch((err) => {
  logger.error(`Global Bot Error: ${err.message}`);
  const ctx = err.ctx;
  if (ctx) {
    ctx.reply("🙏 Tizimda xatolik yuz berdi.", { reply_markup: customMainMenu }).catch(() => {});
  }
});

bot.start();
logger.info("Telegram AI Bot started");
