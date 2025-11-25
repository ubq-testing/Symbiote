import { Context } from "../../../../types";
import { UserEvent } from "../event-poller";

/**
 * Handles kernel-forwarded events (repos with ubiquity app installed)
 * Shell implementation - logs the event
 */
export async function handleKernelForwardedEvent(context: Context<"server.start" | "server.restart", "action">, event: UserEvent): Promise<void> {
  const { logger } = context;
  logger.info(`[KERNEL-FORWARDED] Handling event ${event.id} from ${event.repo?.name}`);
  // TODO: Forward event to kernel via existing infrastructure
}

/**
 * Handles safe action events (public repos without ubiquity app)
 * Shell implementation - logs the event
 */
export async function handleSafeActionEvent(context: Context<"server.start" | "server.restart", "action">, event: UserEvent): Promise<void> {
  const { logger } = context;
  logger.info(`[SAFE-ACTION] Handling event ${event.id} from ${event.repo?.name}`);
  // TODO: Use app authentication to handle event
}

/**
 * Handles unsafe action events (private repos or sensitive actions)
 * Shell implementation - logs the event
 */
export async function handleUnsafeActionEvent(context: Context<"server.start" | "server.restart", "action">, event: UserEvent): Promise<void> {
  const { logger } = context;
  logger.info(`[UNSAFE-ACTION] Handling event ${event.id} from ${event.repo?.name}`);
  // TODO: Queue event for main workflow with user PAT authentication
}
