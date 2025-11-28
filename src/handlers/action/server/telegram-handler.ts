import { Context } from "../../../types/index";
import { TelegramMessage } from "../../../adapters/telegram/adapter";

/**
 * Check for and process any pending Telegram messages from the host.
 * This is called periodically in the server loop to handle real-time communication.
 */
export async function processPendingTelegramMessages(
  context: Context<"server.start" | "server.restart", "action">
): Promise<TelegramMessage[]> {
  const { logger, adapters } = context;
  const telegram = adapters.telegram;

  if (!telegram) {
    return [];
  }

  try {
    const pendingMessages = await telegram.getPendingResponses();

    if (pendingMessages.length > 0) {
      logger.info(`[TELEGRAM] Found ${pendingMessages.length} pending message(s) from host`, {
        messageIds: pendingMessages.map((m) => m.id),
      });

      // Mark messages as processed by clearing them
      for (const message of pendingMessages) {
        await telegram.clearPendingResponse(message.id);
      }
    }

    return pendingMessages;
  } catch (error) {
    logger.error(`[TELEGRAM] Error checking pending messages`, {
      e: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Send a notification to the host via Telegram.
 * Useful for proactive updates or alerts.
 */
export async function notifyHostViaTelegram(
  context: Context<"server.start" | "server.restart", "action">,
  message: string
): Promise<boolean> {
  const { logger, adapters } = context;
  const telegram = adapters.telegram;

  if (!telegram) {
    logger.debug(`[TELEGRAM] Telegram not configured, skipping notification`);
    return false;
  }

  try {
    const result = await telegram.sendMessage(message);

    if (!result.ok) {
      logger.warn(`[TELEGRAM] Failed to send notification: ${result.error}`);
      return false;
    }

    logger.info(`[TELEGRAM] Notification sent to host`, { messageId: result.messageId });
    return true;
  } catch (error) {
    logger.error(`[TELEGRAM] Error sending notification`, {
      e: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

