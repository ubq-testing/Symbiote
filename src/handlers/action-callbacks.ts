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

  const url = `${WORKER_URL}`;
  context.logger.info(`Sending callback to: ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-GitHub-Event": "issue_comment.created",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WORKER_SECRET}`
      },
      body: JSON.stringify(context.payload)
    });

    context.logger.info(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to send callback to worker: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    context.logger.info(`Callback sent to worker: ${data.message}`);

    return { status: 200, reason: "Callback sent to worker" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    context.logger.error(`Error sending callback to ${url}: ${errorMessage}`);
    throw error;
  }
}

async function handleIssueOpenedAction(context: Context<"issues.opened", "action">): Promise<CallbackResult> {
  context.logger.info("Handling issue opened action");
  const {
    env: {
      WORKER_URL,
      WORKER_SECRET
    }
  } = context;

  const url = `${WORKER_URL}`;
  context.logger.info(`Sending callback to: ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-GitHub-Event": "issues.opened",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WORKER_SECRET}`
      },
      body: JSON.stringify(context.payload)
    });

    context.logger.info(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to send callback to worker: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    context.logger.info(`Callback sent to worker: ${data.message}`);

    return { status: 200, reason: "Callback sent to worker" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    context.logger.error(`Error sending callback to ${url}: ${errorMessage}`);
    throw error;
  }
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