import { Context } from "../../../types/index";
import { createRuntimeTracker } from "../../../utils/runtime-tracker";
import { pollUserEvents, processEvent, processNotification } from "./event-poller";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";

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
}:
{
  context: Context<"server.start" | "server.restart", "action">,
  runtimeTracker: ReturnType<typeof createRuntimeTracker>,
  sessionId: string,
}
): Promise<void> {
  const { logger, env, appOctokit, hostOctokit, config,  } = context;
  let shouldStop = false;
  let stopSignalReceived = false;

  logger.info(`Server loop started`, { sessionId, workflowRunId: context.env.GITHUB_RUN_ID });

  const username = env.SYMBIOTE_HOST.USERNAME;

  const runtimeCheckIntervalMs = (config.runtimeCheckIntervalMinutes ?? 60) * MINUTES_TO_MS;
  const pollIntervalMs = (config.pollIntervalSeconds ?? 60) * SECONDS_TO_MS;
  const eventsPerPage = config.eventsPerPage ?? 30;

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

  // Main server loop - poll for events at configured interval
  while (!shouldStop && !stopSignalReceived) {
    try {
      logger.info(`Polling for user events: ${username}`);
      
      // Poll for user events
      const {events, notifications} = await pollUserEvents({
        context,
        username,
        perPage: eventsPerPage,
      });

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
  logger.info(`Server loop ended`, { sessionId, workflowRunId: context.env.GITHUB_RUN_ID });
}

/**
 * Sends restart callback to worker and waits for confirmation
 */
async function initiateRestart(
  context: Context<"server.start" | "server.restart", "action">,
  sessionId: string,
): Promise<void> {
  const { logger, env, config } = context;
  const { WORKER_URL, WORKER_SECRET } = env;

  const maxRetries = 3;
  const retryDelayMs = 10 * SECONDS_TO_MS;
  const restartTimeoutMs = 3 * MINUTES_TO_MS;

  logger.info(`Initiating restart, sending callback to worker`, {
    sessionId,
    workflowRunId: context.env.GITHUB_RUN_ID,
    workerUrl: WORKER_URL,
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
        fetch(`${WORKER_URL}/callback`, {
          method: "POST",
          headers: {
            "X-GitHub-Event": "server.restart",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${WORKER_SECRET}`,
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
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), restartTimeoutMs)
        ),
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