import { Context } from "../../../types/index";
import { CallbackResult } from "../../../types/callbacks";
import { handleSymbioteServer } from "../symbiote-server";

export async function handleServerStopWorker(context: Context<"server.stop", "worker">): Promise<CallbackResult> {
    const { logger, payload } = context;
    const { sessionId, workflowId } = payload.client_payload;
  
    logger.info(`Handling server.stop event in worker`, { sessionId, workflowId });
    return await handleSymbioteServer(context, "stop");
  }