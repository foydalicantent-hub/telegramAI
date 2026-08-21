```js
import axios from "axios";
import { config } from "./env.js";
import { AI_MODELS } from "./constants.js";
import { logger } from "./logger.js";

/* =========================================================
   TILLAR
========================================================= */

const LANGUAGE_NAMES = {
  uz: "Uzbek",
  ru: "Russian",
  en: "English",
};

/* =========================================================
   SYSTEM PROMPT
========================================================= */

function systemPrompt(lang) {
  const languageName = LANGUAGE_NAMES[lang] || "Uzbek";

  return {
    role: "system",
    content:
      `You are a helpful, friendly assistant inside a Telegram bot. ` +
      `Always reply in ${languageName}, regardless of the language used earlier, ` +
      `unless the user explicitly asks you to switch languages. ` +
      `Keep answers concise, useful and clear.`,
  };
}

/* =========================================================
   1. GROQ
========================================================= */

async function callGroq(messages) {
  if (!config.keys.groq) {
    throw new Error("Groq API key missing");
  }

  const res = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: AI_MODELS.GROQ || "openai/gpt-oss-120b",
      messages,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${config.keys.groq}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const answer = res.data?.choices?.[0]?.message?.content;

  if (!answer || !answer.trim()) {
    throw new Error("Groq returned an empty response");
  }

  return answer.trim();
}

/* =========================================================
   2. OPENROUTER
========================================================= */

async function callOpenRouter(messages) {
  if (!config.keys.openrouter) {
    throw new Error("OpenRouter API key missing");
  }

  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model:
        AI_MODELS.OPENROUTER_FALLBACK ||
        "openrouter/free",

      messages,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${config.keys.openrouter}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.OPENROUTER_SITE_URL || "https://telegram-ai-bot.local",
        "X-Title":
          process.env.OPENROUTER_APP_NAME || "Telegram AI Bot",
      },
      timeout: 30000,
    }
  );

  const answer = res.data?.choices?.[0]?.message?.content;

  if (!answer || !answer.trim()) {
    throw new Error("OpenRouter returned an empty response");
  }

  return answer.trim();
}

/* =========================================================
   3. GEMINI 2.5 FLASH
========================================================= */

async function callGemini(messages) {
  if (!config.keys.gemini) {
    throw new Error("Gemini API key missing");
  }

  const model =
    AI_MODELS.GEMINI || "gemini-2.5-flash";

  /* System promptni alohida olamiz */
  const systemMessages = messages
    .filter((message) => message.role === "system")
    .map((message) => String(message.content || ""))
    .join("\n\n");

  /* Gemini formatiga o'tkazamiz */
  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role:
        message.role === "assistant"
          ? "model"
          : "user",

      parts: [
        {
          text: String(message.content || ""),
        },
      ],
    }));

  /*
    Gemini conversation boshida user/model tartibi
    noto'g'ri bo'lib qolmasligi uchun bo'sh xabarlarni olib tashlaymiz.
  */
  const validContents = contents.filter(
    (item) =>
      item.parts?.[0]?.text &&
      item.parts[0].text.trim()
  );

  if (!validContents.length) {
    throw new Error("Gemini received no valid messages");
  }

  const body = {
    contents: validContents,
    generationConfig: {
      temperature: 0.7,
    },
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

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${model}:generateContent?key=${encodeURIComponent(
      config.keys.gemini
    )}`;

  const res = await axios.post(
    url,
    body,
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const answer =
    res.data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

  if (!answer) {
    const finishReason =
      res.data?.candidates?.[0]?.finishReason;

    throw new Error(
      `Gemini returned an empty response${
        finishReason
          ? ` (${finishReason})`
          : ""
      }`
    );
  }

  return answer;
}

/* =========================================================
   4. CLAUDE
========================================================= */

async function callClaude(messages) {
  if (!config.keys.claude) {
    throw new Error("Claude API key missing");
  }

  const model =
    AI_MODELS.CLAUDE ||
    "claude-sonnet-4-5";

  const systemMessages = messages
    .filter((message) => message.role === "system")
    .map((message) => String(message.content || ""))
    .join("\n\n");

  const claudeMessages = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role:
        message.role === "assistant"
          ? "assistant"
          : "user",

      content: String(message.content || ""),
    }));

  const requestBody = {
    model,
    max_tokens: 2048,
    messages: claudeMessages,
  };

  if (systemMessages) {
    requestBody.system = systemMessages;
  }

  const res = await axios.post(
    "https://api.anthropic.com/v1/messages",
    requestBody,
    {
      headers: {
        "x-api-key": config.keys.claude,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const answer = res.data?.content
    ?.filter((item) => item.type === "text")
    ?.map((item) => item.text || "")
    ?.join("")
    ?.trim();

  if (!answer) {
    throw new Error(
      "Claude returned an empty response"
    );
  }

  return answer;
}

/* =========================================================
   5. OPENAI
========================================================= */

async function callOpenAI(messages) {
  if (!config.keys.openai) {
    throw new Error("OpenAI API key missing");
  }

  const model =
    AI_MODELS.OPENAI ||
    "gpt-5-mini";

  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      messages,
    },
    {
      headers: {
        Authorization: `Bearer ${config.keys.openai}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const answer =
    res.data?.choices?.[0]?.message?.content
      ?.trim();

  if (!answer) {
    throw new Error(
      "OpenAI returned an empty response"
    );
  }

  return answer;
}

/* =========================================================
   UNIVERSAL AI FALLBACK
========================================================= */

export async function queryAI(history, lang) {
  const messages = [
    systemPrompt(lang),
    ...history,
  ];

  /* ---------------------------------------------
     1. GROQ
  --------------------------------------------- */

  if (config.keys.groq) {
    try {
      const result = await callGroq(messages);

      if (result) {
        logger.info(
          "✅ AI provider: Groq"
        );

        return result;
      }
    } catch (error) {
      logger.error(
        `❌ Groq AI error: ${
          error.response?.status || ""
        } ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /* ---------------------------------------------
     2. OPENROUTER
  --------------------------------------------- */

  if (config.keys.openrouter) {
    try {
      const result =
        await callOpenRouter(messages);

      if (result) {
        logger.info(
          "✅ AI provider: OpenRouter"
        );

        return result;
      }
    } catch (error) {
      logger.error(
        `❌ OpenRouter AI error: ${
          error.response?.status || ""
        } ${
          error.response?.data?.error?.message ||
          error.message
        }`
      );
    }
  }

  /* ---------------------------------------------
     3. GEMINI 2.5 FLASH
  --------------------------------------------- */

  if (config.keys.gemini) {
    try {
      const result =
        await callGemini(messages);

      if (result) {
        logger.info(
          "✅ AI provider: Gemini 2.5 Flash"
        );

        return result;
      }
    } catch (error) {
      logger.error(
        `❌ Gemini AI error: ${
          error.response?.status || ""
        } ${
          error.response?.data?.error?.message ||
          error.message
        }`
      );
    }
  }

  /* ---------------------------------------------
     4. CLAUDE
  --------------------------------------------- */

  if (config.keys.claude) {
    try {
      const result =
        await callClaude(messages);

      if (result) {
        logger.info(
          "✅ AI provider: Claude"
        );

        return result;
      }
    } catch (error) {
      logger.error(
        `❌ Claude AI error: ${
          error.response?.status || ""
        } ${
          error.response?.error?.message ||
          error.message
        }`
      );
    }
  }

  /* ---------------------------------------------
     5. OPENAI
  --------------------------------------------- */

  if (config.keys.openai) {
    try {
      const result =
        await callOpenAI(messages);

      if (result) {
        logger.info(
          "✅ AI provider: OpenAI"
        );

        return result;
      }
    } catch (error) {
      logger.error(
        `❌ OpenAI AI error: ${
          error.response?.status || ""
        } ${
          error.response?.data?.error?.message ||
          error.message
        }`
      );
    }
  }

  throw new Error(
    "All AI providers failed"
  );
}

/* =========================================================
   IMAGE GENERATION — OPENAI
========================================================= */

export async function generateImage(
  promptText
) {
  try {
    if (!config.keys.openai) {
      throw new Error(
        "OpenAI API key missing"
      );
    }

    const res = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        model:
          process.env.OPENAI_IMAGE_MODEL ||
          "dall-e-3",

        prompt: promptText,

        n: 1,

        size: "1024x1024",
      },
      {
        headers: {
          Authorization: `Bearer ${config.keys.openai}`,
          "Content-Type":
            "application/json",
        },
        timeout: 60000,
      }
    );

    return (
      res.data?.data?.[0]?.url ||
      null
    );
  } catch (error) {
    logger.error(
      `❌ Image generation error: ${
        error.response?.status || ""
      } ${
        error.response?.data?.error?.message ||
        error.message
      }`
    );

    return null;
  }
}

/* =========================================================
   CLAUDE DIRECT QUERY
========================================================= */

export async function queryClaude(
  prompt
) {
  try {
    if (!config.keys.claude) {
      throw new Error(
        "Claude API key missing"
      );
    }

    const result =
      await callClaude([
        {
          role: "user",
          content: String(prompt),
        },
      ]);

    return result;
  } catch (error) {
    logger.error(
      `❌ Claude AI error: ${
        error.response?.status || ""
      } ${
        error.response?.data?.error?.message ||
        error.message
      }`
    );

    return "❌ Claude AI bilan bog'lanishda xatolik yuz berdi.";
  }
}

/* =========================================================
   KINO QIDIRISH
========================================================= */

export async function searchMovie(
  movieName
) {
  try {
    const messages = [
      {
        role: "system",
        content:
          "Sen professional kino ekspertisan. " +
          "Foydalanuvchi yozgan kino yoki serial haqida " +
          "aniq ma'lumot ber: nomi, chiqqan yili, " +
          "rejissyori, bosh rollar va qisqacha mazmuni.",
      },

      {
        role: "user",
        content: String(movieName),
      },
    ];

    return await queryAI(
      messages,
      "uz"
    );
  } catch (error) {
    logger.error(
      `❌ Movie search error: ${error.message}`
    );

    return "❌ Kino qidirishda xatolik yuz berdi.";
  }
}

/* =========================================================
   INTERNET QIDIRUV
========================================================= */

export async function searchInternet(
  query
) {
  try {
    const messages = [
      {
        role: "system",
        content:
          "Sen internet qidiruv assistentisan. " +
          "Foydalanuvchi so'roviga aniq, ishonchli " +
          "va tushunarli javob ber.",
      },

      {
        role: "user",
        content: String(query),
      },
    ];

    return await queryAI(
      messages,
      "uz"
    );
  } catch (error) {
    logger.error(
      `❌ Internet search error: ${error.message}`
    );

    return "❌ Internetdan qidirishda xatolik yuz berdi.";
  }
}
```
