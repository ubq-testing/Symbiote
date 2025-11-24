import { Context } from "../../../types/index";
import { CallbackResult } from "../../../types/callbacks";
import { runServerActionLoop } from "./shared";
import { createRuntimeTracker } from "../../../utils/runtime-tracker";

/**
 * Handles server.start event in action context
 * The action will run indefinitely until stopped or restarted
 */
export async function handleServerStartAction(context: Context<"server.start", "action">): Promise<CallbackResult> {
  const { logger, payload } = context;
  const sessionId = payload.client_payload.sessionId;

  logger.info(`Starting Symbiote server in action context`, { sessionId });

  // Create runtime tracker
  const runtimeTracker = createRuntimeTracker(context);

  // Start the server loop
  await runServerActionLoop({context, runtimeTracker, sessionId});

  return { status: 200, reason: "Server started" };
}
