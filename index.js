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
import { mainMenuKeyboard } from "./mainMenu.js";
import { getOrCreateUser } from "./userService.js";
import { ensureLanguage, User } from "./User.js";
import { Memory } from "./Memory.js";
import { queryAI } from "./aiService.js";

assertRequiredConfig();
await connectDB();

const bot = new Bot(config.botToken);

// Render port xatoligini oldini olish uchun HTTP server
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
  { command: "history", description: "Kontakt yuborgan mijozlar tarixi" },
  { command: "about", description: "Bot haqida ma'lumot" },
  { command: "muammo", description: "Nosozlik haqida xabar berish" },
  { command: "avto_telefon", description: "Avto-javob sozlash haqida" },
]);

bot.command("start", startCommand);
bot.command("help", helpCommand);
bot.command("language", languageCommand);
bot.command("clean", cleanCommand);
bot.command("muammo", muammoCommand);
bot.command("grant", grantCommand);

// 📋 /HISTORY BUYRUG'I (Faqat kontakt ulashgan mijozlar ro'yxati)
bot.command(["history", "istorya"], async (ctx) => {
  try {
    const userId = ctx.from.id;
    
    const memories = await Memory.find({ 
      telegramId: userId, 
      content: { $regex: /Mijoz ID/ } 
    }).sort({ createdAt: -1 });

    if (!memories || memories.length === 0) {
      await ctx.reply("📂 Hozircha sizga kontakt yuborib murojaat qilgan mijozlar tarixi yo'q.", { reply_markup: mainMenuKeyboard });
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
          uniqueClients.set(clientId, {
            name: clientName,
            clientId: clientId,
            date: new Date(m.createdAt).toLocaleString()
          });
        }
      }
    });

    let text = "📋 **Mijozlar tarixi va kontaktlar:**\n\n";
    let index = 1;

    for (const [clientId, info] of uniqueClients) {
      text += `${index}. 👤 **Ism:** ${info.name}\n`;
      text += `   🆔 **ID:** <code>${clientId}</code>\n`;
      text += `   📅 Oxirgi murojaat: ${info.date}\n\n`;
      index++;
    }

    await ctx.reply(text, { parse_mode: "HTML", reply_markup: mainMenuKeyboard });
  } catch (err) {
    logger.error(`History command error: ${err.message}`);
    await ctx.reply("❌ Tarixni olishda xatolik yuz berdi.", { reply_markup: mainMenuKeyboard });
  }
});

bot.command("about", async (ctx) => {
  await ctx.reply(
    "🤖 **Bot Haqida Ma'lumot**\n\nUshbu bot sizga AI muloqot, kino va internet qidiruv hamda Telegram Biznes assistent xizmatlarini taqdim etadi.",
    { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
  );
});

bot.command("avto_telefon", async (ctx) => {
  await ctx.reply(
    "📱 **Avto-telefon va avto-javob sozlash bo'yicha ma'lumot:**\n\n" +
    "Bu bot orqali Telegram Business orqali kelgan xabarlarga avtomatik javob qaytarish va telefon raqam / lokatsiyangizni ulashish imkoniyati mavjud.\n\n" +
    "Sozlash uchun quyidagi tugmalardan foydalaning.",
    { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
  );
});

bot.callbackQuery(/^lang_/, languageCallback);

// 🟢 AVTO-JAVOBNI YOQISH TUGMASI
bot.hears("🟢 Avto-javobni yoqish", async (ctx) => {
  try {
    const userId = ctx.from.id;
    let user = await User.findOne({ telegramId: userId });
    
    if (!user) {
      user = await User.create({ telegramId: userId, autoReplyActive: true });
    } else {
      user.autoReplyActive = true;
    }
    await user.save();

    await ctx.reply(
      "✅ **Avto-javob yoqildi!**\n\nOflayn paytingizda mijozlarga avval sizning xabaringiz, keyingilariga esa AI (maksimal 5 marta) javob beradi.",
      { 
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [
            [{ text: "📞 Avto-javob sozlash (Kontakt yuborish)" }],
            [{ text: "🔴 Avto-javobni o'chirish" }],
            [{ text: "🔙 Asosiy menyu" }]
          ],
          resize_keyboard: true
        }
      }
    );
  } catch (err) {
    logger.error(`Auto reply turn on error: ${err.message}`);
  }
});

// 🔴 AVTO-JAVOBNI O'CHIRISH TUGMASI
bot.hears("🔴 Avto-javobni o'chirish", async (ctx) => {
  try {
    const userId = ctx.from.id;
    let user = await User.findOne({ telegramId: userId });
    
    if (!user) {
      user = await User.create({ telegramId: userId, autoReplyActive: false });
    } else {
      user.autoReplyActive = false;
    }
    await user.save();

    await ctx.reply(
      "❌ **Avto-javob o'chirildi!**\n\nEndi bot mijozlarga avtomatik javob bermaydi.",
      { 
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [
            [{ text: "📞 Avto-javob sozlash (Kontakt yuborish)" }],
            [{ text: "🟢 Avto-javobni yoqish" }],
            [{ text: "🔙 Asosiy menyu" }]
          ],
          resize_keyboard: true
        }
      }
    );
  } catch (err) {
    logger.error(`Auto reply turn off error: ${err.message}`);
  }
});

// 📞 AVTO-JAVOB SOZLASH MENU
bot.hears("📞 Avto-javob sozlash (Kontakt yuborish)", async (ctx) => {
  await ctx.reply(
    "📞 Telegram Business avto-javobni sozlash uchun iltimos, pastdagi **📞 Kontaktni ulashish** tugmasini bosing:",
    {
      reply_markup: {
        keyboard: [
          [{ text: "📞 Kontaktni ulashish", request_contact: true }],
          [{ text: "🟢 Avto-javobni yoqish" }, { text: "🔴 Avto-javobni o'chirish" }],
          [{ text: "🔙 Asosiy menyu" }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    }
  );
});

// 📞 KONTAKTNI QABUL QILIB OLISH VA XABARNI SO'RASH
bot.on("message:contact", async (ctx) => {
  try {
    const contact = ctx.message.contact;
    const userId = ctx.from.id;

    if (contact && contact.phone_number) {
      await User.findOneAndUpdate(
        { telegramId: userId },
        { 
          phoneNumber: contact.phone_number,
          waitingForInstruction: true,
          autoReplyActive: true
        },
        { upsert: true, new: true }
      );

      await ctx.reply(
        "✅ **Raqamingiz qabul qilindi!**\n\n📝 Endi menga boshqalarga yuborishim kerak bo'lgan **o'zingizning xabaringizni (masalan: Bandman tel qiling)** yuboring:",
        { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
      );
    }
  } catch (err) {
    logger.error(`Contact save error: ${err.message}`);
  }
});

// 📍 Lokatsiyani saqlash
bot.on("message:location", async (ctx) => {
  try {
    const loc = ctx.message.location;
    const userId = ctx.from.id;

    if (loc) {
      const mapsUrl = `https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}&ll=${loc.latitude},${loc.longitude}&z=16`;
      
      await User.findOneAndUpdate(
        { telegramId: userId },
        { 
          businessLocation: mapsUrl,
          businessInstruction: `Men ishdaman kim soʻrasa shu raqamga tel qilsin 956999008. Turgan joyim: ${mapsUrl}`,
          autoReplyActive: true
        },
        { upsert: true, new: true }
      );

      await ctx.reply(
        "📍 **Lokatsiyangiz va avto-javobingiz yangilandi!**",
        { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
      );
    }
  } catch (err) {
    logger.error(`Location save error: ${err.message}`);
  }
});

// Biznes ulanishni saqlash
bot.on("business_connection", async (ctx) => {
  try {
    const conn = ctx.businessConnection;
    let user = await User.findOne({ telegramId: conn.user.id });
    if (user) {
      user.businessConnectionId = conn.id;
      await user.save();
      logger.info(`Biznes ulandi: User ID ${conn.user.id}, Connection ID: ${conn.id}`);
    } else {
      await User.create({
        telegramId: conn.user.id,
        businessConnectionId: conn.id,
        autoReplyActive: true
      });
      logger.info(`Biznes yangi user bilan ulandi: User ID ${conn.user.id}`);
    }
  } catch (err) {
    logger.error(`Business connection error: ${err.message}`);
  }
});

// Biznes xabarlarga javob berish (Maksimal 5 marta javob yozadi)
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

    if (!owner || owner.autoReplyActive === false) {
      return;
    }

    if (message.from && message.from.id === owner.telegramId) {
      return;
    }

    if (message.is_outgoing) {
      return;
    }

    const replyCount = await Memory.countDocuments({ 
      telegramId: owner.telegramId, 
      role: "assistant", 
      content: { $regex: `\\[Mijoz ID: ${senderId}\\]` } 
    });

    if (replyCount >= 5) {
      return;
    }

    let finalReply = "";

    if (replyCount === 0) {
      finalReply = owner.businessInstruction || "Bandman tel qiling";
    } else {
      const lang = ensureLanguage(owner);
      const phoneText = owner.phoneNumber ? ` Telefon raqami: ${owner.phoneNumber}.` : "";
      const locationText = owner.businessLocation ? ` Turgan joyi: ${owner.businessLocation}.` : "";

      const systemPrompt = `Sen Telegram foydalanuvchisining shaxsiy biznes assistentisan. Akaunt egasi hozir band.
Akaunt egasining ma'lumotlari:
- Telefon raqami:${phoneText}
- Turgan joyi:${locationText}

QOIDALAR:
1. Mijozning keyingi xabarlariga qarab AI yordamida muloqotni tabiiy davom ettir.
2. HECH QACHON o'zingni sun'iy intellekt, dastur yoki bot deb tanishtirma.`;

      const promptMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ];

      finalReply = await queryAI(promptMessages, lang) || "Tushunarli, tez orada bog'lanamiz.";
    }

    await Memory.create({ 
      telegramId: owner.telegramId, 
      role: "assistant", 
      content: `[Mijoz ID: ${senderId}] [Ism: ${senderName}] ${finalReply}` 
    });

    await ctx.reply(finalReply, {
      business_connection_id: message.business_connection_id,
    });

  } catch (error) {
    logger.error(`Business message handler error: ${error.message}`);
  }
});

// MEDIA HANDLERS
bot.on("message:photo", async (ctx) => {
  try {
    const photo = ctx.message.photo.pop();
    await ctx.replyWithPhoto(photo.file_id, {
      caption: "🖼 Siz yuborgan rasm",
      reply_markup: mainMenuKeyboard,
    });
  } catch (error) {
    logger.error(`Photo handler error: ${error.message}`);
  }
});

// VIDEO HANDLER (Dumaloq video qilish)
bot.on("message:video", async (ctx) => {
  try {
    const user = await getOrCreateUser(ctx);
    const waitMsg = await ctx.reply("🔄 Video dumaloq shaklga keltirilmoqda...", { reply_markup: mainMenuKeyboard });
    
    try {
      const video = ctx.message.video;
      await ctx.replyWithVideoNote(video.file_id);
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
    } catch (err) {
      logger.error(`Video note error: ${err.message}`);
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      await ctx.reply(
        "⚠️ Telegram qoidalariga ko'ra har qanday videoni dumaloq qilib bo'lmaydi (video kvadrat shaklida bo'lishi kerak). Videongiz oddiy formatda yuborildi:", 
        { reply_markup: mainMenuKeyboard }
      );
      await ctx.replyWithVideo(ctx.message.video.file_id);
    }
  } catch (error) {
    logger.error(`Video handler error: ${error.message}`);
  }
});

// MATNNI QABUL QILISH VA KUTISH REJIMI
bot.on("message:text", async (ctx, next) => {
  try {
    const userId = ctx.from.id;
    const user = await User.findOne({ telegramId: userId });

    if (user && user.waitingForInstruction) {
      user.businessInstruction = ctx.message.text;
      user.waitingForInstruction = false;
      user.autoReplyActive = true; 
      await user.save();

      await ctx.reply(
        `✅ **Avto-javob xabaringiz muvaffaqiyatli saqlandi va yoqildi!**\n\nSiz yozgan matn:\n"${ctx.message.text}"\n\nEndi mijozga 1-marta shu matn, keyingilariga AI (maksimal 5 marta) javob beradi.`,
        { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
      );
      return;
    }
  } catch (error) {
    logger.error(`Instruction text handler error: ${error.message}`);
  }

  return next();
}, chatHandler);

bot.catch((err) => {
  logger.error(`Global Bot Error: ${err.message}`);
  const ctx = err.ctx;
  if (ctx) {
    ctx.reply("🙏 Tizimda kutilmagan nosozlik yuz berdi.", { reply_markup: mainMenuKeyboard }).catch(() => {});
  }
});

bot.start();
logger.info("Telegram AI Bot started");
