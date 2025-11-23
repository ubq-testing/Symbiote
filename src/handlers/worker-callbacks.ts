import { HandlerCallbacks } from "../types/callbacks";
import { handleCommand } from "./commands/github-slash-commands";
import { handleServerRestartWorker } from "./worker/server/restart";
import { handleServerStartWorker } from "./worker/server/start";
import { handleServerStopWorker } from "./worker/server/stop";

export const workerCallbacks = {
  // "issues.opened": [dispatcher], // offloading to a main-workflow-detached job
  "issue_comment.created": [handleCommand],
  "server.restart": [handleServerRestartWorker],
  "server.start": [handleServerStartWorker],
  "server.stop": [handleServerStopWorker],
} as HandlerCallbacks;
