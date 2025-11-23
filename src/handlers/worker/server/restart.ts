import { Context} from "../../../types/index";
import { CallbackResult } from "../../../types/callbacks";
import { handleSymbioteServer } from "../symbiote-server";

export async function handleServerRestartWorker(context: Context<"server.restart", "worker">): Promise<CallbackResult> {
    const { logger, payload } = context;
    const { sessionId, workflowId } = payload.client_payload;
    logger.info(`Handling server.restart event in worker`, { sessionId, workflowId });
    return await handleSymbioteServer(context, "restart");
  }
  