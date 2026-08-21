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
      `You are a helpful Telegram bot assistant. ` +
      `Always answer in ${languageName}. ` +
      `Keep answers concise, useful and easy to understand.`,
  };
}

function getResponseText(data) {
  return (
    data?.choices?.[0]?.message?.content?.trim() ||
    ""
  );
}

function getErrorText(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "Unknown error"
  );
}

/* =====================================================
   GROQ
===================================================== */

async function callGroq(messages) {
  if (!config.keys.groq) {
    throw new Error("GROQ_API_KEY missing");
  }

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",

    {
      model: AI_MODELS.GROQ,
      messages,
      temperature: 0.4,
      max_tokens: 1200,
    },

    {
      headers: {
        Authorization: `Bearer ${config.keys.groq}`,
        "Content-Type": "application/json",
      },

      timeout: 12000,
    }
  );

  const answer = getResponseText(response.data);

  if (!answer) {
    throw new Error("Groq empty response");
  }

  return answer;
}

/* =====================================================
   CEREBRAS
===================================================== */

async function callCerebras(messages) {
  if (!config.keys.cerebras) {
    throw new Error("CEREBRAS_API_KEY missing");
  }

  const response = await axios.post(
    "https://api.cerebras.ai/v1/chat/completions",

    {
      model: AI_MODELS.CEREBRAS,
      messages,
      max_tokens: 1200,
      temperature: 0.4,
    },

    {
      headers: {
        Authorization: `Bearer ${config.keys.cerebras}`,
        "Content-Type": "application/json",
      },

      timeout: 12000,
    }
  );

  const answer = getResponseText(response.data);

  if (!answer) {
    throw new Error("Cerebras empty response");
  }

  return answer;
}

/* =====================================================
   GEMINI 2.5 FLASH
===================================================== */

async function callGemini(messages) {
  if (!config.keys.gemini) {
    throw new Error("GEMINI_API_KEY missing");
  }

  const systemMessages = messages
    .filter((m) => m.role === "system")
    .map((m) => String(m.content || ""))
    .join("\n\n");

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role:
        m.role === "assistant"
          ? "model"
          : "user",

      parts: [
        {
          text: String(m.content || ""),
        },
      ],
    }));

  if (!contents.length) {
    contents.push({
      role: "user",

      parts: [
        {
          text: "Salom",
        },
      ],
    });
  }

  const body = {
    contents,

    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1200,
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

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.GEMINI}:generateContent`,

    body,

    {
      headers: {
        "x-goog-api-key": config.keys.gemini,
        "Content-Type": "application/json",
      },

      timeout: 12000,
    }
  );

  const answer =
    response.data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "";

  if (!answer) {
    throw new Error("Gemini empty response");
  }

  return answer;
}

/* =====================================================
   MISTRAL
===================================================== */

async function callMistral(messages) {
  if (!config.keys.mistral) {
    throw new Error("MISTRAL_API_KEY missing");
  }

  const response = await axios.post(
    "https://api.mistral.ai/v1/chat/completions",

    {
      model: AI_MODELS.MISTRAL,
      messages,
      max_tokens: 1200,
      temperature: 0.4,
    },

    {
      headers: {
        Authorization: `Bearer ${config.keys.mistral}`,
        "Content-Type": "application/json",
      },

      timeout: 15000,
    }
  );

  const answer = getResponseText(response.data);

  if (!answer) {
    throw new Error("Mistral empty response");
  }

  return answer;
}

/* =====================================================
   COHERE
===================================================== */

async function callCohere(messages) {
  if (!config.keys.cohere) {
    throw new Error("COHERE_API_KEY missing");
  }

  const response = await axios.post(
    "https://api.cohere.com/v2/chat",

    {
      model: AI_MODELS.COHERE,
      messages,
      temperature: 0.4,
      max_tokens: 1200,
    },

    {
      headers: {
        Authorization: `Bearer ${config.keys.cohere}`,
        "Content-Type": "application/json",
      },

      timeout: 15000,
    }
  );

  const content = response.data?.message?.content;

  let answer = "";

  if (Array.isArray(content)) {
    answer = content
      .map((part) => part?.text || "")
      .join("")
      .trim();
  } else if (typeof content === "string") {
    answer = content.trim();
  }

  if (!answer) {
    throw new Error("Cohere empty response");
  }

  return answer;
}

/* =====================================================
   HUGGING FACE
===================================================== */

async function callHuggingFace(messages) {
  if (!config.keys.huggingface) {
    throw new Error("HF_API_KEY missing");
  }

  const response = await axios.post(
    "https://router.huggingface.co/v1/chat/completions",

    {
      model: AI_MODELS.HUGGINGFACE,
      messages,
      temperature: 0.4,
      max_tokens: 1200,
    },

    {
      headers: {
        Authorization: `Bearer ${config.keys.huggingface}`,
        "Content-Type": "application/json",
      },

      timeout: 20000,
    }
  );

  const answer = getResponseText(response.data);

  if (!answer) {
    throw new Error("Hugging Face empty response");
  }

  return answer;
}

/* =====================================================
   OPENROUTER
===================================================== */

async function callOpenRouter(messages) {
  if (!config.keys.openrouter) {
    throw new Error("OPENROUTER_API_KEY missing");
  }

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",

    {
      model: AI_MODELS.OPENROUTER,
      messages,
      max_tokens: 1200,
      temperature: 0.4,
    },

    {
      headers: {
        Authorization: `Bearer ${config.keys.openrouter}`,
        "Content-Type": "application/json",

        "HTTP-Referer":
          process.env.OPENROUTER_SITE_URL ||
          "https://telegram-ai-bot.local",

        "X-Title":
          process.env.OPENROUTER_APP_NAME ||
          "Telegram AI Bot",
      },

      timeout: 15000,
    }
  );

  const answer = getResponseText(response.data);

  if (!answer) {
    throw new Error("OpenRouter empty response");
  }

  return answer;
}

/* =====================================================
   CLAUDE
===================================================== */

async function callClaude(messages) {
  if (!config.keys.claude) {
    throw new Error("CLAUDE_API_KEY missing");
  }

  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => String(m.content || ""))
    .join("\n\n");

  const claudeMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role:
        m.role === "assistant"
          ? "assistant"
          : "user",

      content: String(m.content || ""),
    }));

  const body = {
    model: AI_MODELS.CLAUDE,

    max_tokens: 1200,

    messages: claudeMessages,
  };

  if (system) {
    body.system = system;
  }

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",

    body,

    {
      headers: {
        "x-api-key": config.keys.claude,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },

      timeout: 15000,
    }
  );

  const answer =
    response.data?.content
      ?.filter((part) => part.type === "text")
      ?.map((part) => part.text || "")
      ?.join("")
      ?.trim() || "";

  if (!answer) {
    throw new Error("Claude empty response");
  }

  return answer;
}

/* =====================================================
   PROVIDERS
===================================================== */

const PROVIDERS = {
  groq: {
    name: "Groq",
    key: "groq",
    call: callGroq,
  },

  cerebras: {
    name: "Cerebras",
    key: "cerebras",
    call: callCerebras,
  },

  gemini: {
    name: "Gemini 2.5 Flash",
    key: "gemini",
    call: callGemini,
  },

  mistral: {
    name: "Mistral",
    key: "mistral",
    call: callMistral,
  },

  cohere: {
    name: "Cohere",
    key: "cohere",
    call: callCohere,
  },

  huggingface: {
    name: "Hugging Face",
    key: "huggingface",
    call: callHuggingFace,
  },

  openrouter: {
    name: "OpenRouter Free",
    key: "openrouter",
    call: callOpenRouter,
  },

  claude: {
    name: "Claude",
    key: "claude",
    call: callClaude,
  },
};

/* =====================================================
   AVAILABLE PROVIDERS
===================================================== */

export function getAvailableProviders() {
  return Object.entries(PROVIDERS)
    .filter(([, provider]) =>
      Boolean(config.keys[provider.key])
    )
    .map(([id, provider]) => ({
      id,
      name: provider.name,
    }));
}

/* =====================================================
   PROVIDER NAME
===================================================== */

export function getProviderName(id) {
  if (id === "auto") {
    return "🔄 Avtomatik fallback";
  }

  return (
    PROVIDERS[id]?.name ||
    "🔄 Avtomatik fallback"
  );
}

/* =====================================================
   MAIN QUERY
===================================================== */

export async function queryAI(
  history,
  lang,
  provider = "auto"
) {
  const messages = [
    systemPrompt(lang),
    ...history,
  ];

  /* -----------------------------------------
     USER SELECTED AI
  ----------------------------------------- */

  if (provider !== "auto") {
    const selected = PROVIDERS[provider];

    if (!selected) {
      throw new Error(
        `Unknown AI provider: ${provider}`
      );
    }

    if (!config.keys[selected.key]) {
      throw new Error(
        `${selected.name} API key mavjud emas`
      );
    }

    try {
      const result =
        await selected.call(messages);

      if (!result) {
        throw new Error(
          `${selected.name} empty response`
        );
      }

      logger.info(
        `AI provider: ${selected.name}`
      );

      return result;
    } catch (error) {
      logger.error(
        `${selected.name} error: ${getErrorText(error)}`
      );

      throw new Error(
        `${selected.name}: ${getErrorText(error)}`
      );
    }
  }

  /* -----------------------------------------
     AUTOMATIC FALLBACK
  ----------------------------------------- */

  const available =
    Object.entries(PROVIDERS).filter(
      ([, providerData]) =>
        Boolean(config.keys[providerData.key])
    );

  if (!available.length) {
    throw new Error(
      "Hech qanday AI API key topilmadi"
    );
  }

  for (const [
    ,
    providerData,
  ] of available) {
    try {
      const result =
        await providerData.call(messages);

      if (result) {
        logger.info(
          `AI provider: ${providerData.name}`
        );

        return result;
      }
    } catch (error) {
      logger.error(
        `${providerData.name} error: ${getErrorText(error)}`
      );
    }
  }

  throw new Error(
    "Barcha AI providerlar ishlamadi"
  );
}

/* =====================================================
   OPENAI IMAGE GENERATION
===================================================== */

export async function generateImage(
  promptText
) {
  if (!config.keys.openai) {
    throw new Error(
      "OPENAI_API_KEY mavjud emas"
    );
  }

  try {
    const response = await axios.post(
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
          "Content-Type": "application/json",
        },

        timeout: 45000,
      }
    );

    return (
      response.data?.data?.[0]?.url ||
      null
    );
  } catch (error) {
    logger.error(
      `Image generation error: ${getErrorText(error)}`
    );

    throw new Error(
      `Rasm yaratish ishlamadi: ${getErrorText(error)}`
    );
  }
}

/* =====================================================
   CLAUDE DIRECT
===================================================== */

export async function queryClaude(prompt) {
  return queryAI(
    [
      {
        role: "user",
        content: String(prompt),
      },
    ],

    "uz",

    "claude"
  );
}

/* =====================================================
   MOVIE SEARCH AI
===================================================== */

export async function searchMovie(
  movieName
) {
  return queryAI(
    [
      {
        role: "system",

        content:
          "Sen professional kino ekspertisan. " +
          "Kino yoki serial haqida nomi, yili, " +
          "rejissyori, aktyorlari va qisqa mazmunini ayt. " +
          "Noma'lum ma'lumotni o'ylab topma.",
      },

      {
        role: "user",
        content: String(movieName),
      },
    ],

    "uz",

    "auto"
  );
}

/* =====================================================
   INTERNET SEARCH AI
===================================================== */

export async function searchInternet(
  query
) {
  return queryAI(
    [
      {
        role: "system",

        content:
          "Sen internet qidiruv yordamchisisan. " +
          "Aniq, qisqa va tushunarli javob ber. " +
          "Real vaqt ma'lumoti bo'lsa, uni alohida tekshirish kerak.",
      },

      {
        role: "user",
        content: String(query),
      },
    ],

    "uz",

    "auto"
  );
}
