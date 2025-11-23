import { Context} from "../../../types/index";
import { CallbackResult } from "../../../types/callbacks";
import { dispatcher } from "../../dispatcher";

export async function handleServerRestartWorker(context: Context<"server.restart", "worker">): Promise<CallbackResult> {
    const { logger, payload } = context;
    const { sessionId, workflowId } = payload.client_payload;
  
    logger.info(`Handling server.restart event in worker`, { sessionId, workflowId });
  
    // Dispatch server.restart to the action repository
    return await dispatcher({
      ...context,
      eventName: "server.restart",
      payload: {
        action: "server.restart",
        client_payload: {
          ...context.pluginInputs,
          ...payload.client_payload,
        },
      },
    });
  }
  