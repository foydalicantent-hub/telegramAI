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

async function callGroq(messages) {
  const res = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    { model: AI_MODELS.GROQ, messages },
    {
      headers: {
        Authorization: `Bearer ${config.keys.groq}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return res.data.choices[0]?.message?.content?.trim() || "";
}

async function callOpenRouter(messages) {
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    { model: AI_MODELS.OPENROUTER_FALLBACK, messages },
    {
      headers: {
        Authorization: `Bearer ${config.keys.openrouter}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return res.data.choices[0]?.message?.content?.trim() || "";
}

/**
 * Query the AI with conversation history, falling back to OpenRouter if Groq fails.
 * @param {{role: string, content: string}[]} history
 * @param {string} lang - "uz" | "ru" | "en"
 */
export async function queryAI(history, lang) {
  const messages = [systemPrompt(lang), ...history];

  if (config.keys.groq) {
    try {
      return await callGroq(messages);
    } catch (error) {
      logger.error(`Groq AI error: ${error.message}`);
    }
  }

  if (config.keys.openrouter) {
    try {
      return await callOpenRouter(messages);
    } catch (error) {
      logger.error(`OpenRouter AI error: ${error.message}`);
    }
  }

  throw new Error("All AI providers failed");
}
