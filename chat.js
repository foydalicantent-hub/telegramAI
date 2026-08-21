import { Memory } from "./Memory.js";
import { getOrCreateUser } from "./userService.js";
import {
  ensureLanguage,
  ensureAIProvider,
} from "./User.js";
import { queryAI } from "./aiService.js";
import { searchMovie } from "./movieService.js";
import { webSearch } from "./searchService.js";
import {
  downloadMedia,
  isSocialMediaUrl,
} from "./downloaderService.js";
import {
  MEMORY_HISTORY_LIMIT,
} from "./constants.js";
import { logger } from "./logger.js";
import {
  mainMenuKeyboard,
  aiSelectionKeyboard,
} from "./mainMenu.js";
import fetch from "node-fetch";

/* =========================================================
   AI TANLASH
========================================================= */

const AI_BUTTONS = {
  "🔄 Auto": "auto",
  "⚡ Groq": "groq",
  "🌐 OpenRouter": "openrouter",
  "✨ Gemini 2.5 Flash": "gemini",
  "🧠 Claude": "claude",
  "🤖 OpenAI": "openai",
};

const AI_NAMES = {
  auto: "🔄 Auto",
  groq: "⚡ Groq",
  openrouter: "🌐 OpenRouter",
  gemini: "✨ Gemini 2.5 Flash",
  claude: "🧠 Claude",
  openai: "🤖 OpenAI",
};

/* =========================================================
   MAIN HANDLER
========================================================= */

export async function chatHandler(ctx) {
  try {
    const text =
      ctx.message?.text?.trim();

    if (!text) {
      return;
    }

    const user =
      await getOrCreateUser(ctx);

    const lang =
      ensureLanguage(user);

    const currentProvider =
      ensureAIProvider(user);

    /* =====================================================
       COMMANDS
    ===================================================== */

    if (text.startsWith("/")) {
      user.mode = "ai";
      await user.save();

      return;
    }

    /* =====================================================
       AVTO-JAVOB
    ===================================================== */

    if (user.waitingForInstruction) {
      user.businessInstruction =
        text;

      user.waitingForInstruction =
        false;

      await user.save();

      await ctx.reply(
        `✅ **Avto-javob xabaringiz muvaffaqiyatli saqlandi!**\n\n` +
          `Endi sizga yozgan har qanday insonga bot mana shu xabarni yuboradi:\n\n` +
          `👉 _"${text}"_`,

        {
          parse_mode: "Markdown",
          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* =====================================================
       AI CHAT
    ===================================================== */

    if (text === "🤖 AI Chat") {
      user.mode = "ai_select";

      await user.save();

      await ctx.reply(
        `🤖 **AI Chat**\n\n` +
          `Qaysi AI bilan suhbatlashmoqchisiz?\n\n` +
          `🔄 **Auto** — bittasi ishlamasa keyingisiga o'tadi.\n` +
          `⚡ **Groq** — faqat Groq\n` +
          `🌐 **OpenRouter** — faqat OpenRouter\n` +
          `✨ **Gemini 2.5 Flash** — faqat Gemini\n` +
          `🧠 **Claude** — faqat Claude\n` +
          `🤖 **OpenAI** — faqat OpenAI`,

        {
          parse_mode: "Markdown",
          reply_markup:
            aiSelectionKeyboard,
        }
      );

      return;
    }

    /* =====================================================
       AI TANLASH
    ===================================================== */

    if (
      user.mode === "ai_select" &&
      AI_BUTTONS[text]
    ) {
      const provider =
        AI_BUTTONS[text];

      user.aiProvider =
        provider;

      user.mode = "ai";

      await user.save();

      await ctx.reply(
        `${AI_NAMES[provider]} **tanlandi.**\n\n` +
          `Endi savolingizni yozing.`,

        {
          parse_mode: "Markdown",
          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* =====================================================
       ORQAGA
    ===================================================== */

    if (
      user.mode === "ai_select" &&
      text === "⬅️ Orqaga"
    ) {
      user.mode = "ai";

      await user.save();

      await ctx.reply(
        "🏠 Asosiy menyu.",

        {
          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* =====================================================
       KINO
    ===================================================== */

    if (text === "🎬 Kino Qidirish") {
      user.mode = "movie";

      await user.save();

      await ctx.reply(
        "🎬 **Kino qidiruv rejimi yoqildi.**\n\nKino nomini yozing:",

        {
          parse_mode: "Markdown",
          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* =====================================================
       INTERNET QIDIRUV
    ===================================================== */

    if (
      text === "🔍 Internet Qidiruv"
    ) {
      user.mode = "search";

      await user.save();

      await ctx.reply(
        "🔍 **Internet qidiruv rejimi yoqildi.**\n\nSo'rovingizni kiriting:",

        {
          parse_mode: "Markdown",
          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* =====================================================
       DUMALOQ VIDEO
    ===================================================== */

    if (
      text === "🔴 Dumaloq Video"
    ) {
      user.mode = "circle";

      await user.save();

      await ctx.reply(
        "🔴 **Dumaloq video rejimi yoqildi.**\n\n" +
          "Video yuboring yoki video havolasini yuboring.",

        {
          parse_mode: "Markdown",
          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* =====================================================
       MULOQOT TARIXI
    ===================================================== */

    if (
      text === "📜 Muloqot Tarixi"
    ) {
      const history =
        await Memory.find({
          telegramId:
            user.telegramId,
        })
          .sort({
            createdAt: -1,
          })
          .limit(5);

      if (!history.length) {
        await ctx.reply(
          "📜 Muloqot tarixi bo'sh.",

          {
            reply_markup:
              mainMenuKeyboard,
          }
        );

        return;
      }

      const textHist =
        history
          .reverse()
          .map(
            (h) =>
              `${
                h.role === "user"
                  ? "👤 Siz"
                  : "🤖 AI"
              }: ${h.content}`
          )
          .join("\n\n");

      await ctx.reply(
        `📜 **Oxirgi suhbatlar:**\n\n${textHist}`,

        {
          parse_mode: "Markdown",
          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* =====================================================
       SOZLAMALAR
    ===================================================== */

    if (text === "⚙️ Sozlamalar") {
      await ctx.reply(
        `⚙️ **Sozlamalar**\n\n` +
          `🌐 Til: ${user.language || "uz"}\n` +
          `🤖 AI: ${
            AI_NAMES[currentProvider] ||
            AI_NAMES.auto
          }\n` +
          `🆔 Telegram ID: \`${user.telegramId}\`\n` +
          `📞 Telefon: \`${
            user.phoneNumber ||
            "Ulanmagan"
          }\`\n\n` +
          `📌 **Avto-javob:**\n${
            user.businessInstruction ||
            "Hali o'rnatilmagan"
          }`,

        {
          parse_mode: "Markdown",
          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* =====================================================
       SOCIAL VIDEO
    ===================================================== */

    if (isSocialMediaUrl(text)) {
      const waitMsg =
        await ctx.reply(
          "📥 Video serverdan yuklanmoqda...",
          {
            reply_markup:
              mainMenuKeyboard,
          }
        );

      const videoDirectUrl =
        await downloadMedia(
          text
        );

      await ctx.api
        .deleteMessage(
          ctx.chat.id,
          waitMsg.message_id
        )
        .catch(() => {});

      if (!videoDirectUrl) {
        await ctx.reply(
          "❌ Videoni yuklab bo'lmadi.",

          {
            reply_markup:
              mainMenuKeyboard,
          }
        );

        return;
      }

      try {
        const videoRes =
          await fetch(
            videoDirectUrl
          );

        if (!videoRes.ok) {
          throw new Error(
            `Video HTTP ${videoRes.status}`
          );
        }

        const arrayBuffer =
          await videoRes.arrayBuffer();

        const videoBuffer =
          Buffer.from(
            arrayBuffer
          );

        if (
          user.mode ===
          "circle"
        ) {
          try {
            await ctx.replyWithVideoNote(
              videoBuffer,

              {
                reply_markup:
                  mainMenuKeyboard,
              }
            );
          } catch {
            await ctx.replyWithVideo(
              videoBuffer,

              {
                caption:
                  "📹 Video yuklandi.",
                reply_markup:
                  mainMenuKeyboard,
              }
            );
          }

          user.mode = "ai";

          await user.save();

          return;
        }

        await ctx.replyWithVideo(
          videoBuffer,

          {
            caption:
              "📹 Video muvaffaqiyatli yuklandi!",
            reply_markup:
              mainMenuKeyboard,
          }
        );
      } catch (error) {
        logger.error(
          `Video processing error: ${error.message}`
        );

        await ctx.reply(
          "❌ Videoni qayta ishlashda xatolik.",

          {
            reply_markup:
              mainMenuKeyboard,
          }
        );
      }

      return;
    }

    /* =====================================================
       MOVIE MODE
    ===================================================== */

    if (user.mode === "movie") {
      const waitMsg =
        await ctx.reply(
          "🎬 Film qidirilmoqda..."
        );

      const results =
        await searchMovie(
          text
        );

      await ctx.api
        .deleteMessage(
          ctx.chat.id,
          waitMsg.message_id
        )
        .catch(() => {});

      /*
       * movieService.js haqiqiy qidiruv natijasi
       * qaytarsa, shu yerda ishlaydi.
       *
       * AI matn qaytarsa, uni ham ko'rsatamiz.
       */
      if (
        typeof results ===
          "string" &&
        results.trim()
      ) {
        await ctx.reply(
          `🎬 **Kino ma'lumoti:**\n\n${results}`,

          {
            parse_mode:
              "Markdown",
            reply_markup:
              mainMenuKeyboard,
          }
        );

        return;
      }

      if (
        Array.isArray(results) &&
        results.length
      ) {
        const lines =
          results.map(
            (movie) =>
              `🎬 **${
                movie.title
              }** ${
                movie.year
                  ? `(${movie.year})`
                  : ""
              }\n🔗 ${
                movie.url || ""
              }`
          );

        await ctx.reply(
          lines.join(
            "\n\n"
          ),

          {
            parse_mode:
              "Markdown",
            reply_markup:
              mainMenuKeyboard,
          }
        );

        return;
      }

      const fallbackResults =
        await webSearch(
          `${text} kino film`
        );

      if (
        Array.isArray(
          fallbackResults
        ) &&
        fallbackResults.length
      ) {
        const lines =
          fallbackResults.map(
            (r) =>
              `▶️ **${r.title}**\n🔗 ${r.url}`
          );

        await ctx.reply(
          `🌐 **Topilgan natijalar:**\n\n${lines.join(
            "\n\n"
          )}`,

          {
            parse_mode:
              "Markdown",
            reply_markup:
              mainMenuKeyboard,
          }
        );

        return;
      }

      await ctx.reply(
        "❌ Afsuski, natija topilmadi.",

        {
          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* =====================================================
       SEARCH MODE
    ===================================================== */

    if (
      user.mode === "search"
    ) {
      const waitMsg =
        await ctx.reply(
          "🔍 Internetdan ma'lumot qidirilmoqda..."
        );

      const results =
        await webSearch(
          text
        );

      await ctx.api
        .deleteMessage(
          ctx.chat.id,
          waitMsg.message_id
        )
        .catch(() => {});

      user.mode = "ai";

      await user.save();

      if (
        !results ||
        !results.length
      ) {
        await ctx.reply(
          "❌ Natija topilmadi.",

          {
            reply_markup:
              mainMenuKeyboard,
          }
        );

        return;
      }

      const lines =
        results.map(
          (r) =>
            `▶️ **${r.title}**\n🔗 ${r.url}`
        );

      await ctx.reply(
        `🌐 **Qidiruv natijalari:**\n\n${lines.join(
          "\n\n"
        )}`,

        {
          parse_mode:
            "Markdown",
          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* =====================================================
       AI CHAT
    ===================================================== */

    const waitMessage =
      await ctx.reply(
        `🤖 ${
          AI_NAMES[
            currentProvider
          ] || "AI"
        } ishlamoqda...`
      );

    await Memory.create({
      telegramId:
        user.telegramId,

      role: "user",

      content: text,
    });

    const history =
      await Memory.find({
        telegramId:
          user.telegramId,
      })
        .sort({
          createdAt: 1,
        })
        .limit(
          MEMORY_HISTORY_LIMIT
        );

    const messages =
      history.map((message) => ({
        role:
          message.role,
        content:
          message.content,
      }));

    let answer = "";

    try {
      answer =
        await queryAI(
          messages,
          lang,
          currentProvider
        );
    } catch (error) {
      logger.error(
        `AI chat error: ${error.message}`
      );
    }

    await ctx.api
      .deleteMessage(
        ctx.chat.id,
        waitMessage.message_id
      )
      .catch(() => {});

    if (
      !answer ||
      !answer.trim()
    ) {
      await ctx.reply(
        `❌ ${
          AI_NAMES[
            currentProvider
          ] || "AI"
        } javob bera olmadi.\n\n` +
          `Agar **Auto** rejimini tanlasangiz, ` +
          `ishlamayotgan AI'dan keyingisiga avtomatik o'tadi.`,

        {
          parse_mode:
            "Markdown",
          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    await Memory.create({
      telegramId:
        user.telegramId,

      role: "assistant",

      content: answer,
    });

    await ctx.reply(
      answer,

      {
        reply_markup:
          mainMenuKeyboard,
      }
    );
  } catch (error) {
    logger.error(
      `Chat handler error: ${error.message}`
    );

    await ctx.reply(
      "🙏 Uzr, kutilmagan nosozlik yuz berdi.",

      {
        reply_markup:
          mainMenuKeyboard,
      }
    ).catch(() => {});
  }
}
