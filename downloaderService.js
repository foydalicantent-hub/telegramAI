import pkg from 'yt-dlp-wrap';
const { default: YTDLPWrap } = pkg;
import path from "path";
import os from "os";
import fs from "fs";
import { logger } from "./logger.js";

let ytDlpWrap;

async function initYtDlp() {
  try {
    ytDlpWrap = new YTDLPWrap();
  } catch (err) {
    logger.error(`yt-dlp init error: ${err.message}`);
  }
}

initYtDlp();

export async function downloadMedia(url) {
  try {
    if (!ytDlpWrap) await initYtDlp();

    const outputPath = path.join(os.tmpdir(), `instavideo_${Date.now()}.mp4`);

    await ytDlpWrap.execPromise([
      url,
      "-f", "mp4",
      "-o", outputPath,
      "--no-playlist",
    ]);

    if (fs.existsSync(outputPath)) {
      return outputPath;
    }
  } catch (error) {
    logger.error(`yt-dlp download error: ${error.message}`);
  }

  return null;
}

export function isSocialMediaUrl(text) {
  if (!text) return false;
  return (
    text.includes("instagram.com") ||
    text.includes("tiktok.com") ||
    text.includes("youtube.com") ||
    text.includes("youtu.be")
  );
}
