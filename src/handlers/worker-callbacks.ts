import { Context, SupportedEvents } from "../types/index";
import { CallbackResult, HandlerCallbacks } from "../types/callbacks";
import { dispatcher } from "./dispatcher";
import { handleServerCallback } from "./server/callback";
import { handleCommand } from "./commands/command-handler";

async function handleIssueCommentWorker(context: Context<"issue_comment.created", "worker">): Promise<CallbackResult> {
  await handleCommand(context);
  return { status: 200, reason: "Command handled" };
}

export const workerCallbacks = {
    "issue_comment.created": [handleIssueCommentWorker],
    "issues.opened": [dispatcher], // offloading to a main-workflow-detached job
    "server.register": [handleServerCallback],
  } as HandlerCallbacks;