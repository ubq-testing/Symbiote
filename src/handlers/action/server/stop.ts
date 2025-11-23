import { Context } from "../../../types/index";
import { CallbackResult } from "../../../types/callbacks";

/**
 * Handles any prerequisites before the server stops
 */
export async function handleStopPrerequisites(
  context: Context<"server.start" | "server.restart" | "server.stop", "action">,
  sessionId: string,
  workflowRunId: number
): Promise<CallbackResult> {
  const { logger } = context;
  logger.info(`Handling stop prerequisites`, { sessionId, workflowRunId });
  
  return { status: 200, reason: "Stop prerequisites completed" };
}


/**
 * Handles server.stop event in action context
 * Stops the server loop and exits the process
 */
export async function handleServerStopAction(
    context: Context<"server.stop", "action">
  ): Promise<CallbackResult> {
    const { logger, payload, octokit, env } = context;
    const { sessionId, workflowId } = payload.client_payload;
    logger.info(`Handling server stop in action context`);
  
    const result = await handleStopPrerequisites(context, sessionId, workflowId);
    if (result.status === 200) {
      process.exit(0);
    } else {
      const errorMessage = `Error handling stop prerequisites: ${result.reason}`;
      logger.error(errorMessage);

      /**
       * If stop prerequisites fail, we should still attempt to exit gracefully.
       * However, we log the error first so it's visible in the workflow logs.
       */
      throw new Error(errorMessage);
    }
  }
  