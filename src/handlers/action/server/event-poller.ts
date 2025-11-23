import { Context } from "../../../types/index";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { RestEndpointMethodTypes } from "@ubiquity-os/plugin-sdk/octokit";

type UserEvent = RestEndpointMethodTypes["activity"]["listPublicEventsForUser"]["response"]["data"][0];

export async function pollUserEvents(octokit: InstanceType<typeof customOctokit>, username: string, perPage: number = 30): Promise<UserEvent[]> {
  try {
    const response = await octokit.rest.activity.listPublicEventsForUser({
      username,
      per_page: perPage,
    });

    return response.data;
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
  const { logger, octokit, env } = context;

  // Extract repository information from event
  const repo = event.repo;
  if (!repo) {
    logger.warn(`Event ${event.id} has no repository information, skipping`);
    throw new Error("Event has no repository information");
  }

  const [owner, repoName] = repo.name.split("/");
  if (!owner || !repoName) {
    logger.warn(`Event ${event.id} has invalid repository name: ${repo.name}`);
    throw new Error(`Invalid repository name: ${repo.name}`);
  }

  try {
    // Check if repository is private
    const repoResponse = await octokit.rest.repos.get({
      owner,
      repo: repoName,
    });

    const isPrivate = repoResponse.data.private;

    // Check if app is installed on the repository
    let hasApp = false;
    try {
      // Attempt to get app installation - if this succeeds, app is installed
      const installations = await octokit.rest.apps.listInstallations();
      hasApp = installations.data.some((installation) => installation.account?.login === owner);
    } catch (e) {
      logger.error(`Error checking app installation: `, { e });
      hasApp = false;
    }

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

/**
 * Processes a single GitHub user event
 * This is a shell implementation that logs the event and routes it appropriately
 * @param context - Action context
 * @param event - GitHub user event
 */
export async function processEvent(context: Context<"server.start" | "server.restart", "action">, event: UserEvent): Promise<void> {
  const { logger } = context;

  logger.info(`Processing event: ${event.type}`, {
    eventId: event.id,
    repo: event.repo?.name,
    actor: event.actor?.login,
    createdAt: event.created_at,
  });

  try {
    // Determine routing strategy
    const routing = await determineEventRouting(context, event);

    // Route event based on strategy
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
  } catch (error) {
    logger.error(`Error processing event ${event.id}: ${error}`);
    // Continue processing other events even if one fails
  }
}

/**
 * Handles kernel-forwarded events (repos with ubiquity app installed)
 * Shell implementation - logs the event
 */
async function handleKernelForwardedEvent(context: Context<"server.start" | "server.restart", "action">, event: UserEvent): Promise<void> {
  const { logger } = context;
  logger.info(`[KERNEL-FORWARDED] Handling event ${event.id} from ${event.repo?.name}`, {
    eventType: event.type,
    eventId: event.id,
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
    eventType: event.type,
    eventId: event.id,
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
    eventType: event.type,
    eventId: event.id,
  });
  // TODO: Queue event for main workflow with user PAT authentication
}
