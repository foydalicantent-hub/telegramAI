import { Bot } from "grammy";
import http from "http";

import { config, assertRequiredConfig } from "./env.js";
import { connectDB } from "./connect.js";
import { logger } from "./logger.js";

import { chatHandler } from "./chat.js";
import { User } from "./User.js";
import { Memory } from "./Memory.js";
import { queryAI } from "./aiService.js";

assertRequiredConfig();
await connectDB();

const bot = new Bot(config.botToken);

// ================= RENDER SERVER =================

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("Bot is running smoothly!");
});

server.listen(PORT, "0.0.0.0", () => {
  logger.info(`HTTP server is listening on port ${PORT}`);
});

// ================= KLAVIATURALAR =================

const languageKeyboard = {
  inline_keyboard: [
    [
      {
        text: "🇺🇿 O'zbekcha",
        callback_data: "set_lang_uz"
      },
      {
        text: "🇷🇺 Русский",
        callback_data: "set_lang_ru"
      },
      {
        text: "🇬🇧 English",
        callback_data: "set_lang_en"
      }
    ]
  ]
};

const mainMenuKeyboard = {
  keyboard: [
    [
      { text: "🌐 AI va Qidiruv" },
      { text: "🎥 Media va Yaratish" }
    ],
    [
      { text: "💻 Kod va Instrumentlar" },
      { text: "🤖 Biznes Avto-javob" }
    ],
    [
      { text: "📜 Muloqot Tarixi" },
      { text: "✨ Tez kunda (Bo'sh)" }
    ]
  ],
  resize_keyboard: true
};

const submenu1Keyboard = {
  keyboard: [
    [
      { text: "🤖 AI Chat" },
      { text: "🔍 Internet Qidiruv" }
    ],
    [
      { text: "🎬 Kino Topish" }
    ],
    [
      { text: "🔙 Ortga" }
    ]
  ],
  resize_keyboard: true
};

const submenu2Keyboard = {
  keyboard: [
    [
      { text: "🎨 Rasm Yaratish" },
      { text: "🖼 Rasm va Video O'qish" }
    ],
    [
      { text: "🔴 Dumaloq Video" },
      { text: "🔗 Link orqali Yuklash" }
    ],
    [
      { text: "🔙 Ortga" }
    ]
  ],
  resize_keyboard: true
};

const submenu3Keyboard = {
  keyboard: [
    [
      { text: "💻 Kod Yozish" },
      { text: "🧠 Claude AI" }
    ],
    [
      { text: "📁 Fayl O'qish" },
      { text: "🌐 Tarjima" }
    ],
    [
      { text: "🎮 Mod Oyunlar" }
    ],
    [
      { text: "🔙 Ortga" }
    ]
  ],
  resize_keyboard: true
};

const submenu4Keyboard = {
  keyboard: [
    [
      {
        text: "📞 Kontakt ulashish",
        request_contact: true
      }
    ],
    [
      { text: "🟢 Yoqish" },
      { text: "🔴 O'chirish" }
    ],
    [
      { text: "✏️ Matnni Tahrirlash" },
      { text: "📋 Mijozlar Tarixi (Biznes)" }
    ],
    [
      { text: "🔙 Ortga" }
    ]
  ],
  resize_keyboard: true
};

// ================= START =================

bot.command("start", async (ctx) => {
  await ctx.reply(
    "🌐 *Xush kelibsiz! Iltimos, muloqot tilini tanlang:*\n\n" +
    "🌐 *Добро пожаловать! Выберите язык:*\n\n" +
    "🌐 *Welcome! Please choose a language:*",
    {
      parse_mode: "Markdown",
      reply_markup: languageKeyboard
    }
  );
});

// ================= HELP =================

bot.command("help", async (ctx) => {
  await ctx.reply(
    "ℹ️ *Yordam*\n\n" +
    "🤖 AI Chat — AI bilan suhbat.\n" +
    "🔍 Internet Qidiruv — internetdan qidirish.\n" +
    "🎬 Kino Topish — kino va serial qidirish.\n" +
    "🎥 Media — rasm va video.\n" +
    "💻 Kod — dasturlash yordamchisi.\n" +
    "🤖 Biznes Avto-javob — mijozlarga avtomatik javob.",
    {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard
    }
  );
});

// ================= TIL =================

bot.callbackQuery(/^set_lang_/, async (ctx) => {
  try {
    const lang =
      ctx.callbackQuery.data.replace("set_lang_", "");

    const userId = ctx.from.id;

    let user = await User.findOne({
      telegramId: userId
    });

    if (!user) {
      user = await User.create({
        telegramId: userId,
        language: lang
      });
    } else {
      user.language = lang;
      await user.save();
    }

    await ctx.answerCallbackQuery("✅ Til tanlandi!");

    await ctx.deleteMessage().catch(() => {});

    let text =
      "✅ *Til muvaffaqiyatli saqlandi!*\n\n" +
      "Quyidagi menyulardan birini tanlang:";

    if (lang === "ru") {
      text =
        "✅ *Язык успешно сохранен!*\n\n" +
        "Выберите нужный раздел:";
    }

    if (lang === "en") {
      text =
        "✅ *Language successfully saved!*\n\n" +
        "Select a section below:";
    }

    await ctx.reply(text, {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard
    });

  } catch (error) {
    logger.error(`Language error: ${error.message}`);
  }
});

// ================= ORTGA =================

bot.hears("🔙 Ortga", async (ctx) => {
  await ctx.reply(
    "🏠 *Asosiy menyuga qaytdingiz:*",
    {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard
    }
  );
});

// ================= AI VA QIDIRUV =================

bot.hears("🌐 AI va Qidiruv", async (ctx) => {
  await ctx.reply(
    "🌐 *AI va Qidiruv bo'limi:*\n" +
    "Kerakli xizmatni tanlang:",
    {
      parse_mode: "Markdown",
      reply_markup: submenu1Keyboard
    }
  );
});

bot.hears("🤖 AI Chat", async (ctx) => {
  await ctx.reply(
    "🤖 *AI Chat rejimi faol!*\n\n" +
    "Savolingizni yuboring:",
    {
      parse_mode: "Markdown",
      reply_markup: submenu1Keyboard
    }
  );
});

bot.hears("🔍 Internet Qidiruv", async (ctx) => {
  await ctx.reply(
    "🔍 *Internet Qidiruv*\n\n" +
    "Nimani qidirmoqchisiz?",
    {
      parse_mode: "Markdown",
      reply_markup: submenu1Keyboard
    }
  );
});

bot.hears("🎬 Kino Topish", async (ctx) => {
  await ctx.reply(
    "🎬 *Kino Topish*\n\n" +
    "Kino yoki serial nomini yozing:",
    {
      parse_mode: "Markdown",
      reply_markup: submenu1Keyboard
    }
  );
});

// ================= MEDIA =================

bot.hears("🎥 Media va Yaratish", async (ctx) => {
  await ctx.reply(
    "🎥 *Media va Yaratish bo'limi:*",
    {
      parse_mode: "Markdown",
      reply_markup: submenu2Keyboard
    }
  );
});

bot.hears("🎨 Rasm Yaratish", async (ctx) => {
  await ctx.reply(
    "🎨 *Rasm Yaratish*\n\n" +
    "Qanday rasm kerakligini batafsil yozing.",
    {
      parse_mode: "Markdown",
      reply_markup: submenu2Keyboard
    }
  );
});

bot.hears("🖼 Rasm va Video O'qish", async (ctx) => {
  await ctx.reply(
    "🖼 Rasm yoki video yuboring.",
    {
      reply_markup: submenu2Keyboard
    }
  );
});

bot.hears("🔴 Dumaloq Video", async (ctx) => {
  await ctx.reply(
    "🔴 Oddiy video yuboring. " +
    "Uni video-note ko'rinishida yuborishga harakat qilaman.",
    {
      reply_markup: submenu2Keyboard
    }
  );
});

bot.hears("🔗 Link orqali Yuklash", async (ctx) => {
  await ctx.reply(
    "🔗 Media linkini yuboring.",
    {
      reply_markup: submenu2Keyboard
    }
  );
});

// ================= KOD =================

bot.hears("💻 Kod va Instrumentlar", async (ctx) => {
  await ctx.reply(
    "💻 *Kod va Instrumentlar bo'limi:*",
    {
      parse_mode: "Markdown",
      reply_markup: submenu3Keyboard
    }
  );
});

bot.hears("💻 Kod Yozish", async (ctx) => {
  await ctx.reply(
    "💻 *Kod Yozish Assistent*\n\n" +
    "Qaysi dasturlash tilida kod kerakligini yozing.",
    {
      parse_mode: "Markdown",
      reply_markup: submenu3Keyboard
    }
  );
});

bot.hears("🧠 Claude AI", async (ctx) => {
  await ctx.reply(
    "🧠 *Claude AI rejimi*\n\n" +
    "Savolingizni yuboring.",
    {
      parse_mode: "Markdown",
      reply_markup: submenu3Keyboard
    }
  );
});

bot.hears("📁 Fayl O'qish", async (ctx) => {
  await ctx.reply(
    "📁 Fayl yoki hujjat yuboring.",
    {
      reply_markup: submenu3Keyboard
    }
  );
});

bot.hears("🌐 Tarjima", async (ctx) => {
  await ctx.reply(
    "🌐 Tarjima qilinadigan matnni yuboring.",
    {
      reply_markup: submenu3Keyboard
    }
  );
});

bot.hears("🎮 Mod Oyunlar", async (ctx) => {
  await ctx.reply(
    "🎮 O'yin nomini yozing.",
    {
      reply_markup: submenu3Keyboard
    }
  );
});

// ================= BIZNES =================

bot.hears("🤖 Biznes Avto-javob", async (ctx) => {
  await ctx.reply(
    "🤖 *Telegram Business Avto-javob sozlamalari:*",
    {
      parse_mode: "Markdown",
      reply_markup: submenu4Keyboard
    }
  );
});

bot.hears("🟢 Yoqish", async (ctx) => {
  try {
    await User.findOneAndUpdate(
      {
        telegramId: ctx.from.id
      },
      {
        autoReplyActive: true
      },
      {
        upsert: true
      }
    );

    await ctx.reply(
      "✅ *Biznes Avto-javob yoqildi!*",
      {
        parse_mode: "Markdown",
        reply_markup: submenu4Keyboard
      }
    );

  } catch (error) {
    logger.error(
      `Turn on error: ${error.message}`
    );
  }
});

bot.hears("🔴 O'chirish", async (ctx) => {
  try {
    await User.findOneAndUpdate(
      {
        telegramId: ctx.from.id
      },
      {
        autoReplyActive: false
      },
      {
        upsert: true
      }
    );

    await ctx.reply(
      "❌ *Biznes Avto-javob o'chirildi!*",
      {
        parse_mode: "Markdown",
        reply_markup: submenu4Keyboard
      }
    );

  } catch (error) {
    logger.error(
      `Turn off error: ${error.message}`
    );
  }
});

// ================= MATN TAHRIRLASH =================

bot.hears("✏️ Matnni Tahrirlash", async (ctx) => {

  await User.findOneAndUpdate(
    {
      telegramId: ctx.from.id
    },
    {
      waitingForInstruction: true
    },
    {
      upsert: true
    }
  );

  await ctx.reply(
    "📝 Mijozlarga yuboriladigan javob matnini yozing.\n\n" +
    "Masalan:\n" +
    "Bandman, tez orada javob beraman.",
    {
      reply_markup: submenu4Keyboard
    }
  );
});

// ================= KONTAKT =================

bot.on("message:contact", async (ctx) => {
  try {

    const contact = ctx.message.contact;
    const userId = ctx.from.id;

    if (!contact?.phone_number) {
      return;
    }

    await User.findOneAndUpdate(
      {
        telegramId: userId
      },
      {
        phoneNumber: contact.phone_number,
        autoReplyActive: true
      },
      {
        upsert: true
      }
    );

    await Memory.create({
      telegramId: userId,
      role: "user",
      content:
        `[Mijoz ID: ${userId}] ` +
        `[Ism: ${ctx.from.first_name || "Mijoz"}] ` +
        `Kontakt ulashdi: ${contact.phone_number}`
    });

    await ctx.reply(
      "✅ Telefon raqamingiz saqlandi!",
      {
        reply_markup: mainMenuKeyboard
      }
    );

  } catch (error) {

    logger.error(
      `Contact handling error: ${error.message}`
    );

  }
});

// ================= MEDIA VIDEO =================

bot.on("message:video", async (ctx) => {

  try {

    const waitMessage =
      await ctx.reply(
        "🔄 Video tayyorlanmoqda..."
      );

    try {

      await ctx.replyWithVideoNote(
        ctx.message.video.file_id
      );

    } catch {

      await ctx.replyWithVideo(
        ctx.message.video.file_id,
        {
          caption: "📹 Videongiz qabul qilindi!"
        }
      );

    }

    await ctx.api.deleteMessage(
      ctx.chat.id,
      waitMessage.message_id
    ).catch(() => {});

  } catch (error) {

    logger.error(
      `Video handler error: ${error.message}`
    );

  }

});

// ================= RASM =================

bot.on("message:photo", async (ctx) => {

  await ctx.reply(
    "🖼 Rasm qabul qilindi.",
    {
      reply_markup: mainMenuKeyboard
    }
  );

});

// ================= FAYL =================

bot.on("message:document", async (ctx) => {

  await ctx.reply(
    "📁 Fayl qabul qilindi.",
    {
      reply_markup: mainMenuKeyboard
    }
  );

});

// ================= TEXT =================

bot.on(
  "message:text",
  async (ctx, next) => {

    try {

      const userId = ctx.from.id;

      const user =
        await User.findOne({
          telegramId: userId
        });

      // Avto-javob matnini saqlash

      if (
        user &&
        user.waitingForInstruction
      ) {

        user.businessInstruction =
          ctx.message.text;

        user.waitingForInstruction =
          false;

        user.autoReplyActive =
          true;

        await user.save();

        await ctx.reply(
          `✅ Avto-javob matni saqlandi!\n\n` +
          `📝 ${ctx.message.text}`,
          {
            reply_markup: mainMenuKeyboard
          }
        );

        return;
      }

    } catch (error) {

      logger.error(
        `Instruction error: ${error.message}`
      );

    }

    return next();

  },
  chatHandler
);

// ================= ERROR =================

bot.catch((error) => {

  logger.error(
    `Global Bot Error: ${error.message}`
  );

});

// ================= START BOT =================

bot.start({
  onStart: () => {

    logger.info(
      "Telegram Bot successfully started!"
    );

  }
});
