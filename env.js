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
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/telegram_ai_bot",
  adminIds: parseAdminIds(process.env.ADMIN_IDS),

  keys: {
    groq: process.env.GROQ_API_KEY || null,
    openrouter: process.env.OPENROUTER_API_KEY || null,
    youtube: process.env.YOUTUBE_API_KEY || null,
    tmdb: process.env.TMDB_API_KEY || null,
  },
};

export function assertRequiredConfig() {
  const missing = [];

  if (!config.botToken) missing.push("BOT_TOKEN");
  if (!config.mongoUri) missing.push("MONGO_URI");
  if (!config.keys.groq) missing.push("GROQ_API_KEY");

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}