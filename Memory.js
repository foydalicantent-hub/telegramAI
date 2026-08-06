import mongoose from "mongoose";

const memorySchema = new mongoose.Schema(
  {
    telegramId: { type: Number, required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export const Memory = mongoose.model("Memory", memorySchema);
