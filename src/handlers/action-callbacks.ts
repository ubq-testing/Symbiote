import { HandlerCallbacks } from "../types/callbacks";
import { handleServerStartAction } from "./action/server/start";
import { handleServerRestartAction } from "./action/server/restart";
import { handleServerStopAction } from "./action/server/stop";

export const actionCallbacks = {
  "server.start": [handleServerStartAction],
  "server.restart": [handleServerRestartAction],
  "server.stop": [handleServerStopAction],
} as HandlerCallbacks;
