import { Keyboard } from "grammy";

export const mainMenuKeyboard = new Keyboard()
  .text("🌐 AI va Qidiruv").text("🎥 Media va Yaratish")
  .row()
  .text("💻 Kod va Instrumentlar").text("⚡️ Biznes Avto-javob")
  .row()
  .text("📜 Muloqot Tarixi").text("✨ Tez kunda (Bo'sh)")
  .resized();
