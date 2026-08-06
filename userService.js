import { User } from "./User.js";

/** Finds the user for this Telegram context, creating one on first contact. */
export async function getOrCreateUser(ctx) {
  const telegramId = ctx.from.id;

  let user = await User.findOne({ telegramId });

  if (!user) {
    user = await User.create({
      telegramId,
      firstName: ctx.from.first_name || "User",
      username: ctx.from.username || "",
    });
  }

  return user;
}
