# Telegram AI Bot

A lightweight, multilingual (Uzbek / Russian / English) Telegram bot with AI chat,
web search, movie search, and a Free/Premium quota system.

## ⚠️ Security notice

The ZIP you provided contained a committed `.env` file with **live** credentials
(bot token, Groq, OpenRouter, Gemini, HuggingFace and YouTube API keys). That file
was **removed** from this rebuild and is not included anywhere in the output.

Because those keys were sitting in a file that could be shared/uploaded, treat them
as compromised:
- Regenerate your bot token with **@BotFather** (`/revoke`).
- Rotate/regenerate the Groq, OpenRouter, and YouTube API keys from their dashboards.
- Never commit `.env` — it's already listed in `.gitignore` here.

## Setup

```bash
npm install
cp .env.example .env
# fill in .env with your (new) credentials
npm start
```

Required env vars: `BOT_TOKEN`, `MONGO_URI`, `GROQ_API_KEY`.
Optional: `OPENROUTER_API_KEY` (AI fallback), `YOUTUBE_API_KEY` (web search),
`OMDB_API_KEY` (movie search), `ADMIN_IDS` (comma-separated Telegram IDs).
If an optional key is missing, that feature replies with a friendly
"temporarily unavailable" message instead of crashing.

## Features

- **AI Chat** — free-text messages are answered by the AI (Groq, with an
  OpenRouter fallback), always replying in the user's selected language.
- **Web search** — trigger by including a search-related word in your message
  (e.g. "search", "qidir", "искать").
- **Movie search** — trigger with "movie" / "kino" / "фильм" + a title.
- **Languages** — Uzbek, Russian, English. Selected via inline buttons on
  `/start` (shown once, until a language is picked) or `/language`.

## Commands

| Command    | Description                                        |
|------------|-----------------------------------------------------|
| `/start`   | Start the bot, pick a language                      |
| `/help`    | List features and commands                          |
| `/clean`   | Clear your AI conversation history                   |
| `/tarix`   | Show your recent conversation history                |
| `/muammo`  | Send feedback / report a problem to the admin(s)     |
| `/premium` | Show your Free/Premium status and plan info          |

There's also an admin-only, undocumented `/grant <telegramId> [days]` command
(silently ignored for non-admins) so an admin listed in `ADMIN_IDS` can activate
Premium for a user — there's no payment gateway wired up, so this is the manual
switch until you add one.

## Premium system

- Free users: 3 AI chat requests/day (web & movie search aren't limited).
- Premium: unlimited AI requests for 30 days from activation.
- Expiry is checked lazily on each interaction — no cron job needed — and the
  user is silently switched back to Free once `premiumExpiresAt` has passed.

## Project structure

```
commands/    Telegram command & message handlers
services/    AI, search, movie, premium, user business logic
models/      Mongoose schemas (User, Memory)
keyboards/   Inline keyboards
locales/     uz.json / ru.json / en.json translation strings
utils/       i18n helper, logger
config/      env loading + constants
database/    MongoDB connection
index.js     wires everything up and starts the bot
```
