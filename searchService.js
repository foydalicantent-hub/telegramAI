import axios from "axios";

import { config } from "./env.js";
import { logger } from "./logger.js";

/**
 * Searches the web (via YouTube Data API) and returns a list of
 * { title, url } results, or null if the search is unavailable / found nothing.
 */
export async function webSearch(query) {
  if (!config.keys.youtube) {
    return null;
  }

  try {
    const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: {
        part: "snippet",
        q: query,
        type: "video",
        maxResults: 5,
        key: config.keys.youtube,
      },
      timeout: 15000,
    });

    const items = response.data.items || [];

    if (!items.length) {
      return [];
    }

    return items.map((item) => ({
      title: item.snippet.title,
      url: `https://youtube.com/watch?v=${item.id.videoId}`,
    }));
  } catch (error) {
    logger.error(`Web search error: ${error.message}`);
    return null;
  }
}

const SEARCH_KEYWORDS = ["qidir", "internet", "искать", "поиск", "search"];

export function isSearchIntent(text) {
  const lower = text.toLowerCase();
  return SEARCH_KEYWORDS.some((keyword) => lower.includes(keyword));
}
