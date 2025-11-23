import { Context } from "../../types/index";
import { CallbackResult } from "../../types/callbacks";

export async function handleServerCallback(context: Context<"server.register", "worker">): Promise<CallbackResult> {
  const { logger, eventName, payload } = context;

  logger.info(`Handling server callback for event: ${eventName}`);
  logger.info(`Payload: ${JSON.stringify(payload)}`);

  return { status: 200, reason: "Success" };

}