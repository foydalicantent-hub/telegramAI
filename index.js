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
  { command: "history", description: "Suhbatlar tarixini ko'rish" },
  { command: "about", description: "Bot haqida ma'lumot" },
  { command: "muammo", description: "Nosozlik haqida xabar berish" },
  { command: "avto_telefon", description: "Avto-javob sozlash haqida" },
]);

bot.command("start", startCommand);
bot.command("help", helpCommand);
bot.command("language", languageCommand);
bot.command("clean", cleanCommand);
bot.command(["history", "istorya"], historyCommand);
bot.command("muammo", muammoCommand);
bot.command("grant", grantCommand);

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
    "Sozlash uchun menyudagi tugmalardan foydalaning.",
    { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
  );
});

bot.callbackQuery(/^lang_/, languageCallback);

// 📞 AVTO-JAVOBNI YOQISH / O'CHIRISH TUGMASI
bot.hears("🔄 Avto-javobni yoqish/o'chirish", async (ctx) => {
  try {
    const userId = ctx.from.id;
    let user = await User.findOne({ telegramId: userId });
    
    if (!user) {
      user = await User.create({ telegramId: userId, autoReplyActive: true });
    } else {
      user.autoReplyActive = !user.autoReplyActive;
    }
    await user.save();

    const statusText = user.autoReplyActive ? "🟢 YOQILDI (Oflaynsiz, mijozlarga javob beradi)" : "🔴 O'CHIRILDI (Bot mijozlarga javob bermaydi)";
    await ctx.reply(`Avto-javob holati o'zgartirildi:\n\n${statusText}`, { reply_markup: mainMenuKeyboard });
  } catch (err) {
    logger.error(`Auto reply toggle error: ${err.message}`);
  }
});

// 📞 FAKAT TUGMA BOSILGANDagina KONTAKT SO'RASH
bot.hears("📞 Avto-javob sozlash (Kontakt yuborish)", async (ctx) => {
  await ctx.reply(
    "📞 Telegram Business avto-javobni sozlash uchun iltimos, pastdagi **📞 Kontaktni ulashish** tugmasini bosing:",
    {
      reply_markup: {
        keyboard: [
          [{ text: "📞 Kontaktni ulashish", request_contact: true }],
          [{ text: "🔄 Avto-javobni yoqish/o'chirish" }],
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
        "✅ **Raqamingiz qabul qilindi!**\n\n📝 Endi menga boshqalarga yuborishim kerak bo'lgan **o'zingizning xabaringizni (masalan: Men bandman soat 22:00 da yozing)** yuboring:",
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

// Biznes xabarlarga javob berish
bot.on("business_message", async (ctx) => {
  try {
    const message = ctx.businessMessage;
    const text = message.text;

    if (!text) return;

    let owner = await User.findOne({ businessConnectionId: message.business_connection_id });
    if (!owner) {
      owner = await User.findOne({ businessConnectionId: { $exists: true, $ne: "" } }).sort({ updatedAt: -1 });
    }

    // Agar avto-javob o'chirilgan bo'lsa yoki egasi o'zi yozgan bo'lsa - jim turadi
    if (!owner || owner.autoReplyActive === false) {
      return;
    }

    if (message.from && message.from.id === owner.telegramId) {
      return;
    }

    const lang = ensureLanguage(owner);
    const baseInstruction = owner.businessInstruction ? owner.businessInstruction : "";
    const phoneText = owner.phoneNumber ? ` Telefon raqami: ${owner.phoneNumber}.` : "";
    const locationText = owner.businessLocation ? ` Turgan joyi: ${owner.businessLocation}.` : "";

    const systemPrompt = `Sen Telegram foydalanuvchisining shaxsiy biznes assistentisan.
Akaunt egasining ma'lumotlari:
- Telefon raqami:${phoneText}
- Turgan joyi:${locationText}

QOIDALAR:
1. Mijozning xabariga javob berayotganda, mijozning savoliga qarab AI yordamida muloqotni tabiiy davom ettir.
2. HECH QACHON o'zingni sun'iy intellekt, dastur yoki bot deb tanishtirma.`;

    const promptMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ];

    const aiAnswer = await queryAI(promptMessages, lang);
    
    let finalReply = "";
    if (baseInstruction) {
      finalReply = `${baseInstruction}\n\n${aiAnswer || ""}`.trim();
    } else {
      finalReply = aiAnswer || "Salom! Sizga qanday bera olaman?";
    }

    await Memory.create({ telegramId: owner.telegramId, role: "user", content: `[Mijoz]: ${text}` });
    await Memory.create({ telegramId: owner.telegramId, role: "assistant", content: `[AI Javob]: ${finalReply}` });

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

bot.on("message:video", async (ctx) => {
  try {
    const user = await getOrCreateUser(ctx);
    if (user.mode === "circle") {
      const waitMsg = await ctx.reply("🔄 Video dumaloq shaklga keltirilmoqda...", { reply_markup: mainMenuKeyboard });
      try {
        await ctx.replyWithVideoNote(ctx.message.video.file_id, { reply_markup: mainMenuKeyboard });
        await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      } catch (err) {
        await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
        await ctx.reply("ℹ️ Videongiz Telegram Video formatida yuborildi:", { reply_markup: mainMenuKeyboard });
        await ctx.replyWithVideo(ctx.message.video.file_id);
      }
      user.mode = "ai";
      await user.save();
      return;
    }
    await ctx.replyWithVideo(ctx.message.video.file_id, { caption: "📹 Siz yuborgan video", reply_markup: mainMenuKeyboard });
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
      user.autoReplyActive = true; // Matn kiritilgach avto-javobni faollashtiramiz
      await user.save();

      await ctx.reply(
        `✅ **Avto-javob xabaringiz muvaffaqiyatli saqlandi!**\n\nSiz yozgan matn:\n"${ctx.message.text}"\n\nEndi oflayn paytingizda mijozlarga shu matn yuboriladi.`,
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
