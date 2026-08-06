import { Keyboard } from "grammy";

export const mainMenuKeyboard = new Keyboard()
  .text("🤖 AI Chat")
  .text("🎬 Kino Qidirish")
  .row()
  .text("🔍 Internet Qidiruv")
  .text("🔴 Dumaloq Video")
  .row()
  .text("📜 Muloqot Tarixi")
  .text("⚙️ Sozlamalar")
  .row()
  .text("📞 Avto-javob sozlash (Kontakt yuborish)") // Oddiy matnli tugma sifatida menyuga qo'shamiz
  .resized();