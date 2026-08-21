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

    cerebras: process.env.CEREBRAS_API_KEY || null,

    gemini: process.env.GEMINI_API_KEY || null,

    mistral: process.env.MISTRAL_API_KEY || null,

    cohere: process.env.COHERE_API_KEY || null,

    huggingface:
      process.env.HF_API_KEY ||
      process.env.HF_TOKEN ||
      null,

    openrouter: process.env.OPENROUTER_API_KEY || null,

    claude:
      process.env.CLAUDE_API_KEY ||
      process.env["CLAUDE_API-KEY"] ||
      null,

    openai: process.env.OPENAI_API_KEY || null,

    youtube: process.env.YOUTUBE_API_KEY || null,

    tmdb: process.env.TMDB_API_KEY || null,

    omdb: process.env.OMDB_API_KEY || null,
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
    config.keys.cerebras ||
    config.keys.gemini ||
    config.keys.mistral ||
    config.keys.cohere ||
    config.keys.huggingface ||
    config.keys.openrouter ||
    config.keys.claude ||
    config.keys.openai;

  if (!hasAI) {
    missing.push("Kamida bitta AI API key");
  }

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
