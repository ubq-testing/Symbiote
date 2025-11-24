import { Context } from "../../../types/index";
import { RestEndpointMethodTypes } from "@ubiquity-os/plugin-sdk/octokit";
import { createRepoOctokit } from "../../octokit";

export type UserEvent = RestEndpointMethodTypes["activity"]["listPublicEventsForUser"]["response"]["data"][0];
export type Notification = RestEndpointMethodTypes["activity"]["listNotificationsForAuthenticatedUser"]["response"]["data"][0];

export async function pollUserEvents({
  context,
  username,
  perPage = 30,
}: {
  context: Context<"server.start" | "server.restart", "action">;
  username: string;
  perPage: number;
}): Promise<{ events: UserEvent[]; notifications: Notification[] }> {
  const { appOctokit, hostOctokit, env } = context;
  try {
    const publicEvents = await appOctokit.rest.activity.listPublicEventsForUser({
      username,
      per_page: perPage,
    });

    const notifications = await hostOctokit.rest.activity.listNotificationsForAuthenticatedUser({
      per_page: perPage,
    });

    const privateEvents = await hostOctokit.rest.activity.listEventsForAuthenticatedUser({
      per_page: perPage,
      username,
    });

    const events = [...publicEvents.data, ...privateEvents.data];

    return {
      events: events.sort((a, b) => new Date(a.created_at ?? "").getTime() - new Date(b.created_at ?? "").getTime()),
      notifications: notifications.data.sort((a, b) => new Date(a.updated_at ?? "").getTime() - new Date(b.updated_at ?? "").getTime()),
    };
  } catch (error) {
    throw new Error(`Failed to poll user events: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Determines the routing strategy for an event based on repository type and ubiquity app installation
 *
 * Routing strategy: 'kernel-forwarded' | 'safe-action' | 'unsafe-action'
 *
 * kernel-forwarded: The event is forwarded to the kernel (the user's kernel so it will forward it if we need it, so we could ignore it)
 * safe-action: The event is handled by the safe action  (the user's app so we can handle it)
 * unsafe-action: The event is handled by the unsafe action (the user's app cannot possibly handle it, so we auth as the user and we handle it)
 *
 */
export async function determineEventRouting(
  context: Context<"server.start" | "server.restart", "action">,
  event: UserEvent
): Promise<"kernel-forwarded" | "safe-action" | "unsafe-action"> {
  const { logger, appOctokit, hostOctokit, env } = context;

  /**
   * Extract repository information from the event which
   * can be from any org, user, repo, etc.
   */
  const { repo, org } = event;
  if (!repo) {
    logger.warn(`Event ${event.id} has no repository information, skipping`);
    throw new Error("Event has no repository information");
  }

  const [owner, repoName] = repo.name.split("/");
  if (!owner || !repoName) {
    logger.warn(`Event ${event.id} has invalid repository name: ${repo.name}`);
    throw new Error(`Invalid repository name: ${repo.name}`);
  }

  const orgName = org?.login;

  try {
    // Check if repository is private
    const repoResponse = await appOctokit.rest.repos.get({
      owner,
      repo: repoName,
    });

    const isPrivate = repoResponse.data.private;

    try {
      // Attempt to get app installation - if this succeeds, app is installed
      const appAuth = await appOctokit.rest.apps.getAuthenticated();
      if (appAuth.data) {
        logger.info(`App authentication: ${appAuth.data.id}`, { appAuth });
      }
    } catch (er) {
      logger.error(`Error checking app authentication: `, { owner, repoName, orgName });
    }

    // Check if app is installed on the repository
    let hasApp = false;
    try {
      const repoOctokit = await createRepoOctokit({
        env,
        owner,
        repo: repoName,
      });

      if(repoOctokit) {
        hasApp = true;
      }

    } catch (e) {
      logger.error(`Error checking app installation: `, { owner, repoName, orgName });
    }
    logger.info(`App installation check for ${owner} in ${repoName}: ${hasApp}`);

    // Route based on repository type and app installation
    if (hasApp) {
      logger.info(`Event ${event.id} from ${repo.name}: routing as kernel-forwarded (app installed)`);
      return "kernel-forwarded";
    } else if (!isPrivate) {
      logger.info(`Event ${event.id} from ${repo.name}: routing as safe-action (public repo)`);
      return "safe-action";
    } else {
      logger.info(`Event ${event.id} from ${repo.name}: routing as unsafe-action (private repo)`);
      return "unsafe-action";
    }
  } catch (error) {
    logger.error(`Error determining routing for event ${event.id}: ${error}`);
    // Default to unsafe-action if we can't determine
    return "unsafe-action";
  }
}

async function handleRouting({
  routing,
  context,
  event,
}: {
  routing: "kernel-forwarded" | "safe-action" | "unsafe-action";
  context: Context<"server.start" | "server.restart", "action">;
  event: UserEvent | undefined;
}): Promise<void> {
  if (!event) {
    context.logger.warn(`Event is undefined, skipping`);
    return;
  }
  switch (routing) {
    case "kernel-forwarded":
      await handleKernelForwardedEvent(context, event);
      break;
    case "safe-action":
      await handleSafeActionEvent(context, event);
      break;
    case "unsafe-action":
      await handleUnsafeActionEvent(context, event);
      break;
  }
}

export async function processNotification(context: Context<"server.start" | "server.restart", "action">, notification: Notification): Promise<void> {
  const { logger } = context;
  logger.info(`Processing notification: ${notification.id}`, {
    notificationId: notification.id,
    notification,
  });
  // TODO: Process notification
}

/**
 * Processes a single GitHub user event
 * This is a shell implementation that logs the event and routes it appropriately
 * @param context - Action context
 * @param event - GitHub user event
 */
export async function processEvent(context: Context<"server.start" | "server.restart", "action">, event: UserEvent): Promise<void> {
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

  const cachedRouting = await context.adapters.kv.get<"kernel-forwarded" | "safe-action" | "unsafe-action">(["routing", owner, repoName]);
  if (cachedRouting && cachedRouting.value) {
    context.logger.info(`[EVENT-POLLER] Cache hit for event ${event.id} in ${event.repo?.name} from ${event.actor?.login}: routing as ${cachedRouting.value}`);

    try {
      return await handleRouting({
        routing: cachedRouting.value,
        context,
        event,
      });
    } catch (error) {
      logger.error(`Error handling routing for event ${event.id}: ${error}`);
      throw error;
    }
  } else {
    try {
      const routing = await determineEventRouting(context, event);
      await context.adapters.kv.set([`routing:${owner}:${repoName}`], routing);
      context.logger.info(`[EVENT-POLLER] Cache miss for event ${event.id} in ${event.repo?.name} from ${event.actor?.login}: routing as ${routing}`);
      return await handleRouting({
        routing,
        context,
        event,
      });
    } catch (error) {
      logger.error(`Error determining routing for event ${event.id}: ${error}`);
      throw error;
    }
  }
}

/**
 * Handles kernel-forwarded events (repos with ubiquity app installed)
 * Shell implementation - logs the event
 */
async function handleKernelForwardedEvent(context: Context<"server.start" | "server.restart", "action">, event: UserEvent): Promise<void> {
  const { logger } = context;
  logger.info(`[KERNEL-FORWARDED] Handling event ${event.id} from ${event.repo?.name}`, {
    event,
  });
  // TODO: Forward event to kernel via existing infrastructure
}

/**
 * Handles safe action events (public repos without ubiquity app)
 * Shell implementation - logs the event
 */
async function handleSafeActionEvent(context: Context<"server.start" | "server.restart", "action">, event: UserEvent): Promise<void> {
  const { logger } = context;
  logger.info(`[SAFE-ACTION] Handling event ${event.id} from ${event.repo?.name}`, {
    event,
  });
  // TODO: Use app authentication to handle event
}

/**
 * Handles unsafe action events (private repos or sensitive actions)
 * Shell implementation - logs the event
 */
async function handleUnsafeActionEvent(context: Context<"server.start" | "server.restart", "action">, event: UserEvent): Promise<void> {
  const { logger } = context;
  logger.info(`[UNSAFE-ACTION] Handling event ${event.id} from ${event.repo?.name}`, {
    event,
  });
  // TODO: Queue event for main workflow with user PAT authentication
}
