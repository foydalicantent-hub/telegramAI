import axios from "axios";
import { config } from "./env.js";
import { AI_MODELS } from "./constants.js";
import { logger } from "./logger.js";

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
      `You are a helpful, friendly Telegram AI assistant. ` +
      `Always answer in ${languageName}. ` +
      `Do not switch languages unless the user explicitly asks. ` +
      `Understand the user's question carefully before answering. ` +
      `Give accurate, natural and useful answers. ` +
      `Keep answers reasonably concise.`,
  };
}

/* =========================================================
   ERROR HELPER
========================================================= */

function providerError(provider, error) {
  const status = error?.response?.status || "NO_STATUS";

  const apiMessage =
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "Unknown error";

  logger.error(
    `${provider} AI error: ${status} ${apiMessage}`
  );

  return new Error(
    `${provider}: ${status} ${apiMessage}`
  );
}

/* =========================================================
   GROQ
========================================================= */

async function callGroq(messages) {
  if (!config.keys.groq) {
    throw new Error("GROQ_API_KEY missing");
  }

  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",

      {
        model:
          config.models.groq ||
          AI_MODELS.GROQ,

        messages,

        temperature: 0.4,

        max_tokens: 1200,
      },

      {
        headers: {
          Authorization:
            `Bearer ${config.keys.groq}`,

          "Content-Type":
            "application/json",
        },

        timeout:
          config.timeouts.groq,
      }
    );

    const answer =
      res.data?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error("Groq returned empty response");
    }

    return answer;
  } catch (error) {
    throw providerError("Groq", error);
  }
}

/* =========================================================
   OPENROUTER
========================================================= */

async function callOpenRouter(messages) {
  if (!config.keys.openrouter) {
    throw new Error("OPENROUTER_API_KEY missing");
  }

  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",

      {
        model:
          config.models.openrouter ||
          AI_MODELS.OPENROUTER_FALLBACK,

        messages,

        temperature: 0.4,

        max_tokens: 1200,
      },

      {
        headers: {
          Authorization:
            `Bearer ${config.keys.openrouter}`,

          "Content-Type":
            "application/json",

          "HTTP-Referer":
            "https://telegram-ai-bot.onrender.com",

          "X-Title":
            "Telegram AI Bot",
        },

        timeout:
          config.timeouts.openrouter,
      }
    );

    const answer =
      res.data?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error(
        "OpenRouter returned empty response"
      );
    }

    return answer;
  } catch (error) {
    throw providerError("OpenRouter", error);
  }
}

/* =========================================================
   GEMINI 2.5 FLASH
========================================================= */

async function callGemini(messages) {
  if (!config.keys.gemini) {
    throw new Error("GEMINI_API_KEY missing");
  }

  try {
    const systemMessages = messages
      .filter((message) => message.role === "system")
      .map((message) => String(message.content || ""))
      .join("\n\n");

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

    if (!contents.length) {
      throw new Error(
        "Gemini received empty conversation"
      );
    }

    const model =
      config.models.gemini ||
      AI_MODELS.GEMINI ||
      "gemini-2.5-flash";

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${model}:generateContent`;

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

    const res = await axios.post(
      url,
      body,

      {
        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            config.keys.gemini,
        },

        timeout:
          config.timeouts.gemini,
      }
    );

    const answer =
      res.data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();

    if (!answer) {
      const reason =
        res.data?.promptFeedback?.blockReason ||
        res.data?.candidates?.[0]?.finishReason ||
        "empty response";

      throw new Error(
        `Gemini returned no text: ${reason}`
      );
    }

    return answer;
  } catch (error) {
    throw providerError("Gemini", error);
  }
}

/* =========================================================
   CLAUDE
========================================================= */

async function callClaude(messages) {
  if (!config.keys.claude) {
    throw new Error("CLAUDE_API_KEY missing");
  }

  try {
    /*
     * Claude Messages API system promptni alohida qabul qiladi.
     */

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

        content: String(
          message.content || ""
        ),
      }));

    const body = {
      model:
        config.models.claude ||
        AI_MODELS.CLAUDE,

      max_tokens: 1200,

      messages: claudeMessages,
    };

    if (systemMessages) {
      body.system = systemMessages;
    }

    const res = await axios.post(
      "https://api.anthropic.com/v1/messages",

      body,

      {
        headers: {
          "x-api-key":
            config.keys.claude,

          "anthropic-version":
            "2023-06-01",

          "Content-Type":
            "application/json",
        },

        timeout:
          config.timeouts.claude,
      }
    );

    const answer =
      res.data?.content
        ?.filter((item) => item.type === "text")
        ?.map((item) => item.text)
        ?.join("")
        ?.trim();

    if (!answer) {
      throw new Error(
        "Claude returned empty response"
      );
    }

    return answer;
  } catch (error) {
    throw providerError("Claude", error);
  }
}

/* =========================================================
   OPENAI
========================================================= */

async function callOpenAI(messages) {
  if (!config.keys.openai) {
    throw new Error("OPENAI_API_KEY missing");
  }

  try {
    /*
     * OpenAI Responses API.
     */

    const responseInput = messages.map(
      (message) => ({
        role:
          message.role === "assistant"
            ? "assistant"
            : message.role === "system"
            ? "system"
            : "user",

        content:
          String(message.content || ""),
      })
    );

    const res = await axios.post(
      "https://api.openai.com/v1/responses",

      {
        model:
          config.models.openai ||
          AI_MODELS.OPENAI,

        input: responseInput,

        max_output_tokens: 1200,
      },

      {
        headers: {
          Authorization:
            `Bearer ${config.keys.openai}`,

          "Content-Type":
            "application/json",
        },

        timeout:
          config.timeouts.openai,
      }
    );

    /*
     * Eng oddiy output_text.
     */
    if (
      typeof res.data?.output_text ===
      "string"
    ) {
      const answer =
        res.data.output_text.trim();

      if (answer) {
        return answer;
      }
    }

    /*
     * Fallback parser.
     */
    const answer =
      res.data?.output
        ?.flatMap((item) =>
          item.content || []
        )
        ?.filter(
          (item) =>
            item.type === "output_text"
        )
        ?.map(
          (item) => item.text || ""
        )
        ?.join("")
        ?.trim();

    if (!answer) {
      throw new Error(
        "OpenAI returned empty response"
      );
    }

    return answer;
  } catch (error) {
    throw providerError("OpenAI", error);
  }
}

/* =========================================================
   PROVIDER CALLER
========================================================= */

async function callProvider(
  provider,
  messages
) {
  switch (provider) {
    case "groq":
      return await callGroq(messages);

    case "openrouter":
      return await callOpenRouter(messages);

    case "gemini":
      return await callGemini(messages);

    case "claude":
      return await callClaude(messages);

    case "openai":
      return await callOpenAI(messages);

    default:
      throw new Error(
        `Unknown AI provider: ${provider}`
      );
  }
}

/* =========================================================
   AUTO FALLBACK
========================================================= */

const AUTO_PROVIDERS = [
  "groq",
  "openrouter",
  "gemini",
  "claude",
  "openai",
];

async function queryAuto(messages) {
  const available = AUTO_PROVIDERS.filter(
    (provider) => {
      return Boolean(
        config.keys[provider]
      );
    }
  );

  if (!available.length) {
    throw new Error(
      "No AI provider API keys configured"
    );
  }

  const errors = [];

  for (const provider of available) {
    try {
      const result =
        await callProvider(
          provider,
          messages
        );

      if (result) {
        logger.info(
          `AI provider: ${provider}`
        );

        return result;
      }
    } catch (error) {
      errors.push(
        `${provider}: ${error.message}`
      );

      /*
       * Auto rejimida xato bo'lsa keyingisiga
       * o'tadi.
       */
      logger.error(
        `Auto fallback: ${provider} failed`
      );
    }
  }

  throw new Error(
    `All AI providers failed: ${errors.join(
      " | "
    )}`
  );
}

/* =========================================================
   MAIN AI FUNCTION
========================================================= */

export async function queryAI(
  history,
  lang,
  provider = "auto"
) {
  const messages = [
    systemPrompt(lang),
    ...history,
  ];

  /*
   * Noto'g'ri provider yuborilsa Auto ishlaydi.
   */
  const allowed = [
    "auto",
    "groq",
    "openrouter",
    "gemini",
    "claude",
    "openai",
  ];

  if (!allowed.includes(provider)) {
    provider = "auto";
  }

  /*
   * AUTO
   */
  if (provider === "auto") {
    return await queryAuto(messages);
  }

  /*
   * MANUAL PROVIDER
   *
   * Masalan Gemini tanlangan bo'lsa,
   * faqat Gemini ishlaydi.
   */
  try {
    const result =
      await callProvider(
        provider,
        messages
      );

    if (!result) {
      throw new Error(
        `${provider} returned empty response`
      );
    }

    logger.info(
      `AI provider: ${provider}`
    );

    return result;
  } catch (error) {
    /*
     * Manual rejimda boshqa AI'ga
     * yashirincha o'tmaymiz.
     */
    logger.error(
      `Selected AI (${provider}) failed: ${error.message}`
    );

    throw error;
  }
}

/* =========================================================
   IMAGE GENERATION
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
        model: "gpt-image-2",

        prompt: promptText,

        n: 1,

        size: "1024x1024",
      },

      {
        headers: {
          Authorization:
            `Bearer ${config.keys.openai}`,

          "Content-Type":
            "application/json",
        },

        timeout: 45000,
      }
    );

    return (
      res.data?.data?.[0]?.url ||
      null
    );
  } catch (error) {
    logger.error(
      `Image generation error: ${error.message}`
    );

    return null;
  }
}

/* =========================================================
   CLAUDE DIRECT
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

    return await callClaude([
      {
        role: "user",
        content: prompt,
      },
    ]);
  } catch (error) {
    logger.error(
      `Claude direct error: ${error.message}`
    );

    return "❌ Claude bilan bog'lanishda xatolik yuz berdi.";
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
          "Foydalanuvchi yozgan kino yoki serial " +
          "haqida aniq va qisqa ma'lumot ber. " +
          "Nomini, yilini, janrini, rejissyorini, " +
          "asosiy aktyorlarini va qisqacha mazmunini ayt.",
      },

      {
        role: "user",

        content: movieName,
      },
    ];

    return await queryAI(
      messages,
      "uz",
      "auto"
    );
  } catch (error) {
    logger.error(
      `Movie AI error: ${error.message}`
    );

    return "";
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
          "Foydalanuvchi so'rovini tushunib, " +
          "aniq va foydali javob ber.",
      },

      {
        role: "user",

        content: query,
      },
    ];

    return await queryAI(
      messages,
      "uz",
      "auto"
    );
  } catch (error) {
    logger.error(
      `Internet AI error: ${error.message}`
    );

    return "";
  }
}
