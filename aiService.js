import axios from "axios";
import { config } from "./env.js";
import { AI_MODELS } from "./constants.js";
import { logger } from "./logger.js";

const LANGUAGE_NAMES = {
  uz: "Uzbek",
  ru: "Russian",
  en: "English",
};

function systemPrompt(lang) {
  const languageName = LANGUAGE_NAMES[lang] || "Uzbek";

  return {
    role: "system",
    content:
      `You are a helpful, friendly assistant inside a Telegram bot. ` +
      `Always reply in ${languageName}, regardless of the language used in earlier messages, ` +
      `unless the user explicitly asks you to switch languages. Keep answers concise and clear.`,
  };
}

/* =========================
   GROQ
========================= */
async function callGroq(messages) {
  const res = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: AI_MODELS.GROQ,
      messages,
    },
    {
      headers: {
        Authorization: `Bearer ${config.keys.groq}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return res.data.choices?.[0]?.message?.content?.trim() || "";
}

/* =========================
   OPENROUTER
========================= */
async function callOpenRouter(messages) {
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: AI_MODELS.OPENROUTER_FALLBACK,
      messages,
    },
    {
      headers: {
        Authorization: `Bearer ${config.keys.openrouter}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return res.data.choices?.[0]?.message?.content?.trim() || "";
}

/* =========================
   GEMINI 2.5 FLASH
========================= */
async function callGemini(messages) {
  if (!config.keys.gemini) {
    throw new Error("Gemini API key missing");
  }

  const systemMessages = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [
        {
          text: String(m.content || ""),
        },
      ],
    }));

  const model = AI_MODELS.GEMINI || "gemini-2.5-flash";

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${model}:generateContent?key=${config.keys.gemini}`;

  const body = {
    contents,
  };

  if (systemMessages) {
    body.systemInstruction = {
      parts: [
        {
          text: systemMessages,
        },
      ],
    };
  }

  const res = await axios.post(url, body, {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  return (
    res.data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || ""
  );
}

/* =========================
   AI FALLBACK SYSTEM
   Groq → OpenRouter → Gemini
========================= */
export async function queryAI(history, lang) {
  const messages = [systemPrompt(lang), ...history];

  // 1️⃣ GROQ
  if (config.keys.groq) {
    try {
      const result = await callGroq(messages);

      if (result) {
        logger.info("AI provider: Groq");
        return result;
      }
    } catch (error) {
      logger.error(
        `Groq AI error: ${error.response?.status || ""} ${error.message}`
      );
    }
  }

  // 2️⃣ OPENROUTER
  if (config.keys.openrouter) {
    try {
      const result = await callOpenRouter(messages);

      if (result) {
        logger.info("AI provider: OpenRouter");
        return result;
      }
    } catch (error) {
      logger.error(
        `OpenRouter AI error: ${error.response?.status || ""} ${error.message}`
      );
    }
  }

  // 3️⃣ GEMINI 2.5 FLASH
  if (config.keys.gemini) {
    try {
      const result = await callGemini(messages);

      if (result) {
        logger.info("AI provider: Gemini 2.5 Flash");
        return result;
      }
    } catch (error) {
      logger.error(
        `Gemini AI error: ${error.response?.status || ""} ${error.message}`
      );
    }
  }

  throw new Error("All AI providers failed");
}

/* =========================
   IMAGE GENERATION
========================= */
export async function generateImage(promptText) {
  try {
    if (!config.keys.openai) {
      throw new Error("OpenAI API key missing");
    }

    const res = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        model: "dall-e-3",
        prompt: promptText,
        n: 1,
        size: "1024x1024",
      },
      {
        headers: {
          Authorization: `Bearer ${config.keys.openai}`,
          "Content-Type": "application/json",
        },
        timeout: 45000,
      }
    );

    return res.data.data?.[0]?.url || null;
  } catch (error) {
    logger.error(`Image generation error: ${error.message}`);
    return null;
  }
}

/* =========================
   CLAUDE
========================= */
export async function queryClaude(prompt) {
  try {
    if (!config.keys.claude) {
      throw new Error("Claude API key missing");
    }

    const res = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          "x-api-key": config.keys.claude,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return res.data.content?.[0]?.text?.trim() || "";
  } catch (error) {
    logger.error(`Claude AI error: ${error.message}`);
    return "❌ Claude AI bilan bog'lanishda xatolik yuz berdi.";
  }
}

/* =========================
   KINO QIDIRISH
========================= */
export async function searchMovie(movieName) {
  try {
    const messages = [
      {
        role: "system",
        content:
          "Sen professional kino ekspertisan. Foydalanuvchi yozgan kino yoki serial haqida aniq ma'lumot ber: nomi, chiqqan yili, rejissyori, bosh rollar, qisqacha mazmuni va uni qayerdan topish mumkinligi.",
      },
      {
        role: "user",
        content: movieName,
      },
    ];

    return await queryAI(messages, "uz");
  } catch (error) {
    logger.error(`Movie search error: ${error.message}`);
    return "❌ Kino qidirishda xatolik yuz berdi.";
  }
}

/* =========================
   INTERNET QIDIRUV
========================= */
export async function searchInternet(query) {
  try {
    const messages = [
      {
        role: "system",
        content:
          "Sen internet qidiruv assistentisan. Foydalanuvchi so'roviga eng aniq, ishonchli va so'nggi ma'lumotlarga asoslanib javob ber.",
      },
      {
        role: "user",
        content: query,
      },
    ];

    return await queryAI(messages, "uz");
  } catch (error) {
    logger.error(`Internet search error: ${error.message}`);
    return "❌ Internetdan qidirishda xatolik yuz berdi.";
  }
}
