import { WorkerEnv, WorkflowEnv } from "../../types/env";
import { KvAdapter } from "../kv";

type TelegramEnv = WorkerEnv | WorkflowEnv;

export interface TelegramMessage {
  id: string;
  text: string;
  fromUserId: string;
  timestamp: string;
}

export interface PendingResponse {
  messageId: string;
  promptText: string;
  createdAt: string;
  expiresAt: string;
}

export interface WebhookInfo {
  url: string;
  registeredAt: string;
  hasCustomCertificate: boolean;
  pendingUpdateCount: number;
}

export interface TelegramAdapter {
  sendMessage(text: string): Promise<{ ok: boolean; messageId?: number; error?: string }>;
  getPendingResponses(): Promise<TelegramMessage[]>;
  clearPendingResponse(messageId: string): Promise<void>;
  storePendingPrompt(promptText: string): Promise<string>;
}

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

export const PENDING_RESPONSE_PREFIX = ["telegram", "pending-response"];
export const PENDING_PROMPT_PREFIX = ["telegram", "pending-prompt"];
export const USER_PREFIX = ["telegram", "user", "id"];
export const WEBHOOK_PREFIX = ["telegram", "webhook"];


const RESPONSE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

export async function createTelegramAdapter(
  env: TelegramEnv,
  kv: KvAdapter
): Promise<TelegramAdapter | null> {
  const telegramConfig = env.TELEGRAM;

  if (!telegramConfig) {
    return null;
  }

  const { BOT_TOKEN } = telegramConfig;
  const user = await kv.get([...USER_PREFIX, BOT_TOKEN]);
  if (!user || !user.value) {
    throw new Error("Host user hasn't registered their Symbiote Telegram bot yet. Please send a message to the bot to register.");
  }

  const userValue = user.value as { id: string, username: string };

  async function sendMessage(text: string): Promise<{ ok: boolean; messageId?: number; error?: string }> {
    try {
      const response = await fetch(`${TELEGRAM_API_BASE}${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: userValue.id,
          text,
          parse_mode: "HTML",
        }),
      });

      const data = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string };

      if (!data.ok) {
        return { ok: false, error: data.description ?? "Unknown Telegram API error" };
      }

      return { ok: true, messageId: data.result?.message_id };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async function getPendingResponses(): Promise<TelegramMessage[]> {
    const messages: TelegramMessage[] = [];
    const now = Date.now();

    const entries = kv.list<TelegramMessage>({
      prefix: PENDING_RESPONSE_PREFIX,
      end: [...PENDING_RESPONSE_PREFIX, "\uffff"],
    });

    for await (const entry of entries) {
      const message = entry.value as TelegramMessage | null;
      if (message && message.timestamp && message.id && message.text && message.fromUserId) {
        if (new Date(message.timestamp).getTime() + RESPONSE_EXPIRY_MS > now) {
          messages.push(message);
        }
      }
    }

    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async function clearPendingResponse(messageId: string): Promise<void> {
    await kv.delete([...PENDING_RESPONSE_PREFIX, messageId]);
  }

  async function storePendingPrompt(promptText: string): Promise<string> {
    const promptId = crypto.randomUUID();
    const now = new Date();

    const pendingPrompt: PendingResponse = {
      messageId: promptId,
      promptText,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + RESPONSE_EXPIRY_MS).toISOString(),
    };

    await kv.set([...PENDING_PROMPT_PREFIX, promptId], pendingPrompt);
    return promptId;
  }

  return {
    sendMessage,
    getPendingResponses,
    clearPendingResponse,
    storePendingPrompt,
  };
}

/**
 * Store an incoming Telegram message in KV for the action server to pick up
 */
export async function storeIncomingMessage(
  kv: KvAdapter,
  userId: string,
  messageId: number,
  text: string
): Promise<void> {
  const message: TelegramMessage = {
    id: String(messageId),
    text,
    fromUserId: userId,
    timestamp: new Date().toISOString(),
  };

  await kv.set([...PENDING_RESPONSE_PREFIX, String(messageId)], message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Registration
// ─────────────────────────────────────────────────────────────────────────────

interface SetWebhookResponse {
  ok: boolean;
  result?: boolean;
  description?: string;
  error_code?: number;
}

interface GetWebhookInfoResponse {
  ok: boolean;
  result?: {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
  };
  description?: string;
}

/**
 * Registers a webhook URL with Telegram's Bot API.
 * This should be called once during deployment or when the webhook URL changes.
 *
 * @param botToken - The bot token from @BotFather
 * @param webhookUrl - The HTTPS URL where Telegram will send updates
 * @param secretToken - Optional secret token for webhook validation
 * @returns Success status and any error message
 */
export async function registerWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      url: webhookUrl,
      allowed_updates: ["message"], // Only receive message updates
      drop_pending_updates: false,
    };

    if (secretToken) {
      body.secret_token = secretToken;
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as SetWebhookResponse;

    if (!data.ok) {
      return {
        ok: false,
        error: data.description ?? `Telegram API error: ${data.error_code}`,
      };
    }

    console.log(`[TELEGRAM] Webhook registered: ${webhookUrl}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Gets the current webhook configuration from Telegram.
 *
 * @param botToken - The bot token from @BotFather
 * @returns Current webhook info or error
 */
export async function getWebhookInfo(
  botToken: string
): Promise<{ ok: boolean; info?: WebhookInfo; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${botToken}/getWebhookInfo`);
    const data = (await response.json()) as GetWebhookInfoResponse;

    if (!data.ok || !data.result) {
      return {
        ok: false,
        error: data.description ?? "Failed to get webhook info",
      };
    }

    return {
      ok: true,
      info: {
        url: data.result.url,
        registeredAt: new Date().toISOString(),
        hasCustomCertificate: data.result.has_custom_certificate,
        pendingUpdateCount: data.result.pending_update_count,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Deletes the current webhook (switches bot back to polling mode).
 *
 * @param botToken - The bot token from @BotFather
 * @returns Success status and any error message
 */
export async function deleteWebhook(
  botToken: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${botToken}/deleteWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: false }),
    });

    const data = (await response.json()) as SetWebhookResponse;

    if (!data.ok) {
      return {
        ok: false,
        error: data.description ?? "Failed to delete webhook",
      };
    }

    console.log(`[TELEGRAM] Webhook deleted`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Ensures the Telegram webhook is registered.
 * Checks current webhook state and registers if needed.
 *
 * @param kv - KV adapter for caching webhook state
 * @param botToken - The bot token from @BotFather
 * @param webhookUrl - The HTTPS URL where Telegram will send updates
 * @param secretToken - Optional secret token for webhook validation
 * @returns Whether the webhook is properly configured
 */
export async function ensureWebhookRegistered(
  kv: KvAdapter,
  botToken: string,
  webhookUrl: string,
  secretToken?: string
): Promise<{ ok: boolean; error?: string; alreadyRegistered?: boolean }> {
  const cacheKey = [...WEBHOOK_PREFIX, botToken];

  // Check if we've already registered this webhook URL
  const cached = await kv.get<{ url: string; registeredAt: string }>(cacheKey);

  if (cached.value && cached.value.url === webhookUrl) {
    console.log(`[TELEGRAM] Webhook already registered (cached): ${webhookUrl}`);
    return { ok: true, alreadyRegistered: true };
  }

  // Check current webhook state from Telegram
  const currentInfo = await getWebhookInfo(botToken);

  if (currentInfo.ok && currentInfo.info?.url === webhookUrl) {
    // Webhook is already set correctly, just cache it
    await kv.set(cacheKey, {
      url: webhookUrl,
      registeredAt: new Date().toISOString(),
    });
    console.log(`[TELEGRAM] Webhook already registered (verified): ${webhookUrl}`);
    return { ok: true, alreadyRegistered: true };
  }

  // Need to register the webhook
  const result = await registerWebhook(botToken, webhookUrl, secretToken);

  if (result.ok) {
    // Cache the registration
    await kv.set(cacheKey, {
      url: webhookUrl,
      registeredAt: new Date().toISOString(),
    });
  }

  return { ok: result.ok, error: result.error, alreadyRegistered: false };
}

