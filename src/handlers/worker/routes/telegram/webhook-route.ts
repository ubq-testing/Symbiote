import { Context as HonoContext } from "hono";
import { Logs } from "@ubiquity-os/ubiquity-os-logger";
import { WorkerEnv } from "../../../../types/env";
import { createKvAdapter, KvAdapter } from "../../../../adapters/kv";
import {
  storeIncomingMessage,
  USER_PREFIX,
  ensureWebhookRegistered,
  WEBHOOK_PREFIX,
} from "../../../../adapters/telegram/adapter";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
}

/**
 * Handles incoming Telegram webhook updates.
 * Also ensures the webhook is registered on first request.
 */
export async function createTelegramWebhookRoute({
  ctx,
  validatedEnv,
  logger,
}: {
  ctx: HonoContext;
  validatedEnv: WorkerEnv;
  logger: Logs;
}) {
  const telegramConfig = validatedEnv.TELEGRAM;

  if (!telegramConfig) {
    logger.warn("[TELEGRAM] Telegram not configured, ignoring webhook");
    return ctx.json({ ok: true, message: "Telegram not configured" }, 200);
  }

  const { BOT_TOKEN, WEBHOOK_SECRET, WEBHOOK_URL } = telegramConfig;

  // Validate webhook secret if configured
  if (WEBHOOK_SECRET) {
    const secretHeader = ctx.req.header("X-Telegram-Bot-Api-Secret-Token");
    if (secretHeader !== WEBHOOK_SECRET) {
      logger.warn("[TELEGRAM] Invalid webhook secret");
      return ctx.json({ error: "Unauthorized" }, 401);
    }
  }

  const kv = await createKvAdapter(validatedEnv);

  // Ensure webhook is registered (lazy initialization)
  if (WEBHOOK_URL) {
    const webhookResult = await ensureWebhookRegistered(kv, BOT_TOKEN, WEBHOOK_URL, WEBHOOK_SECRET);
    if (!webhookResult.ok) {
      logger.error("[TELEGRAM] Failed to register webhook", { err: webhookResult.error });
    } else if (!webhookResult.alreadyRegistered) {
      logger.info("[TELEGRAM] Webhook registered successfully", { url: WEBHOOK_URL });
    }
  }

  try {
    const update = await ctx.req.json<TelegramUpdate>();

    if (!update.message?.text) {
      logger.debug("[TELEGRAM] Received non-text update, ignoring");
      return ctx.json({ ok: true }, 200);
    }

    const { message } = update;
    const fromUserId = String(message.from.id);

    // Check if we have a registered host user for this bot
    const hostUser = await kv.get<{ id: string; username: string }>([...USER_PREFIX, BOT_TOKEN]);

    if (!hostUser.value) {
      // First message to this bot - register the sender as the host
      logger.info("[TELEGRAM] Registering first user as host", {
        userId: fromUserId,
        username: message.from.username,
      });

      const username = message.from.username ?? "";

      if(!username || username.toLowerCase() !== telegramConfig.HOST_USERNAME.toLowerCase()) {
        logger.warn("[TELEGRAM] Invalid host username", {
          username,
          expectedUsername: telegramConfig.HOST_USERNAME,
        });
        return ctx.json({ ok: false, message: "Invalid host username" }, 401);
      }

      await kv.set([...USER_PREFIX, BOT_TOKEN], {
        id: fromUserId,
        username: message.from.username ?? "",
        registeredAt: new Date().toISOString(),
      });

      // Send welcome message
      await sendWelcomeMessage(BOT_TOKEN, fromUserId, message.from.first_name);

      return ctx.json({ ok: true }, 200);
    }

    // Only process messages from the registered host user
    if (fromUserId !== hostUser.value.id) {
      logger.info("[TELEGRAM] Message from unauthorized user", {
        fromUserId,
        expectedUserId: hostUser.value.id,
        username: message.from.username,
      });
      return ctx.json({ ok: true, message: "Unauthorized user" }, 200);
    }

    logger.info("[TELEGRAM] Received message from host", {
      messageId: message.message_id,
      text: message.text?.slice(0, 100) ?? "",
      fromUsername: message.from.username,
    });

    // Store the message in KV for the action server to pick up
    await storeIncomingMessage(kv, fromUserId, message.message_id, message.text ?? "");

    logger.info("[TELEGRAM] Message stored for action server", {
      messageId: message.message_id,
    });

    return ctx.json({ ok: true }, 200);
  } catch (error) {
    logger.error("[TELEGRAM] Error processing webhook", {
      err: error instanceof Error ? error.message : String(error),
    });
    return ctx.json({ error: "Internal server error" }, 500);
  }
}

/**
 * Sends a welcome message to the newly registered host user.
 */
async function sendWelcomeMessage(botToken: string, chatId: string, firstName: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text:
          `🤖 <b>Welcome, ${firstName}!</b>\n\n` +
          `You are now registered as the host for this Symbiote bot.\n\n` +
          `I'll send you notifications about your GitHub activity and you can send me messages to respond to actions.\n\n` +
          `<i>This bot will only respond to messages from you.</i>`,
        parse_mode: "HTML",
      }),
    });
  } catch (error) {
    console.error("[TELEGRAM] Failed to send welcome message:", error);
  }
}

/**
 * Initialize Telegram webhook - call this during worker startup or deployment.
 * This ensures the webhook is registered before any messages arrive.
 */
export async function initializeTelegramWebhook(
  env: WorkerEnv,
  logger: Logs
): Promise<{ ok: boolean; error?: string }> {
  const telegramConfig = env.TELEGRAM;

  if (!telegramConfig) {
    logger.debug("[TELEGRAM] Telegram not configured, skipping webhook initialization");
    return { ok: true };
  }

  const { BOT_TOKEN, WEBHOOK_SECRET, WEBHOOK_URL } = telegramConfig;

  if (!WEBHOOK_URL) {
    logger.warn("[TELEGRAM] WEBHOOK_URL not configured, webhook will not be registered");
    return { ok: false, error: "WEBHOOK_URL not configured" };
  }

  const kv = await createKvAdapter(env);
  const result = await ensureWebhookRegistered(kv, BOT_TOKEN, WEBHOOK_URL, WEBHOOK_SECRET);

  if (!result.ok) {
    logger.error("[TELEGRAM] Failed to initialize webhook", { err: result.error });
    return { ok: false, error: result.error };
  }

  if (result.alreadyRegistered) {
    logger.info("[TELEGRAM] Webhook already registered", { url: WEBHOOK_URL });
  } else {
    logger.info("[TELEGRAM] Webhook initialized successfully", { url: WEBHOOK_URL });
  }

  return { ok: true };
}
