import { HandlerCallbacks } from "../types/callbacks";
import { dispatcher } from "./dispatcher";
import { handleCommand } from "./commands/github-slash-commands";
import { handleServerRestartWorker } from "./worker/server/restart";

export const workerCallbacks = {
  "issues.opened": [dispatcher], // offloading to a main-workflow-detached job
  "issue_comment.created": [handleCommand],
  "server.restart": [handleServerRestartWorker],
} as HandlerCallbacks;
