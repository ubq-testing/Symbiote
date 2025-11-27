import { Context } from "../../../../types/index";
import type { Notification } from "../event-poller";
import { NotificationAssessmentRequest } from "../../../../adapters/ai/prompts/types";

export async function dispatchNotification({
  context,
  notification,
  route,
}: {
  context: Context<"server.start" | "server.restart", "action">;
  notification: Notification;
  route: "kernel-forwarded" | "safe-action" | "unsafe-action";
}): Promise<void> {
  const { logger, adapters } = context;
  const notificationId = notification.id ?? "unknown";
  const repoFullName = notification.repository?.full_name ?? null;

  logger.info(`[NOTIFICATIONS] Processing notification ${notificationId}`, {
    route,
    reason: notification.reason,
    subjectType: notification.subject?.type,
    repo: repoFullName,
  });

  if (!adapters.ai) {
    logger.warn(`[NOTIFICATIONS] AI adapter not configured; skipping notification ${notificationId}`);
    return;
  }

  const latestComment = await fetchLatestComment(context, notification.subject?.latest_comment_url);

  let octokit;
  const [owner, repo] = repoFullName?.split("/") ?? [];

  // if ((route === "kernel-forwarded" || route === "safe-action") && owner && repo) {
  //   octokit = await createRepoOctokit({
  //     env: context.env,
  //     owner,
  //     repo,
  //   });
  // } else {
  // }

  const request: NotificationAssessmentRequest = {
    hostUsername: context.env.SYMBIOTE_HOST.USERNAME,
    notification,
    latestCommentBody: latestComment?.body ?? null,
    latestCommentAuthor: latestComment?.author ?? null,
    octokit: context.appOctokit,
  };

  const { assessment, messages } = await adapters.ai.classifyNotification(request);

  logger.info(`[NOTIFICATIONS] AI assessment completed for ${notificationId}`, {
    assessment,
    commentPreview: latestComment?.body?.slice(0, 320),
  });

  if (assessment.classification === "respond" && assessment.shouldAct) {
    logger.info(`[NOTIFICATIONS] AI chose to act on notification ${notificationId}`, {
      suggestedActions: assessment.suggestedActions,
      confidence: assessment.confidence,
    });

    const { messages: actionMessages, response } = await adapters.ai.executeSuggestedActions({
      request,
      octokit: context.appOctokit,
      assessment,
      existingMessages: [...messages],
    });

    logger.info(`[NOTIFICATIONS] AI action result for ${notificationId}`, {
      results: response.results,
      finalResponse: response.finalResponse,
      messages: actionMessages,
    });
  } else {
    logger.info(`[NOTIFICATIONS] AI chose to ${assessment.classification} notification ${notificationId}`, {
      assessment,
      commentPreview: latestComment?.body?.slice(0, 320),
    });
  }
}

type LatestCommentDetails = {
  body: string | null;
  author: string | null;
  htmlUrl: string | null;
};

async function fetchLatestComment(
  context: Context<"server.start" | "server.restart", "action">,
  latestCommentUrl?: string | null
): Promise<LatestCommentDetails | null> {
  if (!latestCommentUrl) {
    return null;
  }

  try {
    const response = await context.hostOctokit.request({
      method: "GET",
      url: latestCommentUrl,
    });

    const data = response.data as Record<string, unknown>;
    const comment = data.comment as { body?: unknown } | undefined;
    const body = typeof data.body === "string" ? data.body : typeof comment?.body === "string" ? comment.body : null;
    const user = (data.user as { login?: string } | undefined)?.login;
    const actor = (data.actor as { login?: string } | undefined)?.login;

    return {
      body,
      author: user ?? actor ?? null,
      htmlUrl: typeof data.html_url === "string" ? data.html_url : null,
    };
  } catch (error) {
    context.logger.error(`[NOTIFICATIONS] Failed to load latest comment`, {
      latestCommentUrl,
      err: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
