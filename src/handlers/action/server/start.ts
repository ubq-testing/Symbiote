import { Context } from "../../../types/index";
import { CallbackResult } from "../../../types/callbacks";
import { runServerActionLoop } from "./shared";
import { createRuntimeTracker } from "../../../utils/runtime-tracker";

/**
 * Handles server.start event in action context
 * The action will run indefinitely until stopped or restarted
 */
export async function handleServerStartAction(
    context: Context<"server.start", "action">
  ): Promise<CallbackResult> {
    const { logger, payload, octokit, env } = context;
    const sessionId = payload.client_payload.sessionId;
  
    logger.info(`Starting Symbiote server in action context`, { sessionId });
  
    // Get the current workflow run ID
    const runId = process.env.GITHUB_RUN_ID ? parseInt(process.env.GITHUB_RUN_ID, 10) : null;
    if (!runId) {
      throw new Error("GITHUB_RUN_ID not found in environment");
    }
  
    // Create runtime tracker
    const runtimeTracker = createRuntimeTracker(env, octokit);
  
    // Start the server loop
    await runServerActionLoop(context, runtimeTracker, sessionId, runId);
  
    return { status: 200, reason: "Server started" };
  }
  