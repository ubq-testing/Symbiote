import { Context } from "../../../types/index";
import { createRuntimeTracker } from "../../../utils/runtime-tracker";
import { pollUserEvents, processEvent, processNotification } from "./event-poller";
import { processPendingTelegramMessages, notifyHostViaTelegram } from "./telegram-handler";
import { syncWorkspaceRegistry } from "../../../adapters/ai/context-resolver";

// Time conversion constants
const MINUTES_TO_MS = 60 * 1000;
const SECONDS_TO_MS = 1000;

/**
 * Main server loop that runs indefinitely until stopped or restarted
 */
export async function runServerActionLoop({
  context,
  runtimeTracker,
  sessionId,
}: {
  context: Context<"server.start" | "server.restart", "action">;
  runtimeTracker: ReturnType<typeof createRuntimeTracker>;
  sessionId: string;
}): Promise<void> {
  const { logger, env, config, adapters } = context;
  let shouldStop = false;
  let stopSignalReceived = false;

  logger.info(`Server loop started`, { sessionId, workflowRunId: context.env.GITHUB_RUN_ID });

  const username = env.SYMBIOTE_HOST.USERNAME;
  const telegramEnabled = !!adapters.telegram;

  // Sync workspace registry at startup to cache fork mappings
  try {
    logger.info(`[CONTEXT] Syncing workspace registry at startup...`);
    const registry = await syncWorkspaceRegistry({
      octokit: context.hostOctokit,
      hostUsername: username,
      orgsToWorkIn: config.orgsToWorkIn ?? [],
      kv: adapters.kv,
    });
    logger.info(`[CONTEXT] Workspace registry synced`, {
      hostRepoCount: registry.host_repos.length,
      orgCount: Object.keys(registry.org_repos).length,
      forkMapSize: Object.keys(registry.fork_map).length,
    });
  } catch (error) {
    logger.warn(`[CONTEXT] Failed to sync workspace registry at startup: ${error instanceof Error ? error.message : String(error)}`);
    // Continue anyway - the dispatchers will attempt to sync on demand
  }

  if (telegramEnabled) {
    logger.info(`[TELEGRAM] Telegram integration enabled, will monitor for host messages`);
    // Send startup notification to host
    await notifyHostViaTelegram(
      context,
      `🤖 <b>Symbiote Online</b>\n\nI'm now monitoring your GitHub activity. Send me a message anytime you need assistance.`
    );
  }

  const runtimeCheckIntervalMs = (config.runtimeCheckIntervalMinutes ?? 60) * MINUTES_TO_MS;
  const pollIntervalMs = (config.pollIntervalSeconds ?? 60) * SECONDS_TO_MS;
  const eventsPerPage = 30;

  // Set up periodic runtime check
  const runtimeCheckInterval = setInterval(async () => {
    try {
      const shouldRestart = await runtimeTracker.shouldRestart();
      if (shouldRestart) {
        logger.info(`Runtime threshold reached, initiating restart`);
        clearInterval(runtimeCheckInterval);
        shouldStop = true;
        await initiateRestart(context, sessionId);
      }
    } catch (error) {
      logger.error(`Error checking runtime: ${error}`);
    }
  }, runtimeCheckIntervalMs);

  // Track last event ID to avoid processing duplicates
  let lastProcessedEventId: string | null = null;
  let lastPollTimestamp: string | null = null;

  // Main server loop - poll for events at configured interval
  while (!shouldStop && !stopSignalReceived) {
    try {
      // Check for unsolicited Telegram messages (commands from host outside of AI conversations)
      // Note: Awaited responses during AI tool calls are handled within the tool itself
      if (telegramEnabled) {
        const telegramMessages = await processPendingTelegramMessages(context);
        if (telegramMessages.length > 0) {
          logger.info(`[TELEGRAM] Processing ${telegramMessages.length} unsolicited message(s) from host`);
          for (const msg of telegramMessages) {
            logger.info(`[TELEGRAM] Host message: ${msg.text.slice(0, 200)}`);
            // TODO: Route Telegram commands to appropriate handlers (e.g., "/status", "/stop")
          }
        }
      }

      logger.info(`Polling for user events: ${username}`);

      const timeSince = lastPollTimestamp ? new Date(lastPollTimestamp) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);

      // Poll for user events
      const { events, notifications, lastPollTimestamp: newLastPollTimestamp } = await pollUserEvents({
        context,
        username,
        perPage: eventsPerPage,
        timeSince,
        now: new Date(Date.now()),
      });

      lastPollTimestamp = newLastPollTimestamp;

      if (notifications.length > 0) {
        logger.info(`Found ${notifications.length} notifications, processing...`);
        for (const notification of notifications) {
          await processNotification(context, notification);
        }
      }

      if (events.length > 0) {
        logger.info(`Found ${events.length} events, processing...`);

        // Process events (filter out already processed ones)
        for (const event of events) {
          // Skip if we've already processed this event
          if (lastProcessedEventId && event.id === lastProcessedEventId) {
            continue;
          }

          await processEvent(context, event);

          // Update last processed event ID
          if (!lastProcessedEventId || event.id > lastProcessedEventId) {
            lastProcessedEventId = event.id;
          }
        }
      } else {
        logger.debug(`No new events found`);
      }
    } catch (error) {
      logger.error(`Error in event polling loop: ${error}`);
      // Continue polling even if there's an error
    }

    // Wait for polling interval before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  clearInterval(runtimeCheckInterval);
  
  // Send shutdown notification
  if (telegramEnabled) {
    await notifyHostViaTelegram(context, `⏸️ <b>Symbiote Offline</b>\n\nShutting down. I'll be back soon.`);
  }
  
  logger.info(`Server loop ended`, { sessionId, workflowRunId: context.env.GITHUB_RUN_ID });
}

/**
 * Sends restart callback to worker and waits for confirmation
 */
async function initiateRestart(context: Context<"server.start" | "server.restart", "action">, sessionId: string): Promise<void> {
  const { logger, env, config } = context;
  const { WORKER: { URL, SECRET } } = env;

  const maxRetries = 3;
  const retryDelayMs = 10 * SECONDS_TO_MS;
  const restartTimeoutMs = 3 * MINUTES_TO_MS;

  logger.info(`Initiating restart, sending callback to worker`, {
    sessionId,
    workflowRunId: context.env.GITHUB_RUN_ID,
    workerUrl: URL,
  });

  let retries = 0;
  let confirmed = false;

  // Get the necessary data from context
  // For action context, we need to extract what we can from the payload
  const stateId = sessionId; // sessionId is the stateId
  // Try to get authToken and ref from the original payload if available
  const originalPayload = context.payload.client_payload;
  const authToken = originalPayload?.authToken || "";
  const ref = originalPayload?.ref || config.executionBranch || "main";

  while (retries < maxRetries && !confirmed) {
    try {
      const response = await Promise.race([
        fetch(`${URL}/callback`, {
          method: "POST",
          headers: {
            "X-GitHub-Event": "server.restart",
            "Content-Type": "application/json",
            Authorization: `Bearer ${SECRET}`,
          },
          body: JSON.stringify({
            action: "server.restart",
            client_payload: {
              stateId,
              sessionId,
              workflowId: context.env.GITHUB_RUN_ID,
              authToken,
              ref,
              command: originalPayload?.command || "",
              signature: originalPayload?.signature || "",
            },
          }),
        }),
        new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("Timeout")), restartTimeoutMs)),
      ]);

      if (response.ok) {
        const data = await response.json();
        if (data.message === "Callback received" || data.status === 200) {
          confirmed = true;
          logger.info(`Restart callback confirmed by worker`);
          break;
        }
      }

      retries++;
      if (retries < maxRetries) {
        logger.warn(`Restart callback failed, retrying (${retries}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    } catch (error) {
      retries++;
      logger.error(`Error sending restart callback: ${error}`);
      if (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  if (!confirmed) {
    logger.error(`Failed to confirm restart callback after ${maxRetries} retries, terminating anyway`);
  }

  // Exit the process
  logger.info(`Terminating workflow run to allow restart`);
  process.exit(0);
}
