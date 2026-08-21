export const LANGUAGES = ["uz", "ru", "en"];

export const DEFAULT_LANGUAGE = "uz";

export const FREE_DAILY_LIMIT = 3;

export const PREMIUM_DURATION_DAYS = 30;

export const MEMORY_HISTORY_LIMIT = 20;

export const HISTORY_DISPLAY_LIMIT = 10;

export const AI_MODELS = {
  // Groq
  GROQ: "openai/gpt-oss-120b",

  // Cerebras
  CEREBRAS: "gpt-oss-120b",

  // Gemini
  GEMINI: "gemini-2.5-flash",

  // Mistral
  MISTRAL: "mistral-small-latest",

  // Cohere
  COHERE: "command-r7b-12-2024",

  // Hugging Face
  HUGGINGFACE: "openai/gpt-oss-120b",

  // OpenRouter
  OPENROUTER: "openrouter/free",

  // Claude
  CLAUDE: "claude-sonnet-4-5",

  // OpenAI
  OPENAI: "gpt-5-mini",
};

export const AI_PROVIDER_NAMES = {
  auto: "🔄 Avtomatik fallback",
  groq: "⚡ Groq",
  cerebras: "🚀 Cerebras",
  gemini: "✨ Gemini 2.5 Flash",
  mistral: "🌀 Mistral",
  cohere: "🟣 Cohere",
  huggingface: "🤗 Hugging Face",
  openrouter: "🌐 OpenRouter Free",
  claude: "🧠 Claude",
};
