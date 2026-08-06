import axios from "axios";

import { config } from "./env.js";
import { logger } from "./logger.js";

const MOVIE_KEYWORDS = ["kino", "film", "movie", "фильм", "кино"];

export function isMovieIntent(text) {
  const lower = text.toLowerCase();
  return MOVIE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/** Strips the trigger keyword out of the message, leaving just the movie title. */
export function extractMovieQuery(text) {
  let query = text;
  for (const keyword of MOVIE_KEYWORDS) {
    query = query.replace(new RegExp(keyword, "ig"), "");
  }
  return query.trim();
}

/**
 * Searches TMDB for movies by title using v4 Bearer Token.
 */
export async function searchMovie(title) {
  if (!config.keys.tmdb || !title) {
    return null;
  }

  try {
    const res = await axios.get("https://api.themoviedb.org/3/search/movie", {
      headers: {
        Authorization: `Bearer ${config.keys.tmdb}`,
        accept: "application/json",
      },
      params: {
        query: title,
        language: "uz-UZ",
      },
      timeout: 15000,
    });

    const results = res.data.results || [];
    if (results.length === 0) {
      return [];
    }

    return results.slice(0, 5).map((movie) => ({
      title: movie.title,
      year: movie.release_date ? movie.release_date.split("-")[0] : "",
      url: `https://www.themoviedb.org/movie/${movie.id}`,
    }));
  } catch (error) {
    logger.error(`Movie search error: ${error.message}`);
    return null;
  }
}
