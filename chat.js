import { Memory } from "../models/Memory.js";
import { getOrCreateUser } from "../services/userService.js";
import { ensureLanguage } from "../models/User.js";
import { queryAI } from "../services/aiService.js";
import { searchMovie } from "../services/movieService.js";
import { webSearch } from "../services/searchService.js";
import { downloadMedia, isSocialMediaUrl } from "../services/downloaderService.js";
import { MEMORY_HISTORY_LIMIT } from "../config/constants.js";
import { logger } from "../utils/logger.js";
import { mainMenuKeyboard } from "../keyboards/mainMenu.js";
import fetch from "node-fetch";

export async function chatHandler(ctx) {
  try {
    const text = ctx.message.text;
    const user = await getOrCreateUser(ctx);
    const lang = ensureLanguage(user);

    if (text.startsWith("/")) {
      user.mode = "ai";
      await user.save();
      return;
    }

    // 📞 AGAR FOYDALANUVCHI KONTAKT BERGach XABAR YOZAYOTgan BO'lsa
    if (user.waitingForInstruction) {
      user.businessInstruction = text; // Siz yozgan matn avto-javob bo'lib saqlanadi
      user.waitingForInstruction = false; // Holatni yopamiz
      await user.save();

      await ctx.reply(
        `✅ **Avto-javob xabaringiz muvaffaqiyatli saqlandi!**\n\nEndi sizga yozgan har qanday insonga bot faqat mana shu xabarni yuboradi:\n👉 _"${text}"_`,
        { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
      );
      return;
    }

    // TUGMALAR ISHLOVI
    if (text === "🤖 AI Chat") {
      user.mode = "ai";
      await user.save();
      await ctx.reply("🤖 **AI Chat rejimi yoqildi.**\nIstalgan savolingizni yozing:", { parse_mode: "Markdown", reply_markup: mainMenuKeyboard });
      return;
    }

    if (text === "🎬 Kino Qidirish") {
      user.mode = "movie";
      await user.save();
      await ctx.reply("🎬 **Kino qidiruv rejimi yoqildi.**\nKino nomini yozing:", { parse_mode: "Markdown", reply_markup: mainMenuKeyboard });
      return;
    }

    if (text === "🔍 Internet Qidiruv") {
      user.mode = "search";
      await user.save();
      await ctx.reply("🔍 **Internet qidiruv rejimi yoqildi.**\nSo'rovingizni kiriting:", { parse_mode: "Markdown", reply_markup: mainMenuKeyboard });
      return;
    }

    if (text === "🔴 Dumaloq Video") {
      user.mode = "circle";
      await user.save();
      await ctx.reply("🔴 **Dumaloq video rejimi yoqildi.**\nIltimos, video yuboring yoki video havolasini (link) yuboring:", { parse_mode: "Markdown", reply_markup: mainMenuKeyboard });
      return;
    }

    if (text === "📜 Muloqot Tarixi") {
      const history = await Memory.find({ telegramId: user.telegramId }).sort({ createdAt: -1 }).limit(5);
      if (!history.length) {
        await ctx.reply("📜 Muloqot tarixi bo'sh.", { reply_markup: mainMenuKeyboard });
        return;
      }
      const textHist = history.reverse().map((h) => `${h.role === "user" ? "👤 Siz" : "🤖 AI"}: ${h.content}`).join("\n\n");
      await ctx.reply(`📜 **Oxirgi suhbatlar:**\n\n${textHist}`, { reply_markup: mainMenuKeyboard });
      return;
    }

    if (text === "⚙️ Sozlamalar") {
      await ctx.reply(
        `⚙️ **Sozlamalar:**\n\n🌐 Tilingiz: ${user.language || "uz"}\n🆔 Telegram ID: \`${user.telegramId}\`\n📞 Telefon raqam: \`${user.phoneNumber || "Ulanmagan"}\`\n\n📌 **Joriy avto-javob xabaringiz:**\n_${user.businessInstruction || "Hali o'rnatilmagan"}_`,
        { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
      );
      return;
    }

    // INSTAGRAM / TIKTOK / YOUTUBE HAVOLALARINI YUKLASH
    if (isSocialMediaUrl(text)) {
      const waitMsg = await ctx.reply("📥 Video serverdan yuklanmoqda...", { reply_markup: mainMenuKeyboard });
      const videoDirectUrl = await downloadMedia(text.trim());

      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});

      if (videoDirectUrl) {
        const videoRes = await fetch(videoDirectUrl);
        const arrayBuffer = await videoRes.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);

        if (user.mode === "circle") {
          try {
            await ctx.replyWithVideoNote(videoBuffer, { reply_markup: mainMenuKeyboard });
          } catch {
            await ctx.replyWithVideo(videoBuffer, { caption: "📹 Video yuklandi (Telegram faqat 1:1 kvadrat videolarni dumaloq qilishga ruxsat beradi)", reply_markup: mainMenuKeyboard });
          }
          user.mode = "ai";
          await user.save();
          return;
        }

        await ctx.replyWithVideo(videoBuffer, {
          caption: "📹 Video muvaffaqiyatli yuklab olindi!",
          reply_markup: mainMenuKeyboard,
        });
      } else {
        await ctx.reply("❌ Videoni yuklab bo'lmadi. Havola noto'g'ri yoki yopiq sahifadan olingan bo'lishi mumkin.", { reply_markup: mainMenuKeyboard });
      }
      return;
    }

    // AI VA QIDIRUV REJIMLARI
    if (user.mode === "movie") {
      const waitMsg = await ctx.reply("🎬 Film qidirilmoqda...");
      let results = await searchMovie(text.trim());

      if (!results || !results.length) {
        const fallbackResults = await webSearch(`${text.trim()} o'zbek kino film`);
        await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});

        if (fallbackResults && fallbackResults.length) {
          const lines = fallbackResults.map((r) => `🎬 **${r.title}**\n🔗 ${r.url}`);
          await ctx.reply(`🎬 **Topilgan kinolar:**\n\n${lines.join("\n\n")}`, { reply_markup: mainMenuKeyboard });
          return;
        }

        await ctx.reply("❌ Afsuski, bunday film topilmadi.", { reply_markup: mainMenuKeyboard });
        return;
      }

      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      const lines = results.map((m) => `🎬 **${m.title}** (${m.year})\n🔗 ${m.url}`);
      await ctx.reply(lines.join("\n\n"), { reply_markup: mainMenuKeyboard });
      return;
    }

    if (user.mode === "search") {
      const waitMsg = await ctx.reply("🔍 Internetdan ma'lumot qidirilmoqda...");
      const results = await webSearch(text.trim());
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});

      user.mode = "ai";
      await user.save();

      if (!results || !results.length) {
        await ctx.reply("❌ Natija topilmadi.", { reply_markup: mainMenuKeyboard });
        return;
      }

      const lines = results.map((r) => `▶️ **${r.title}**\n🔗 ${r.url}`);
      await ctx.reply(`🌐 **Qidiruv natijalari:**\n\n${lines.join("\n\n")}`, { reply_markup: mainMenuKeyboard });
      return;
    }

    // ODDIY AI CHAT REJIMI
    const waitMessage = await ctx.reply("🤖 O'ylanmoqdaman...");
    await Memory.create({ telegramId: user.telegramId, role: "user", content: text });

    const history = await Memory.find({ telegramId: user.telegramId })
      .sort({ createdAt: 1 })
      .limit(MEMORY_HISTORY_LIMIT);

    const messages = history.map((m) => ({ role: m.role, content: m.content }));

    let answer;
    try {
      answer = await queryAI(messages, lang);
    } catch (error) {
      logger.error(`AI chat error: ${error.message}`);
    }

    await ctx.api.deleteMessage(ctx.chat.id, waitMessage.message_id).catch(() => {});

    if (!answer || !answer.trim()) {
      await ctx.reply("🙏 Uzr so'raymiz! AI javob berishda biroz nosozlik bo'ldi, qayta urinib ko'ring.", { reply_markup: mainMenuKeyboard });
      return;
    }

    await Memory.create({ telegramId: user.telegramId, role: "assistant", content: answer });
    await ctx.reply(answer, { reply_markup: mainMenuKeyboard });

  } catch (error) {
    logger.error(`Chat handler error: ${error.message}`);
    await ctx.reply("🙏 Uzr so'raymiz! Kutilmagan nosozlik yuz berdi.", { reply_markup: mainMenuKeyboard }).catch(() => {});
  }
}