import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { LANGUAGES, DEFAULT_LANGUAGE } from "./constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const translations = {};

for (const lang of LANGUAGES) {
  const filePath = path.join(__dirname, `locales/${lang}.json`);
  translations[lang] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/**
 * Translate a key for the given language, with optional {{param}} interpolation.
 */
export function t(lang, key, params = {}) {
  const dict = translations[lang] || translations[DEFAULT_LANGUAGE];
  let text = dict[key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;

  for (const [name, value] of Object.entries(params)) {
    text = text.replaceAll(`{{${name}}}`, value);
  }

  return text;
}
