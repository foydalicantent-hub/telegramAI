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

/* =========================================================
   RENDER HTTP SERVER
========================================================= */

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
  });

  res.end("Telegram AI Bot is running!");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`HTTP server is listening on port ${PORT}`);
});

/* =========================================================
   TELEGRAM COMMANDS
========================================================= */

await bot.api.setMyCommands([
  {
    command: "start",
    description: "Botni ishga tushirish",
  },
  {
    command: "help",
    description: "Yordam va ko'rsatmalar",
  },
  {
    command: "clean",
    description: "Muloqot tarixini tozalash",
  },
  {
    command: "history",
    description: "Kontakt yuborgan mijozlar tarixi",
  },
  {
    command: "about",
    description: "Bot haqida ma'lumot",
  },
  {
    command: "muammo",
    description: "Nosozlik haqida xabar berish",
  },
  {
    command: "avto_telefon",
    description: "Avto-javob sozlash haqida",
  },
]);

bot.command("start", startCommand);
bot.command("help", helpCommand);
bot.command("language", languageCommand);
bot.command("clean", cleanCommand);
bot.command("muammo", muammoCommand);
bot.command("grant", grantCommand);

/* =========================================================
   🤖 AI TANLASH MENYUSI
========================================================= */

function aiSelectionKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "⚡ Groq",
          callback_data: "ai:groq",
        },
        {
          text: "🌐 OpenRouter",
          callback_data: "ai:openrouter",
        },
      ],
      [
        {
          text: "✨ Gemini 2.5 Flash",
          callback_data: "ai:gemini",
        },
      ],
      [
        {
          text: "🧠 Claude",
          callback_data: "ai:claude",
        },
        {
          text: "🤖 OpenAI",
          callback_data: "ai:openai",
        },
      ],
      [
        {
          text: "🧩 Cerebras",
          callback_data: "ai:cerebras",
        },
        {
          text: "💬 Cohere",
          callback_data: "ai:cohere",
        },
      ],
      [
        {
          text: "🌍 Mistral",
          callback_data: "ai:mistral",
        },
        {
          text: "🤗 Hugging Face",
          callback_data: "ai:huggingface",
        },
      ],
      [
        {
          text: "🔄 Avtomatik fallback",
          callback_data: "ai:auto",
        },
      ],
    ],
  };
}

/*
   🤖 AI Chat tugmasi bosilganda
   AI tanlash menyusi chiqadi.
*/

bot.hears("🤖 AI Chat", async (ctx) => {
  try {
    const user = await getOrCreateUser(ctx);

    await ctx.reply(
      "🤖 *AI Chat*\n\n" +
        "Qaysi AI bilan suhbatlashmoqchisiz?\n\n" +
        "AI ni tanlang. Keyingi yozgan xabarlaringiz tanlangan AI ga yuboriladi.",
      {
        parse_mode: "Markdown",
        reply_markup: aiSelectionKeyboard(),
      }
    );
  } catch (error) {
    logger.error(`AI selection menu error: ${error.message}`);

    await ctx.reply(
      "❌ AI tanlash menyusini ochishda xatolik yuz berdi.",
      {
        reply_markup: mainMenuKeyboard,
      }
    );
  }
});

/* =========================================================
   🤖 AI PROVIDER CALLBACK
========================================================= */

const AI_NAMES = {
  auto: "🔄 Avtomatik fallback",
  groq: "⚡ Groq",
  openrouter: "🌐 OpenRouter",
  gemini: "✨ Gemini 2.5 Flash",
  claude: "🧠 Claude",
  openai: "🤖 OpenAI",
  cerebras: "🧩 Cerebras",
  cohere: "💬 Cohere",
  mistral: "🌍 Mistral",
  huggingface: "🤗 Hugging Face",
};

bot.callbackQuery(/^ai:(.+)$/, async (ctx) => {
  try {
    const provider = ctx.match[1];

    if (!AI_NAMES[provider]) {
      await ctx.answerCallbackQuery({
        text: "❌ Noma'lum AI",
        show_alert: true,
      });

      return;
    }

    const user = await getOrCreateUser(ctx);

    /*
      User.js ichida aiProvider maydoni bo'lishi kerak.
    */

    user.aiProvider = provider;
    user.mode = "ai";

    await user.save();

    await ctx.answerCallbackQuery({
      text: `${AI_NAMES[provider]} tanlandi`,
    });

    await ctx.editMessageText(
      `✅ *AI tanlandi*\n\n` +
        `🤖 Tanlangan AI: *${AI_NAMES[provider]}*\n\n` +
        `Endi savolingizni yozing.`,
      {
        parse_mode: "Markdown",
      }
    );

    await ctx.reply(
      "✍️ Savolingizni yozing:",
      {
        reply_markup: mainMenuKeyboard,
      }
    );
  } catch (error) {
    logger.error(`AI provider callback error: ${error.message}`);

    await ctx.answerCallbackQuery({
      text: "❌ AI tanlashda xatolik",
      show_alert: true,
    });
  }
});

/* =========================================================
   /HISTORY
========================================================= */

bot.command(["history", "istorya"], async (ctx) => {
  try {
    const userId = ctx.from.id;

    const memories = await Memory.find({
      telegramId: userId,
      content: {
        $regex: /Mijoz ID/,
      },
    }).sort({
      createdAt: -1,
    });

    if (!memories || memories.length === 0) {
      await ctx.reply(
        "📂 Hozircha sizga kontakt yuborib murojaat qilgan mijozlar tarixi yo'q.",
        {
          reply_markup: mainMenuKeyboard,
        }
      );

      return;
    }

    const uniqueClients = new Map();

    memories.forEach((m) => {
      const match = m.content.match(/Mijoz ID: (\d+)/);
      const nameMatch = m.content.match(/Ism: ([^\]]+)/);

      if (match && match[1]) {
        const clientId = match[1];

        const clientName = nameMatch
          ? nameMatch[1].trim()
          : "Noma'lum";

        if (!uniqueClients.has(clientId)) {
          uniqueClients.set(clientId, {
            name: clientName,
            clientId,
            date: new Date(m.createdAt).toLocaleString(),
          });
        }
      }
    });

    let historyText = "📋 <b>Mijozlar tarixi va kontaktlar:</b>\n\n";

    let index = 1;

    for (const [, info] of uniqueClients) {
      historyText +=
        `${index}. 👤 <b>Ism:</b> ${info.name}\n` +
        `   🆔 <b>ID:</b> <code>${info.clientId}</code>\n` +
        `   📅 Oxirgi murojaat: ${info.date}\n\n`;

      index++;
    }

    await ctx.reply(historyText, {
      parse_mode: "HTML",
      reply_markup: mainMenuKeyboard,
    });
  } catch (err) {
    logger.error(`History command error: ${err.message}`);

    await ctx.reply(
      "❌ Tarixni olishda xatolik yuz berdi.",
      {
        reply_markup: mainMenuKeyboard,
      }
    );
  }
});

/* =========================================================
   ABOUT
========================================================= */

bot.command("about", async (ctx) => {
  await ctx.reply(
    "🤖 <b>Bot Haqida Ma'lumot</b>\n\n" +
      "Ushbu bot sizga:\n\n" +
      "🤖 AI muloqot\n" +
      "🎬 Kino qidiruv\n" +
      "🔍 Internet qidiruv\n" +
      "📹 Video xizmatlari\n" +
      "📞 Telegram Business assistent\n\n" +
      "xizmatlarini taqdim etadi.",
    {
      parse_mode: "HTML",
      reply_markup: mainMenuKeyboard,
    }
  );
});

/* =========================================================
   AVTO TELEFON
========================================================= */

bot.command("avto_telefon", async (ctx) => {
  await ctx.reply(
    "📱 <b>Avto-telefon va avto-javob</b>\n\n" +
      "Telegram Business orqali keladigan xabarlarga avtomatik javob qaytarish mumkin.\n\n" +
      "Sozlash uchun pastdagi tugmadan foydalaning.",
    {
      parse_mode: "HTML",
      reply_markup: mainMenuKeyboard,
    }
  );
});

/* =========================================================
   LANGUAGE
========================================================= */

bot.callbackQuery(/^lang_/, languageCallback);

/* =========================================================
   🟢 AVTO-JAVOBNI YOQISH
========================================================= */

bot.hears("🟢 Avto-javobni yoqish", async (ctx) => {
  try {
    const userId = ctx.from.id;

    let user = await User.findOne({
      telegramId: userId,
    });

    if (!user) {
      user = await User.create({
        telegramId: userId,
        autoReplyActive: true,
      });
    } else {
      user.autoReplyActive = true;
      await user.save();
    }

    await ctx.reply(
      "✅ <b>Avto-javob yoqildi!</b>\n\n" +
        "Oflayn paytingizda mijozlarga avval sizning xabaringiz, " +
        "keyin esa AI javob beradi.",
      {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [
              {
                text: "📞 Avto-javob sozlash (Kontakt yuborish)",
              },
            ],
            [
              {
                text: "🔴 Avto-javobni o'chirish",
              },
            ],
            [
              {
                text: "🔙 Asosiy menyu",
              },
            ],
          ],
          resize_keyboard: true,
        },
      }
    );
  } catch (err) {
    logger.error(`Auto reply turn on error: ${err.message}`);
  }
});

/* =========================================================
   🔴 AVTO-JAVOBNI O'CHIRISH
========================================================= */

bot.hears("🔴 Avto-javobni o'chirish", async (ctx) => {
  try {
    const userId = ctx.from.id;

    let user = await User.findOne({
      telegramId: userId,
    });

    if (!user) {
      user = await User.create({
        telegramId: userId,
        autoReplyActive: false,
      });
    } else {
      user.autoReplyActive = false;
      await user.save();
    }

    await ctx.reply(
      "❌ <b>Avto-javob o'chirildi!</b>\n\n" +
        "Endi bot mijozlarga avtomatik javob bermaydi.",
      {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [
              {
                text: "📞 Avto-javob sozlash (Kontakt yuborish)",
              },
            ],
            [
              {
                text: "🟢 Avto-javobni yoqish",
              },
            ],
            [
              {
                text: "🔙 Asosiy menyu",
              },
            ],
          ],
          resize_keyboard: true,
        },
      }
    );
  } catch (err) {
    logger.error(`Auto reply turn off error: ${err.message}`);
  }
});

/* =========================================================
   📞 AVTO-JAVOB SOZLASH
========================================================= */

bot.hears(
  "📞 Avto-javob sozlash (Kontakt yuborish)",
  async (ctx) => {
    await ctx.reply(
      "📞 Telegram Business avto-javobni sozlash uchun " +
        "pastdagi <b>Kontaktni ulashish</b> tugmasini bosing:",
      {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [
              {
                text: "📞 Kontaktni ulashish",
                request_contact: true,
              },
            ],
            [
              {
                text: "🟢 Avto-javobni yoqish",
              },
              {
                text: "🔴 Avto-javobni o'chirish",
              },
            ],
            [
              {
                text: "🔙 Asosiy menyu",
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      }
    );
  }
);

/* =========================================================
   📞 KONTAKT
========================================================= */

bot.on("message:contact", async (ctx) => {
  try {
    const contact = ctx.message.contact;
    const userId = ctx.from.id;

    if (!contact || !contact.phone_number) {
      return;
    }

    await User.findOneAndUpdate(
      {
        telegramId: userId,
      },
      {
        phoneNumber: contact.phone_number,
        waitingForInstruction: true,
        autoReplyActive: true,
      },
      {
        upsert: true,
        new: true,
      }
    );

    await ctx.reply(
      "✅ <b>Raqamingiz qabul qilindi!</b>\n\n" +
        "📝 Endi mijozlarga yuboriladigan " +
        "<b>avto-javob xabaringizni</b> yozing.\n\n" +
        "Masalan:\n" +
        "<i>Hozir bandman, keyinroq aloqaga chiqaman.</i>",
      {
        parse_mode: "HTML",
        reply_markup: mainMenuKeyboard,
      }
    );
  } catch (err) {
    logger.error(`Contact save error: ${err.message}`);
  }
});

/* =========================================================
   📍 LOCATION
========================================================= */

bot.on("message:location", async (ctx) => {
  try {
    const loc = ctx.message.location;
    const userId = ctx.from.id;

    if (!loc) {
      return;
    }

    const mapsUrl =
      `https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}` +
      `&ll=${loc.latitude},${loc.longitude}&z=16`;

    await User.findOneAndUpdate(
      {
        telegramId: userId,
      },
      {
        businessLocation: mapsUrl,
        businessInstruction:
          `Men ishdaman. Kim so'rasa shu raqamga tel qilsin. ` +
          `Turgan joyim: ${mapsUrl}`,
        autoReplyActive: true,
      },
      {
        upsert: true,
        new: true,
      }
    );

    await ctx.reply(
      "📍 <b>Lokatsiyangiz va avto-javobingiz yangilandi!</b>",
      {
        parse_mode: "HTML",
        reply_markup: mainMenuKeyboard,
      }
    );
  } catch (err) {
    logger.error(`Location save error: ${err.message}`);
  }
});

/* =========================================================
   TELEGRAM BUSINESS CONNECTION
========================================================= */

bot.on("business_connection", async (ctx) => {
  try {
    const conn = ctx.businessConnection;

    let user = await User.findOne({
      telegramId: conn.user.id,
    });

    if (user) {
      user.businessConnectionId = conn.id;
      await user.save();

      logger.info(
        `Biznes ulandi: User ID ${conn.user.id}, Connection ID: ${conn.id}`
      );
    } else {
      await User.create({
        telegramId: conn.user.id,
        businessConnectionId: conn.id,
        autoReplyActive: true,
      });

      logger.info(
        `Biznes yangi user bilan ulandi: User ID ${conn.user.id}`
      );
    }
  } catch (err) {
    logger.error(`Business connection error: ${err.message}`);
  }
});

/* =========================================================
   TELEGRAM BUSINESS MESSAGE
========================================================= */

bot.on("business_message", async (ctx) => {
  try {
    const message = ctx.businessMessage;

    const text = message.text;

    const senderId = message.from
      ? message.from.id
      : null;

    const senderName = message.from
      ? `${message.from.first_name || ""} ${
          message.from.last_name || ""
        }`.trim()
      : "Noma'lum";

    if (!text || !senderId) {
      return;
    }

    let owner = await User.findOne({
      businessConnectionId: message.business_connection_id,
    });

    if (!owner) {
      owner = await User.findOne({
        businessConnectionId: {
          $exists: true,
          $ne: "",
        },
      }).sort({
        updatedAt: -1,
      });
    }

    if (!owner || owner.autoReplyActive === false) {
      return;
    }

    if (
      message.from &&
      message.from.id === owner.telegramId
    ) {
      return;
    }

    if (message.is_outgoing) {
      return;
    }

    const replyCount = await Memory.countDocuments({
      telegramId: owner.telegramId,
      role: "assistant",
      content: {
        $regex: `\\[Mijoz ID: ${senderId}\\]`,
      },
    });

    if (replyCount >= 5) {
      return;
    }

    let finalReply = "";

    /* Birinchi javob */
    if (replyCount === 0) {
      finalReply =
        owner.businessInstruction ||
        "Hozir bandman, keyinroq bog'lanaman.";
    } else {
      const lang = ensureLanguage(owner);

      const phoneText = owner.phoneNumber
        ? ` Telefon raqami: ${owner.phoneNumber}.`
        : "";

      const locationText = owner.businessLocation
        ? ` Turgan joyi: ${owner.businessLocation}.`
        : "";

      const systemPrompt =
        `Sen Telegram foydalanuvchisining biznes assistentisan. ` +
        `Akaunt egasi hozir band.\n\n` +
        `Telefon:${phoneText}\n` +
        `Lokatsiya:${locationText}\n\n` +
        `QOIDALAR:\n` +
        `1. Mijozga tabiiy va qisqa javob ber.\n` +
        `2. O'zingni bot yoki sun'iy intellekt deb tanishtirma.\n` +
        `3. Javobni ${lang} tilida ber.`;

      const promptMessages = [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: text,
        },
      ];

      finalReply =
        (await queryAI(promptMessages, lang, owner.aiProvider)) ||
        "Tushunarli, tez orada bog'lanamiz.";
    }

    await Memory.create({
      telegramId: owner.telegramId,
      role: "assistant",
      content:
        `[Mijoz ID: ${senderId}] ` +
        `[Ism: ${senderName}] ${finalReply}`,
    });

    /* Mijozga javob */
    await ctx.reply(finalReply, {
      business_connection_id:
        message.business_connection_id,
    });

    /* Egaga xabar */
    await bot.api
      .sendMessage(
        owner.telegramId,
        `💬 <b>Mijoz bilan yozishuv:</b>\n\n` +
          `👤 <b>Mijoz:</b> ${senderName}\n` +
          `🆔 <b>ID:</b> <code>${senderId}</code>\n\n` +
          `📥 <b>U yozdi:</b>\n${text}\n\n` +
          `📤 <b>Bot javob berdi:</b>\n${finalReply}`,
        {
          parse_mode: "HTML",
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error(
      `Business message handler error: ${error.message}`
    );
  }
});

/* =========================================================
   🖼 PHOTO
========================================================= */

bot.on("message:photo", async (ctx) => {
  try {
    const photo = ctx.message.photo.at(-1);

    if (!photo) {
      return;
    }

    await ctx.replyWithPhoto(photo.file_id, {
      caption: "🖼 Siz yuborgan rasm",
      reply_markup: mainMenuKeyboard,
    });
  } catch (error) {
    logger.error(`Photo handler error: ${error.message}`);
  }
});

/* =========================================================
   🎥 VIDEO
========================================================= */

bot.on("message:video", async (ctx) => {
  try {
    const waitMsg = await ctx.reply(
      "🔄 Video dumaloq shaklga keltirilmoqda...",
      {
        reply_markup: mainMenuKeyboard,
      }
    );

    try {
      const video = ctx.message.video;

      await ctx.replyWithVideoNote(video.file_id);

      await ctx.api
        .deleteMessage(
          ctx.chat.id,
          waitMsg.message_id
        )
        .catch(() => {});
    } catch (err) {
      logger.error(
        `Video note error: ${err.message}`
      );

      await ctx.api
        .deleteMessage(
          ctx.chat.id,
          waitMsg.message_id
        )
        .catch(() => {});

      await ctx.reply(
        "⚠️ Videoni dumaloq shaklga o'tkazib bo'lmadi.\n\n" +
          "Oddiy video sifatida yuboraman.",
        {
          reply_markup: mainMenuKeyboard,
        }
      );

      await ctx.replyWithVideo(
        ctx.message.video.file_id
      );
    }
  } catch (error) {
    logger.error(
      `Video handler error: ${error.message}`
    );
  }
});

/* =========================================================
   📝 MATN
========================================================= */

bot.on("message:text", async (ctx, next) => {
  try {
    const userId = ctx.from.id;

    const user = await User.findOne({
      telegramId: userId,
    });

    if (user && user.waitingForInstruction) {
      user.businessInstruction =
        ctx.message.text;

      user.waitingForInstruction = false;
      user.autoReplyActive = true;

      await user.save();

      await ctx.reply(
        `✅ <b>Avto-javob saqlandi!</b>\n\n` +
          `Siz yozgan matn:\n` +
          `"${ctx.message.text}"\n\n` +
          `Endi mijozga birinchi javob shu matn bo'ladi, ` +
          `keyingi javoblarda tanlangan AI ishlaydi.`,
        {
          parse_mode: "HTML",
          reply_markup: mainMenuKeyboard,
        }
      );

      return;
    }
  } catch (error) {
    logger.error(
      `Instruction text handler error: ${error.message}`
    );
  }

  return next();
});

/* =========================================================
   MAIN CHAT HANDLER
========================================================= */

bot.on("message:text", chatHandler);

/* =========================================================
   GLOBAL ERROR
========================================================= */

bot.catch((err) => {
  logger.error(
    `Global Bot Error: ${err.error?.message || err.message}`
  );

  const ctx = err.ctx;

  if (ctx) {
    ctx
      .reply(
        "🙏 Tizimda kutilmagan nosozlik yuz berdi.",
        {
          reply_markup: mainMenuKeyboard,
        }
      )
      .catch(() => {});
  }
});

/* =========================================================
   START BOT
========================================================= */

bot.start();

logger.info("Telegram AI Bot started successfully");
