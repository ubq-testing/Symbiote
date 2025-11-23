import { Context } from "../../../types/index";
import { CallbackResult } from "../../../types/callbacks";
import { createRuntimeTracker } from "../../../utils/runtime-tracker";
import { runServerActionLoop } from "./shared";

/**
 * Handles server.restart event in action context
 * Checks if previous workflow run is still running and cancels it if needed
 */
export async function handleServerRestartAction(
    context: Context<"server.restart", "action">
  ): Promise<CallbackResult> {
    const { logger, payload, octokit, env } = context;
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
  
        // Wait a bit for cancellation to take effect
        await new Promise((resolve) => setTimeout(resolve, 2000));
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
  
    const runtimeTracker = createRuntimeTracker(env, octokit);
    await runServerActionLoop(context, runtimeTracker, sessionId, runId);
  
    return { status: 200, reason: "Server restarted" };
  }
  