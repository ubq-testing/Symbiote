import { Context } from "../types";
import { CallbackResult, HandlerCallbacks } from "../types/callbacks";

async function handleIssueCommentAction(context: Context<"issue_comment.created", "action">): Promise<CallbackResult> {
  context.logger.info("Handling issue comment action");
  const {
    env: {
      WORKER_URL,
      WORKER_SECRET
    }
  } = context;

  const response = await fetch(`${WORKER_URL}/callback`, {
    method: "POST",
    body: JSON.stringify({
      secret: WORKER_SECRET,
      event: "issue_comment.created",
      payload: context.payload
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to send callback to worker: ${response.statusText}`);
  }

  const data = await response.json();

  console.log(`Callback sent to worker: ${data.message}`);

  return { status: 200, reason: "Callback sent to worker" };
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