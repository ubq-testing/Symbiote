import { Context } from "../types";
import { CallbackResult, HandlerCallbacks } from "../types/callbacks";

async function handleIssueCommentAction(context: Context<"issue_comment.created", "action">): Promise<CallbackResult> {
  context.logger.info("Handling issue comment action");
  
  return { status: 200, reason: "Issue comment created" };
}

async function handleIssueOpenedAction(context: Context<"issues.opened", "action">): Promise<CallbackResult> {
  context.logger.info("Handling issue opened action");
  
  return { status: 200, reason: "Issue opened" };
}

async function handlePullRequestOpenedAction(context: Context<"pull_request.opened", "action">): Promise<CallbackResult> {
  context.logger.info("Handling pull request opened action");
  
  return { status: 200, reason: "Pull request opened" };
}

export const actionCallbacks = {
  "issue_comment.created": [handleIssueCommentAction],
  "issues.opened": [handleIssueOpenedAction],
  "pull_request.opened": [handlePullRequestOpenedAction],
} as HandlerCallbacks;