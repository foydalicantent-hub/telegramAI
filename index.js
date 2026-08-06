import { Bot } from "grammy";

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

// 📱 AVTO-TELEFON VA AVTO-JAVOB SOZLASH HAQIDA MA'LUMOT
bot.command("avto_telefon", async (ctx) => {
  await ctx.reply(
    "📱 **Avto-telefon va avto-javob sozlash bo'yicha ma'lumot:**\n\n" +
    "Bu bot orqali Telegram Business orqali kelgan xabarlarga avtomatik javob qaytarish va telefon raqam / lokatsiyangizni ulashish imkoniyati mavjud.\n\n" +
    "Sozlash uchun menyudagi **📞 Avto-javob sozlash (Kontakt yuborish)** tugmasini bosing va ko'rsatmalarga amal qiling.",
    { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
  );
});

bot.callbackQuery(/^lang_/, languageCallback);

// 📞 FAKAT TUGMA BOSILGANDagina KONTAKT SO'RASH
bot.hears("📞 Avto-javob sozlash (Kontakt yuborish)", async (ctx) => {
  await ctx.reply(
    "📞 Telegram Business avto-javobni sozlash uchun iltimos, pastdagi **📞 Kontaktni ulashish** tugmasini bosing:",
    {
      reply_markup: {
        keyboard: [[{ text: "📞 Kontaktni ulashish", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
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
          waitingForInstruction: true
        },
        { upsert: true, new: true }
      );

      await ctx.reply(
        "✅ **Raqamingiz qabul qilindi!**\n\n📝 Endi menga boshqalarga yuborishim kerak bo'lgan **o'zingizning xabaringizni (matningizni) yuboring**:",
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
          businessInstruction: `Men ishdaman kim soʻrasa shu raqamga tel qilsin 956999008. Turgan joyim (lokatsiyam): ${mapsUrl}`
        },
        { upsert: true, new: true }
      );

      await ctx.reply(
        "📍 **Lokatsiyangiz va avto-javobingiz yangilandi!**\n\nKimdir sizni so'rasa, bot ishdaligingizni aytib, lokatsiyani ham yuboradi.",
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
      });
      logger.info(`Biznes yangi user bilan ulandi: User ID ${conn.user.id}`);
    }
  } catch (err) {
    logger.error(`Business connection error: ${err.message}`);
  }
});

// Biznes xabarlarga javob berish (Faqat o'zingiz kiritgan avto-javob matnini yuboradi)
bot.on("business_message", async (ctx) => {
  try {
    const message = ctx.businessMessage;
    const text = message.text;

    if (!text) return;

    let owner = await User.findOne({ businessConnectionId: message.business_connection_id });
    if (!owner) {
      owner = await User.findOne({ businessConnectionId: { $exists: true, $ne: "" } }).sort({ updatedAt: -1 });
    }

    if (message.from && owner && message.from.id === owner.telegramId) {
      return;
    }

    // Faqat o'zingiz kiritgan avto-javob matnini olamiz (masalan: "Men bandman")
    const baseInstruction = owner?.businessInstruction ? owner.businessInstruction : "Salom! Hozir bandman.";

    let finalReply = baseInstruction;

    if (owner) {
      await Memory.create({
        telegramId: owner.telegramId,
        role: "user",
        content: `[Mijoz]: ${text}`
      });
      await Memory.create({
        telegramId: owner.telegramId,
        role: "assistant",
        content: `[Avto-javob]: ${finalReply}`
      });
    }

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
        await ctx.reply(
          "ℹ️ Videongiz Telegram Video formatida yuborildi:",
          { reply_markup: mainMenuKeyboard }
        );
        await ctx.replyWithVideo(ctx.message.video.file_id);
      }

      user.mode = "ai";
      await user.save();
      return;
    }

    await ctx.replyWithVideo(ctx.message.video.file_id, {
      caption: "📹 Siz yuborgan video",
      reply_markup: mainMenuKeyboard,
    });
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
      await user.save();

      await ctx.reply(
        "✅ **Avto-javob xabaringiz muvaffaqiyatli saqlandi!**",
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
    ctx.reply("🙏 Sizga yetkazilgan noqulaylik uchun uzr so'raymiz! Tizimda kutilmagan nosozlik yuz berdi.", { reply_markup: mainMenuKeyboard }).catch(() => {});
  }
});

bot.start();

logger.info("Telegram AI Bot started");
