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

// ================= YANGI QO'SHILGAN FUNKSIYALAR =================

/**
 * 🎨 Rasm Yaratish (OpenAI DALL-E 3)
 */
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

    return res.data.data[0]?.url || null;
  } catch (error) {
    logger.error(`Image generation error: ${error.message}`);
    return null;
  }
}

/**
 * 🧠 Claude AI orqali so'rov yuborish (Anthropic API)
 */
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
        messages: [{ role: "user", content: prompt }],
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

    return res.data.content[0]?.text?.trim() || "";
  } catch (error) {
    logger.error(`Claude AI error: ${error.message}`);
    return "❌ Claude AI bilan bog'lanishda xatolik yuz berdi.";
  }
}
