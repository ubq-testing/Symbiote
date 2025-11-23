import { Context } from "../../../types/index";
import { CallbackResult } from "../../../types/callbacks";
import { createRuntimeTracker } from "../../../utils/runtime-tracker";
import { runServerActionLoop } from "./shared";


const MAX_POLL_ATTEMPTS = 3;
const POLL_INTERVAL_MS = 1000;

/**
 * Handles server.restart event in action context
 * Checks if previous workflow run is still running and cancels it if needed
 */
export async function handleServerRestartAction(
    context: Context<"server.restart", "action">
  ): Promise<CallbackResult> {
    const { logger, payload, octokit, env, config } = context;
    const { sessionId, workflowId } = payload.client_payload;
  
    logger.info(`Handling server restart in action context`, { sessionId, workflowId });
  
    // Check if the previous workflow run is still running
    const { owner, repo } = env.SYMBIOTE_HOST.FORKED_REPO;
    
    try {
      const runResponse = await octokit.rest.actions.getWorkflowRun({
        owner,
        repo,
        run_id: workflowId,
      });
  
      // If the previous run is still in progress, cancel it
      if (runResponse.data.status === "in_progress" || runResponse.data.status === "queued") {
        logger.info(`Cancelling previous workflow run`, { workflowId });
        await octokit.rest.actions.cancelWorkflowRun({
          owner,
          repo,
          run_id: workflowId,
        });

        // Poll until workflow is actually cancelled
        let cancelled = false;

        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          
          try {
            const statusResponse = await octokit.rest.actions.getWorkflowRun({
              owner,
              repo,
              run_id: workflowId,
            });

            if (statusResponse.data.status !== "in_progress" && statusResponse.data.status !== "queued") {
              cancelled = true;
              logger.info(`Previous workflow run cancelled successfully`, { workflowId, finalStatus: statusResponse.data.status });
              break;
            }
          } catch (statusError) {
            // If we can't fetch status, assume it's cancelled (might have been deleted)
            logger.info(`Could not fetch workflow status, assuming cancelled`, { workflowId, err: statusError instanceof Error ? statusError.message : String(statusError) });
            cancelled = true;
            break;
          }
        }

        if (!cancelled) {
          logger.warn(`Workflow ${workflowId} may still be running after cancellation attempt`, { workflowId, maxAttempts: MAX_POLL_ATTEMPTS });
        }
      }
    } catch (error) {
      // If run doesn't exist or is already cancelled, that's fine
      logger.info(`Previous workflow run not found or already stopped`, { workflowId, error: error instanceof Error ? error : new Error(String(error)) });
    }
  
    // Now start the server normally
    const runId = process.env.GITHUB_RUN_ID ? parseInt(process.env.GITHUB_RUN_ID, 10) : null;
    if (!runId) {
      throw new Error("GITHUB_RUN_ID not found in environment");
    }
  
    const runtimeTracker = createRuntimeTracker(env, octokit, config);
    await runServerActionLoop(context, runtimeTracker, sessionId, runId);
  
    return { status: 200, reason: "Server restarted" };
  }
  