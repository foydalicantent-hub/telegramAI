import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
    },

    username: {
      type: String,
      default: "",
    },

    firstName: {
      type: String,
      default: "",
    },

    lastName: {
      type: String,
      default: "",
    },

    language: {
      type: String,
      default: "uz",
    },

    /*
     * ai
     * movie
     * search
     * circle
     * ai_select
     */
    mode: {
      type: String,
      default: "ai",
    },

    /*
     * Foydalanuvchi tanlagan AI.
     *
     * auto       = fallback
     * groq       = faqat Groq
     * openrouter = faqat OpenRouter
     * gemini     = faqat Gemini
     * claude     = faqat Claude
     * openai     = faqat OpenAI
     */
    aiProvider: {
      type: String,

      enum: [
        "auto",
        "groq",
        "openrouter",
        "gemini",
        "claude",
        "openai",
      ],

      default: "auto",
    },

    awaitingFeedback: {
      type: Boolean,
      default: false,
    },

    isPremium: {
      type: Boolean,
      default: false,
    },

    premiumExpiresAt: {
      type: Date,
      default: null,
    },

    requestsToday: {
      type: Number,
      default: 0,
    },

    requestsDate: {
      type: String,
      default: "",
    },

    // TELEGRAM BUSINESS / KOTIB REJIMI
    businessConnectionId: {
      type: String,
      default: "",
    },

    businessInstruction: {
      type: String,
      default: "",
    },

    phoneNumber: {
      type: String,
      default: "",
    },

    waitingForInstruction: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export function ensureLanguage(user) {
  return user.language || "uz";
}

export function ensureAIProvider(user) {
  const allowed = [
    "auto",
    "groq",
    "openrouter",
    "gemini",
    "claude",
    "openai",
  ];

  if (!allowed.includes(user.aiProvider)) {
    user.aiProvider = "auto";
  }

  return user.aiProvider;
}

export async function refreshPremiumStatus(user) {
  if (
    user.isPremium &&
    user.premiumExpiresAt &&
    new Date() > user.premiumExpiresAt
  ) {
    user.isPremium = false;
    user.premiumExpiresAt = null;

    await user.save();
  }
}

export const User = mongoose.model("User", userSchema);
