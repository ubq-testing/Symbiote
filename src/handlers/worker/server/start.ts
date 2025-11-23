import { CallbackResult } from "../../../types/callbacks";
import { Context } from "../../../types/index";
import { handleSymbioteServer } from "../symbiote-server";

export async function handleServerStartWorker(context: Context<"server.start", "worker">): Promise<CallbackResult> {
    const { logger, payload } = context;
    const { sessionId, workflowId } = payload.client_payload;
    logger.info(`Handling server.start event in worker`, { sessionId, workflowId });
    return await handleSymbioteServer(context, "start");
  }