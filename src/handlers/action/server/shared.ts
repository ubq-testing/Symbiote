import { Context } from "../../../types/index";
import { createRuntimeTracker } from "../../../utils/runtime-tracker";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every 60 minutes
const RESTART_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const MAX_RETRIES = 3;

/**
 * Main server loop that runs indefinitely until stopped or restarted
 */
export async function runServerActionLoop(
  context: Context<"server.start" | "server.restart", "action">,
  runtimeTracker: ReturnType<typeof createRuntimeTracker>,
  sessionId: string,
  workflowRunId: number
): Promise<void> {
  const { logger, env, octokit } = context;
  let shouldStop = false;
  let stopSignalReceived = false;

  logger.info(`Server loop started`, { sessionId, workflowRunId });

  const { owner, repo } = env.SYMBIOTE_HOST.FORKED_REPO;

  // Set up periodic runtime check
  const runtimeCheckInterval = setInterval(async () => {
    try {
      const shouldRestart = await runtimeTracker.shouldRestart();
      if (shouldRestart) {
        logger.info(`Runtime threshold reached, initiating restart`);
        clearInterval(runtimeCheckInterval);
        shouldStop = true;
        await initiateRestart(context, sessionId, workflowRunId);
      }
    } catch (error) {
      logger.error(`Error checking runtime: ${error}`);
    }
  }, CHECK_INTERVAL_MS);

  // Main server loop - keep running until stopped
  while (!shouldStop && !stopSignalReceived) {
    // The server is running - we just need to keep the process alive
    // In a real implementation, this would be where your actual server logic runs
    await new Promise((resolve) => setTimeout(resolve, 60 * 60 * 1000)); // Check every 60 minutes
  }

  clearInterval(runtimeCheckInterval);
  logger.info(`Server loop ended`, { sessionId, workflowRunId });
}

/**
 * Sends restart callback to worker and waits for confirmation
 */
async function initiateRestart(
  context: Context<"server.start" | "server.restart", "action">,
  sessionId: string,
  workflowRunId: number
): Promise<void> {
  const { logger, env } = context;
  const { WORKER_URL, WORKER_SECRET } = env;

  logger.info(`Initiating restart, sending callback to worker`, {
    sessionId,
    workflowRunId,
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
  const ref = originalPayload?.ref || context.config.executionBranch || "main";

  while (retries < MAX_RETRIES && !confirmed) {
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
              workflowId: workflowRunId,
              authToken,
              ref,
              command: originalPayload?.command || "",
              signature: originalPayload?.signature || "",
            },
          }),
        }),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), RESTART_TIMEOUT_MS)
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
      if (retries < MAX_RETRIES) {
        logger.warn(`Restart callback failed, retrying (${retries}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds before retry
      }
    } catch (error) {
      retries++;
      logger.error(`Error sending restart callback: ${error}`);
      if (retries < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }
  }

  if (!confirmed) {
    logger.error(`Failed to confirm restart callback after ${MAX_RETRIES} retries, terminating anyway`);
  }

  // Exit the process
  logger.info(`Terminating workflow run to allow restart`);
  process.exit(0);
}