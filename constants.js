export const LANGUAGES = ["uz", "ru", "en"];

export const DEFAULT_LANGUAGE = "uz";

export const FREE_DAILY_LIMIT = 3;

export const PREMIUM_DURATION_DAYS = 30;

export const MEMORY_HISTORY_LIMIT = 20;

export const HISTORY_DISPLAY_LIMIT = 10;

/*
 * AI modellari
 *
 * Gemini:
 * gemini-2.5-flash — Google'ning barqaror 2.5 Flash modeli.
 */
export const AI_MODELS = {
  GROQ: "openai/gpt-oss-120b",

  OPENROUTER_FALLBACK: "openrouter/free",

  GEMINI: "gemini-2.5-flash",

  CLAUDE: "claude-sonnet-4-5",

  OPENAI: "gpt-5.6-luna",
};

/*
 * Faqat AI tanlash menyusi uchun.
 */
export const AI_PROVIDERS = {
  auto: "🔄 Auto",
  groq: "⚡ Groq",
  openrouter: "🌐 OpenRouter",
  gemini: "✨ Gemini 2.5 Flash",
  claude: "🧠 Claude",
  openai: "🤖 OpenAI",
};
