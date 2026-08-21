import dotenv from "dotenv";

dotenv.config();

function parseAdminIds(raw) {
  return (raw || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number);
}

export const config = {
  botToken: process.env.BOT_TOKEN,

  mongoUri:
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/telegram_ai_bot",

  adminIds: parseAdminIds(process.env.ADMIN_IDS),

  keys: {
    groq: process.env.GROQ_API_KEY || null,

    openrouter:
      process.env.OPENROUTER_API_KEY || null,

    gemini:
      process.env.GEMINI_API_KEY || null,

    claude:
      process.env.CLAUDE_API_KEY || null,

    openai:
      process.env.OPENAI_API_KEY || null,

    youtube:
      process.env.YOUTUBE_API_KEY || null,

    tmdb:
      process.env.TMDB_API_KEY || null,

    omdb:
      process.env.OMDB_API_KEY || null,
  },

  /*
   * Timeoutlarni juda katta qilmaymiz.
   * Shuning uchun Auto rejimida ishlamaydigan provider
   * botni uzoq ushlab turmaydi.
   */
  timeouts: {
    groq: Number(process.env.GROQ_TIMEOUT || 12000),
    openrouter: Number(process.env.OPENROUTER_TIMEOUT || 12000),
    gemini: Number(process.env.GEMINI_TIMEOUT || 15000),
    claude: Number(process.env.CLAUDE_TIMEOUT || 15000),
    openai: Number(process.env.OPENAI_TIMEOUT || 15000),
  },

  models: {
    groq:
      process.env.GROQ_MODEL ||
      "openai/gpt-oss-120b",

    openrouter:
      process.env.OPENROUTER_MODEL ||
      "openrouter/free",

    gemini:
      process.env.GEMINI_MODEL ||
      "gemini-2.5-flash",

    claude:
      process.env.CLAUDE_MODEL ||
      "claude-sonnet-4-5",

    openai:
      process.env.OPENAI_MODEL ||
      "gpt-5.6-luna",
  },
};

export function assertRequiredConfig() {
  const missing = [];

  if (!config.botToken) {
    missing.push("BOT_TOKEN");
  }

  if (!config.mongoUri) {
    missing.push("MONGO_URI");
  }

  const hasAI =
    config.keys.groq ||
    config.keys.openrouter ||
    config.keys.gemini ||
    config.keys.claude ||
    config.keys.openai;

  if (!hasAI) {
    missing.push(
      "GROQ_API_KEY yoki OPENROUTER_API_KEY yoki GEMINI_API_KEY yoki CLAUDE_API_KEY yoki OPENAI_API_KEY"
    );
  }

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
