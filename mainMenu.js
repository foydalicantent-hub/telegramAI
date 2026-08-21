export const mainMenuKeyboard = {
  keyboard: [
    [
      { text: "🤖 AI Chat" },
      { text: "🎬 Kino Qidirish" },
    ],

    [
      { text: "🔍 Internet Qidiruv" },
      { text: "🔴 Dumaloq Video" },
    ],

    [
      { text: "📜 Muloqot Tarixi" },
      { text: "⚙️ Sozlamalar" },
    ],

    [
      {
        text: "📞 Avto-javob sozlash (Kontakt yuborish)",
      },
    ],
  ],

  resize_keyboard: true,
};

export function aiProviderKeyboard(
  availableProviders = [],
  current = "auto",
  hasImage = false
) {
  const buttons = [];

  buttons.push([
    {
      text:
        current === "auto"
          ? "✅ 🔄 Avtomatik fallback"
          : "🔄 Avtomatik fallback",

      callback_data: "ai_select:auto",
    },
  ]);

  const names = {
    groq: "⚡ Groq",

    cerebras: "🚀 Cerebras",

    gemini: "✨ Gemini 2.5 Flash",

    mistral: "🌀 Mistral",

    cohere: "🟣 Cohere",

    huggingface: "🤗 Hugging Face",

    openrouter: "🌐 OpenRouter Free",

    claude: "🧠 Claude",
  };

  for (let i = 0; i < availableProviders.length; i += 2) {
    const row = [];

    for (const provider of availableProviders.slice(i, i + 2)) {
      row.push({
        text:
          current === provider.id
            ? `✅ ${names[provider.id] || provider.name}`
            : names[provider.id] || provider.name,

        callback_data: `ai_select:${provider.id}`,
      });
    }

    buttons.push(row);
  }

  if (hasImage) {
    buttons.push([
      {
        text: "🎨 Rasm yaratish",
        callback_data: "ai_image",
      },
    ]);
  }

  buttons.push([
    {
      text: "❌ Yopish",
      callback_data: "ai_close",
    },
  ]);

  return {
    inline_keyboard: buttons,
  };
}
