import { Context } from "../../../types/index";
import { RestEndpointMethodTypes } from "@ubiquity-os/plugin-sdk/octokit";
import { CallbackResult } from "../../../types/callbacks";
import { dispatchNotification } from "./notifications/dispatcher";
import { determineEventRouting, determineNotificationRouting, handleRouting } from "./routing";

export type UserEvent = RestEndpointMethodTypes["activity"]["listPublicEventsForUser"]["response"]["data"][0];
export type Notification = RestEndpointMethodTypes["activity"]["listNotificationsForAuthenticatedUser"]["response"]["data"][0];

const THREE_DAYS_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
const NOW = new Date(Date.now());

export async function pollUserEvents({
  context,
  username,
  perPage = 30,
  timeSince = THREE_DAYS_AGO,
  now = NOW,
}: {
  context: Context<"server.start" | "server.restart", "action">;
  username: string;
  perPage: number;
  timeSince: Date;
  now: Date;
}): Promise<{
  events: UserEvent[];
  notifications: Notification[];
  lastPollTimestamp: string;
}> {
  const { hostOctokit } = context;
  const events: UserEvent[] = [];
  const notifications: Notification[] = [];

  try {
    const privateEvents = await hostOctokit.rest.activity.listEventsForAuthenticatedUser({
      per_page: perPage,
      username,
      since: timeSince.toISOString(),
      before: now.toISOString(),
    });
    events.push(...privateEvents.data);
  } catch (error) {
    context.logger.error(`Failed to poll private events: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const notificationsResponse = await hostOctokit.rest.activity.listNotificationsForAuthenticatedUser({
      per_page: perPage,
      all: true,
      participating: true,
      since: timeSince.toISOString(),
      before: now.toISOString(),
    });
    notifications.push(...notificationsResponse.data);
  } catch (error) {
    context.logger.error(`Failed to poll notifications: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log(`Events: ${events.length}, Notifications: ${notifications.length}`);

  // Sort events and notifications by timestamp
  const sortedEvents = events.sort((a, b) => new Date(a.created_at ?? "").getTime() - new Date(b.created_at ?? "").getTime());
  const sortedNotifications = notifications.sort((a, b) => new Date(a.updated_at ?? "").getTime() - new Date(b.updated_at ?? "").getTime());

  // Find the most recent timestamp from all returned items
  const eventTimestamps = sortedEvents.map((e) => e.created_at).filter(Boolean);
  const notificationTimestamps = sortedNotifications.map((n) => n.updated_at).filter(Boolean);
  const allTimestamps = [...eventTimestamps, ...notificationTimestamps];

  // Use the most recent timestamp, or fall back to 'now' if no items
  const mostRecentTimestamp = allTimestamps.length > 0 ? allTimestamps.sort().pop()! : now.toISOString();

  return {
    events: sortedEvents,
    notifications: sortedNotifications,
    lastPollTimestamp: mostRecentTimestamp,
  };
}

export async function processNotification(context: Context<"server.start" | "server.restart", "action">, notification: Notification): Promise<void> {
  const notificationId = notification.id ?? "unknown";
  const repoFullName = notification.repository?.full_name ?? null;

  if (!repoFullName) {
    context.logger.warn(`Notification ${notificationId} has no repository information, skipping`);
    return;
  }

  const [owner, repoName] = repoFullName.split("/");

  if (!owner || !repoName) {
    context.logger.warn(`Notification ${notificationId} has invalid repository name: ${repoFullName}`);
    return;
  }

  const cacheKey = ["notification-routing", owner, repoName, notificationId];
  let cachedRouting: "kernel-forwarded" | "safe-action" | "unsafe-action" | null = null;
  let routing: "kernel-forwarded" | "safe-action" | "unsafe-action" | null = null;

  try {
    cachedRouting = (await context.adapters.kv.get<"kernel-forwarded" | "safe-action" | "unsafe-action">(cacheKey)).value ?? null;
  } catch (error) {
    context.logger.warn(`[NOTIFICATION-POLLER] Routing cache error for notification ${notificationId}`, {
      repo: repoFullName,
      err: error instanceof Error ? error.message : String(error),
    });
  }

  if (cachedRouting) {
    context.logger.info(`[NOTIFICATION-POLLER] Cache hit for notification ${notificationId} in ${repoFullName}: routing as ${cachedRouting}`);
    routing = cachedRouting;
  } else {
    routing = await determineNotificationRouting(context, notification);
  }

  await context.adapters.kv.set(cacheKey, routing);
  await dispatchNotification({ context, notification, route: routing });
}

/**
 * Processes a single GitHub user event
 * This is a shell implementation that logs the event and routes it appropriately
 * @param context - Action context
 * @param event - GitHub user event
 */
export async function processEvent(context: Context<"server.start" | "server.restart", "action">, event: UserEvent): Promise<CallbackResult> {
  const { logger } = context;
  const [owner, repoName] = event.repo?.name?.split("/") ?? [];
  if (!owner || !repoName) {
    logger.warn(`Event ${event.id} has invalid repository name: ${event.repo?.name}`);
    throw new Error(`Invalid repository name: ${event.repo?.name}`);
  }
  
  logger.info(`Processing event: ${event.type}`, {
    eventId: event.id,
    repo: event.repo?.name,
    actor: event.actor?.login,
    createdAt: event.created_at,
  });

  const cacheKey = ["routing", owner, repoName, event.id];
  let cachedRouting: "kernel-forwarded" | "safe-action" | "unsafe-action" | null = null;
  let routing: "kernel-forwarded" | "safe-action" | "unsafe-action" | null = null;

  try {
    cachedRouting = (await context.adapters.kv.get<"kernel-forwarded" | "safe-action" | "unsafe-action">(cacheKey)).value ?? null;
  } catch (error) {
    context.logger.warn(`[EVENT-POLLER] Routing cache error for event ${event.id}`, {
      repo: event.repo?.name,
      err: error instanceof Error ? error.message : String(error),
    });
  }

  if (cachedRouting) {
    context.logger.info(`[EVENT-POLLER] Cache hit for event ${event.id} in ${event.repo?.name} from ${event.actor?.login}: routing as ${cachedRouting}`);
    routing = cachedRouting;
  } else {
    routing = await determineEventRouting(context, event);
    await context.adapters.kv.set(cacheKey, routing);
    context.logger.info(`[EVENT-POLLER] Cache miss for event ${event.id} in ${event.repo?.name} from ${event.actor?.login}: routing as ${routing}`);
  }

  await context.adapters.kv.set(cacheKey, routing);

  return await handleRouting({ routing, context, event });
}
