import { CallbackResult } from "../../types/callbacks";
import { Context } from "../../types/context";

export async function handleIssueComment(context: Context<"issue_comment.created", "worker">): Promise<CallbackResult> {
    const { logger, commentHandler,  payload: { comment } } = context;
    
    if (/@keyrxng/gi.test(comment.body ?? "") && comment.user?.login?.toLowerCase() === "keyrxng") {
      logger.ok("Symbiote command received!");
    }

    return { status: 200, reason: "Issue comment handled" };
  }
  
export   async function handleIssueOpened(context: Context<"issues.opened", "worker">): Promise<CallbackResult> {
    const { logger, config } = context;
  
      logger.info("Handling issue opened event");

      return { status: 200, reason: "Issue opened handled" };
  }
  
export   async function handlePullRequestOpened(context: Context<"pull_request.opened", "worker">): Promise<CallbackResult> {
    const { logger, config } = context;
  
      logger.info("Handling pull request opened event");

      return { status: 200, reason: "Pull request opened handled" };
  }
  