import { Memory } from "./Memory.js";
import { getOrCreateUser } from "./userService.js";
import { ensureLanguage } from "./User.js";

import {
  queryAI,
  generateImage,
  getAvailableProviders,
  getProviderName,
} from "./aiService.js";

import { searchMovie } from "./movieService.js";
import { webSearch } from "./searchService.js";

import {
  downloadMedia,
  isSocialMediaUrl,
} from "./downloaderService.js";

import { MEMORY_HISTORY_LIMIT } from "./constants.js";

import { logger } from "./logger.js";

import {
  mainMenuKeyboard,
  aiProviderKeyboard,
} from "./mainMenu.js";

import { config } from "./env.js";

import fetch from "node-fetch";

/* =====================================================
   AI SELECTOR
===================================================== */

export async function showAISelector(
  ctx,
  user
) {
  const providers =
    getAvailableProviders();

  const current =
    user.aiProvider || "auto";

  const text =
    `🤖 <b>AI Chat</b>\n\n` +
    `Hozir tanlangan: <b>${getProviderName(
      current
    )}</b>\n\n` +
    `AI tanlang:`;

  await ctx.reply(text, {
    parse_mode: "HTML",

    reply_markup:
      aiProviderKeyboard(
        providers,
        current,
        Boolean(config.keys.openai)
      ),
  });
}

/* =====================================================
   AI CALLBACK
===================================================== */

export async function aiCallbackHandler(
  ctx
) {
  const data =
    ctx.callbackQuery?.data;

  if (!data?.startsWith("ai_")) {
    return;
  }

  try {
    const user =
      await getOrCreateUser(ctx);

    /* CLOSE */

    if (data === "ai_close") {
      await ctx.answerCallbackQuery(
        "Yopildi"
      );

      await ctx.deleteMessage()
        .catch(() => {});

      return;
    }

    /* IMAGE */

    if (data === "ai_image") {
      if (!config.keys.openai) {
        await ctx.answerCallbackQuery(
          "OpenAI API key topilmadi",
          {
            show_alert: true,
          }
        );

        return;
      }

      user.mode = "image";

      await user.save();

      await ctx.answerCallbackQuery();

      await ctx.deleteMessage()
        .catch(() => {});

      await ctx.reply(
        "🎨 <b>Rasm yaratish</b>\n\n" +
          "Rasm qanday bo'lishini yozing:",

        {
          parse_mode: "HTML",

          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* SELECT */

    if (data.startsWith("ai_select:")) {
      const provider =
        data.split(":")[1];

      const validProviders = [
        "auto",
        "groq",
        "cerebras",
        "gemini",
        "mistral",
        "cohere",
        "huggingface",
        "openrouter",
        "claude",
      ];

      if (
        !validProviders.includes(
          provider
        )
      ) {
        await ctx.answerCallbackQuery(
          "Noto'g'ri AI",
          {
            show_alert: true,
          }
        );

        return;
      }

      if (provider !== "auto") {
        const exists =
          getAvailableProviders().some(
            (item) =>
              item.id === provider
          );

        if (!exists) {
          await ctx.answerCallbackQuery(
            "Bu AI uchun API key Render'da yo'q.",
            {
              show_alert: true,
            }
          );

          return;
        }
      }

      user.aiProvider = provider;

      user.mode = "ai";

      await user.save();

      await ctx.answerCallbackQuery(
        `${getProviderName(
          provider
        )} tanlandi`
      );

      await ctx.deleteMessage()
        .catch(() => {});

      await ctx.reply(
        `✅ <b>${getProviderName(
          provider
        )}</b> tanlandi.\n\n` +
          `Endi savolingizni yozing.`,

        {
          parse_mode: "HTML",

          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }
  } catch (error) {
    logger.error(
      `AI callback error: ${error.message}`
    );

    await ctx.answerCallbackQuery(
      "Xatolik yuz berdi"
    ).catch(() => {});
  }
}

/* =====================================================
   CHAT HANDLER
===================================================== */

export async function chatHandler(ctx) {
  try {
    const text =
      ctx.message?.text;

    if (!text) {
      return;
    }

    const user =
      await getOrCreateUser(ctx);

    const lang =
      ensureLanguage(user);

    /* COMMAND */

    if (text.startsWith("/")) {
      user.mode = "ai";

      await user.save();

      return;
    }

    /* AI CHAT */

    if (text === "🤖 AI Chat") {
      user.mode = "ai";

      await user.save();

      await showAISelector(
        ctx,
        user
      );

      return;
    }

    /* AUTO REPLY */

    if (user.waitingForInstruction) {
      user.businessInstruction =
        text;

      user.waitingForInstruction =
        false;

      await user.save();

      await ctx.reply(
        `✅ <b>Avto-javob saqlandi!</b>\n\n` +
          `👉 "${text}"`,

        {
          parse_mode: "HTML",

          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* MOVIE */

    if (
      text === "🎬 Kino Qidirish"
    ) {
      user.mode = "movie";

      await user.save();

      await ctx.reply(
        "🎬 <b>Kino qidiruv rejimi yoqildi.</b>\n" +
          "Kino nomini yozing:",

        {
          parse_mode: "HTML",

          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* INTERNET */

    if (
      text === "🔍 Internet Qidiruv"
    ) {
      user.mode = "search";

      await user.save();

      await ctx.reply(
        "🔍 <b>Internet qidiruv rejimi yoqildi.</b>\n" +
          "So'rovingizni kiriting:",

        {
          parse_mode: "HTML",

          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* CIRCLE VIDEO */

    if (
      text === "🔴 Dumaloq Video"
    ) {
      user.mode = "circle";

      await user.save();

      await ctx.reply(
        "🔴 <b>Dumaloq video rejimi yoqildi.</b>\n" +
          "Video yoki link yuboring:",

        {
          parse_mode: "HTML",

          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* HISTORY */

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
        `📜 <b>Oxirgi suhbatlar:</b>\n\n${textHist}`,

        {
          parse_mode: "HTML",

          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* SETTINGS */

    if (
      text === "⚙️ Sozlamalar"
    ) {
      await ctx.reply(
        `⚙️ <b>Sozlamalar</b>\n\n` +
          `🌐 Til: ${
            user.language || "uz"
          }\n` +
          `🤖 AI: ${getProviderName(
            user.aiProvider || "auto"
          )}\n` +
          `🆔 Telegram ID: ` +
          `<code>${user.telegramId}</code>\n` +
          `📞 Telefon: ` +
          `<code>${
            user.phoneNumber ||
            "Ulanmagan"
          }</code>`,

        {
          parse_mode: "HTML",

          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* SOCIAL MEDIA */

    if (
      isSocialMediaUrl(text)
    ) {
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
          text.trim()
        );

      await ctx.api
        .deleteMessage(
          ctx.chat.id,
          waitMsg.message_id
        )
        .catch(() => {});

      if (videoDirectUrl) {
        const videoRes =
          await fetch(
            videoDirectUrl
          );

        const arrayBuffer =
          await videoRes.arrayBuffer();

        const videoBuffer =
          Buffer.from(
            arrayBuffer
          );

        if (
          user.mode === "circle"
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
      } else {
        await ctx.reply(
          "❌ Videoni yuklab bo'lmadi.",
          {
            reply_markup:
              mainMenuKeyboard,
          }
        );
      }

      return;
    }

    /* MOVIE */

    if (
      user.mode === "movie"
    ) {
      const waitMsg =
        await ctx.reply(
          "🎬 Film qidirilmoqda..."
        );

      const results =
        await searchMovie(
          text.trim()
        );

      await ctx.api
        .deleteMessage(
          ctx.chat.id,
          waitMsg.message_id
        )
        .catch(() => {});

      if (
        Array.isArray(results) &&
        results.length
      ) {
        const lines =
          results.map(
            (movie) =>
              `🎬 <b>${
                movie.title
              }</b> (${
                movie.year || "?"
              })\n🔗 ${
                movie.url || ""
              }`
          );

        await ctx.reply(
          lines.join("\n\n"),
          {
            parse_mode: "HTML",

            reply_markup:
              mainMenuKeyboard,
          }
        );
      } else {
        await ctx.reply(
          typeof results ===
            "string"
            ? results
            : "❌ Kino topilmadi.",

          {
            reply_markup:
              mainMenuKeyboard,
          }
        );
      }

      return;
    }

    /* INTERNET */

    if (
      user.mode === "search"
    ) {
      const waitMsg =
        await ctx.reply(
          "🔍 Internetdan ma'lumot qidirilmoqda..."
        );

      const results =
        await webSearch(
          text.trim()
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
          (result) =>
            `▶️ <b>${result.title}</b>\n🔗 ${result.url}`
        );

      await ctx.reply(
        `🌐 <b>Qidiruv natijalari:</b>\n\n` +
          lines.join("\n\n"),

        {
          parse_mode: "HTML",

          reply_markup:
            mainMenuKeyboard,
        }
      );

      return;
    }

    /* IMAGE */

    if (
      user.mode === "image"
    ) {
      const wait =
        await ctx.reply(
          "🎨 Rasm yaratilmoqda..."
        );

      try {
        const imageUrl =
          await generateImage(
            text.trim()
          );

        await ctx.api
          .deleteMessage(
            ctx.chat.id,
            wait.message_id
          )
          .catch(() => {});

        if (!imageUrl) {
          throw new Error(
            "Rasm URL qaytmadi"
          );
        }

        await ctx.replyWithPhoto(
          imageUrl,
          {
            caption: "🎨 Tayyor!",

            reply_markup:
              mainMenuKeyboard,
          }
        );

        user.mode = "ai";

        await user.save();
      } catch (error) {
        await ctx.api
          .deleteMessage(
            ctx.chat.id,
            wait.message_id
          )
          .catch(() => {});

        await ctx.reply(
          `❌ ${error.message}`,

          {
            reply_markup:
              mainMenuKeyboard,
          }
        );
      }

      return;
    }

    /* =================================================
       NORMAL AI CHAT
    ================================================= */

    const waitMessage =
      await ctx.reply(
        `🤖 ${getProviderName(
          user.aiProvider || "auto"
        )} ishlayapti...`
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
      history.map((memory) => ({
        role: memory.role,

        content:
          memory.content,
      }));

    let answer = "";

    try {
      answer =
        await queryAI(
          messages,

          lang,

          user.aiProvider ||
            "auto"
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
        "❌ Tanlangan AI javob bermadi.\n\n" +
          "🤖 AI Chat tugmasini bosib boshqa AI tanlang.",

        {
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

    await ctx
      .reply(
        "🙏 Kutilmagan nosozlik yuz berdi.",
        {
          reply_markup:
            mainMenuKeyboard,
        }
      )
      .catch(() => {});
  }
}
