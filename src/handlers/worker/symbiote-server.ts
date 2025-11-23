import { CallbackResult } from "../../types/callbacks";
import { Context } from "../../types/index";
import { SymbioteServer } from "../action/symbiote-server";

export async function handleSymbioteServer(context: Context<"issue_comment.created", "worker">, command: "start" | "restart" | "stop") {
  const { logger } = context;
  const server = new SymbioteServer(context);
  const { isRunning } = await server.init();
  let serverResponse: CallbackResult;

  switch (command) {
    case "start":
      if (isRunning) {
        logger.info("Symbiote server is already running");
        serverResponse = { status: 200, reason: "Symbiote server is already running" };
      } else {
        serverResponse = await server.restartServer(context);
      }
    case "restart":
      if (!isRunning) {
        logger.info("Symbiote server is not running");
        serverResponse = { status: 500, reason: "Symbiote server is not running" };
      } else {
        serverResponse = await server.restartServer(context);
      }
    case "stop":
      if (!isRunning) {
        logger.info("Symbiote server is not running");
        serverResponse = { status: 500, reason: "Symbiote server is not running" };
      } else {
        serverResponse = await server.stopServer(context);
      }
    default:
      logger.info(`Unknown command: ${command}`);
      serverResponse = { status: 500, reason: `Unknown command: ${command}` };
  }
  logger.info(`Callback result: ${serverResponse.status} ${serverResponse.reason}`);
  return serverResponse;
}
