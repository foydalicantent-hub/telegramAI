import mongoose from "mongoose";

import { config } from "./env.js";
import { logger } from "./logger.js";

export async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info("MongoDB connected");
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}
