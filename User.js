import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    telegramId: { type: Number, required: true, unique: true },
    username: { type: String, default: "" },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    language: { type: String, default: "uz" },
    mode: { type: String, default: "ai" },
    awaitingFeedback: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    premiumExpiresAt: { type: Date, default: null },
    requestsToday: { type: Number, default: 0 },
    requestsDate: { type: String, default: "" },
    
    // TELEGRAM BUSINESS / KOTIB REJIMI
    businessConnectionId: { type: String, default: "" },
    businessInstruction: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },
    waitingForInstruction: { type: Boolean, default: false }, // <--- YANGI QO'SHILDI
  },
  { timestamps: true }
);

export function ensureLanguage(user) {
  return user.language || "uz";
}

export async function refreshPremiumStatus(user) {
  if (user.isPremium && user.premiumExpiresAt && new Date() > user.premiumExpiresAt) {
    user.isPremium = false;
    user.premiumExpiresAt = null;
    await user.save();
  }
}

export const User = mongoose.model("User", userSchema);