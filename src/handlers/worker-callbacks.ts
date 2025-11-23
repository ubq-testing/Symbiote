import { Context, SupportedEvents } from "../types/index";
import { CallbackResult, HandlerCallbacks } from "../types/callbacks";
import { dispatcher } from "./dispatcher";
import { handleServerCallback } from "./server/callback";

async function handleIssueCommentWorker(context: Context<"issue_comment.created", "worker">): Promise<CallbackResult> {
  context.logger.info("Handling issue comment worker");
  return { status: 200, reason: "Issue comment worker" };
}

export const workerCallbacks = {
    "issue_comment.created": [handleIssueCommentWorker],
    "issues.opened": [dispatcher], // offloading to a main-workflow-detached job
    "server.register": [handleServerCallback],
  } as HandlerCallbacks;