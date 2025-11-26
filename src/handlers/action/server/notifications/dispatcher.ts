import { Context } from "../../../../types/index";
import type { Notification } from "../event-poller";
import { createRepoOctokit } from "../../../octokit";
import { MentionAssessmentRequest } from "../../../../adapters/ai/prompts/types";

type NotificationHandlerArgs = {
  context: Context<"server.start" | "server.restart", "action">;
  notification: Notification;
  summary: NotificationSummary;
  route: "kernel-forwarded" | "safe-action" | "unsafe-action";
  notificationRoute: NotificationRoute;
};

type NotificationHandler = (args: NotificationHandlerArgs) => Promise<void>;

type NotificationRoute =
  | "pull_request:mention"
  | "pull_request:review_requested"
  | "pull_request:state_change"
  | "pull_request:author"
  | "pull_request:generic"
  | "issue:mention"
  | "issue:assign"
  | "issue:author"
  | "issue:generic"
  | "commit:author"
  | "commit:generic"
  | "generic";

export type NotificationSummary = {
  id: string;
  unread: boolean;
  reason: string;
  normalizedReason: string;
  createdAt?: string;
  updatedAt?: string;
  threadUrl?: string;
  repository: {
    fullName: string | null;
    owner: string | null;
    name: string | null;
    isPrivate?: boolean;
    isFork?: boolean;
    ownerLogin?: string;
    htmlUrl?: string;
  };
  subject: {
    type: string;
    normalizedType: string;
    title?: string | null;
    apiUrl?: string | null;
    latestCommentUrl?: string | null;
    number?: number | null;
  };
};

const MENTION_REASONS = new Set(["mention", "team_mention", "comment"]);
const ASSIGN_REASONS = new Set(["assign", "assign_review_request"]);

export async function dispatchNotification({
  context,
  notification,
  route,
}: {
  context: Context<"server.start" | "server.restart", "action">;
  notification: Notification;
  route: "kernel-forwarded" | "safe-action" | "unsafe-action";
}): Promise<void> {
  const summary = buildNotificationSummary(notification);
  const notificationRoute = determineNotificationRoute(summary);
  const handler = notificationHandlers[notificationRoute] ?? notificationHandlers.generic;

  context.logger.info(`[NOTIFICATIONS] Routing notification ${summary.id}`, {
    route,
    notificationRoute,
    reason: summary.reason,
    subjectType: summary.subject.type,
    repo: summary.repository.fullName,
  });

  await handler({ context, notification, summary, route, notificationRoute });
}

function buildNotificationSummary(notification: Notification): NotificationSummary {
  const reason = notification.reason ?? "unknown";
  const normalizedReason = reason.toLowerCase();
  const subjectType = notification.subject?.type ?? "Unknown";
  const normalizedType = subjectType.toLowerCase();
  const repoFullName = notification.repository?.full_name ?? null;
  const [owner, name] = repoFullName?.split("/") ?? [null, null];

  return {
    id: notification.id ?? "unknown",
    unread: Boolean(notification.unread),
    reason,
    normalizedReason,
    updatedAt: notification.updated_at,
    threadUrl: notification.url,
    repository: {
      fullName: repoFullName,
      owner,
      name,
      isPrivate: notification.repository?.private,
      isFork: notification.repository?.fork,
      ownerLogin: notification.repository?.owner?.login,
      htmlUrl: notification.repository?.html_url,
    },
    subject: {
      type: subjectType,
      normalizedType,
      title: notification.subject?.title,
      apiUrl: notification.subject?.url,
      latestCommentUrl: notification.subject?.latest_comment_url,
      number: extractNumericIdentifier(notification.subject?.url),
    },
  };
}

function determineNotificationRoute(summary: NotificationSummary): NotificationRoute {
  const { normalizedType, number } = summary.subject;
  const reason = summary.normalizedReason;

  if (normalizedType === "pullrequest") {
    if (reason === "review_requested" || reason === "review_requested_team") {
      return "pull_request:review_requested";
    }
    if (MENTION_REASONS.has(reason)) {
      return "pull_request:mention";
    }
    if (reason === "state_change") {
      return "pull_request:state_change";
    }
    if (reason === "author") {
      return "pull_request:author";
    }
    if (ASSIGN_REASONS.has(reason)) {
      return "pull_request:generic";
    }
    return "pull_request:generic";
  }

  if (normalizedType === "issue") {
    if (MENTION_REASONS.has(reason)) {
      return "issue:mention";
    }
    if (ASSIGN_REASONS.has(reason)) {
      return "issue:assign";
    }
    if (reason === "author") {
      return "issue:author";
    }
    return "issue:generic";
  }

  if (normalizedType === "commit") {
    if (reason === "author") {
      return "commit:author";
    }
    return "commit:generic";
  }

  // For other types we can later expand (Releases, SecurityAlerts, etc.)
  if (number) {
    // Known numeric threads but unknown type -> treat as issues for now
    return "issue:generic";
  }

  return "generic";
}

const notificationHandlers: Record<NotificationRoute, NotificationHandler> = {
  "pull_request:mention": handlePullRequestMention,
  "pull_request:review_requested": createLoggingHandler({
    label: "pull_request:review_requested",
    message: "Review requested on PR; queue diff analysis.",
    plannedNextStep: "Pull latest PR diff, evaluate review blockers, draft responses.",
  }),
  "pull_request:state_change": createLoggingHandler({
    label: "pull_request:state_change",
    message: "PR state change observed (opened/closed/merged).",
    plannedNextStep: "Update internal state and reconcile pending automation.",
  }),
  "pull_request:author": createLoggingHandler({
    label: "pull_request:author",
    message: "Activity on a PR authored by host user.",
    plannedNextStep: "Track reviewer feedback and prep automation for follow-ups.",
  }),
  "pull_request:generic": createLoggingHandler({
    label: "pull_request:generic",
    message: "Generic PR notification routed to holding pattern.",
    plannedNextStep: "Await specific triggers (mentions/reviews) before acting.",
  }),
  "issue:mention": createLoggingHandler({
    label: "issue:mention",
    message: "Issue mention detected; triage request.",
    plannedNextStep: "Ingest issue context and evaluate possible PR bootstrap.",
  }),
  "issue:assign": createLoggingHandler({
    label: "issue:assign",
    message: "Issue assignment notice received.",
    plannedNextStep: "Record ownership and consider seeding implementation branch.",
  }),
  "issue:author": createLoggingHandler({
    label: "issue:author",
    message: "Activity on an issue opened by host user.",
    plannedNextStep: "Monitor collaborator replies and determine actions.",
  }),
  "issue:generic": createLoggingHandler({
    label: "issue:generic",
    message: "Issue notification (generic) acknowledged.",
    plannedNextStep: "Hold until actionable signals emerge.",
  }),
  "commit:author": createLoggingHandler({
    label: "commit:author",
    message: "Commit authored notification (likely push events).",
    plannedNextStep: "Sync commit metadata for history-aware automations.",
  }),
  "commit:generic": createLoggingHandler({
    label: "commit:generic",
    message: "Commit notification captured.",
    plannedNextStep: "Record commit for future release planning.",
  }),
  generic: createLoggingHandler({
    label: "generic",
    message: "Notification routed to generic handler.",
    plannedNextStep: "No automation triggered yet.",
  }),
};

function createLoggingHandler({
  label,
  message,
  plannedNextStep,
}: {
  label: NotificationRoute;
  message: string;
  plannedNextStep: string;
}): NotificationHandler {
  return async ({ context, summary }): Promise<void> => {
    context.logger.info(`[NOTIFICATIONS][${label}] ${message}`, {
      notificationId: summary.id,
      repo: summary.repository.fullName,
      subjectTitle: summary.subject.title,
      subjectNumber: summary.subject.number,
      unread: summary.unread,
      plannedNextStep,
      metadata: {
        reason: summary.reason,
        subjectType: summary.subject.type,
        latestCommentUrl: summary.subject.latestCommentUrl,
        threadUrl: summary.threadUrl,
      },
    });
  };
}

function extractNumericIdentifier(url?: string | null): number | null {
  if (!url) {
    return null;
  }

  const parts = url.split("/").filter(Boolean);
  const maybeNumber = parts[parts.length - 1];
  const parsed = Number(maybeNumber);

  return Number.isFinite(parsed) ? parsed : null;
}

async function handlePullRequestMention(args: NotificationHandlerArgs): Promise<void> {
  const { context, summary, route, notificationRoute } = args;
  const { logger, adapters } = context;

  const mentionContext = await fetchMentionContext(context, summary.subject.latestCommentUrl);

  if (!adapters.ai) {
    logger.warn(`[NOTIFICATIONS][pull_request:mention] AI adapter not configured; captured context only.`, {
      notificationId: summary.id,
      mentionPreview: mentionContext?.body?.slice(0, 200),
    });
    return;
  }

  let octokit;

  if (route === "kernel-forwarded" || route === "safe-action") {
    octokit = await createRepoOctokit({
      env: context.env,
      owner: summary.repository.owner ?? "",
      repo: summary.repository.name ?? "",
    });
  } else {
    octokit = context.hostOctokit;
  }

  const aiRequest: MentionAssessmentRequest = {
    hostUsername: context.env.SYMBIOTE_HOST.USERNAME,
    notificationReason: summary.reason,
    notificationType: summary.subject.type,
    repoFullName: summary.repository.fullName,
    subjectTitle: summary.subject.title,
    subjectUrl: summary.subject.apiUrl ?? summary.threadUrl,
    latestCommentUrl: summary.subject.latestCommentUrl,
    mentionAuthor: mentionContext?.author ?? null,
    mentionText: mentionContext?.body ?? summary.subject.title ?? null,
    unread: summary.unread,
    createdAt: summary.createdAt ?? summary.updatedAt,
    additionalContext: buildAdditionalContext(summary, mentionContext),
    octokit,
  };

  const { assessment, messages } = await adapters.ai.classifyMention(aiRequest);

  logger.info(`[NOTIFICATIONS][pull_request:mention] AI assessment completed`, {
    notificationId: summary.id,
    assessment,
    mentionPreview: mentionContext?.body?.slice(0, 320),
  });

  // If AI decided to respond, it may have already taken actions via tools
  // The assessment.suggestedActions contains what it planned/intended to do
  if (assessment.classification === "respond" && assessment.shouldAct) {
    logger.info(`[NOTIFICATIONS][pull_request:mention] AI chose to respond autonomously`, {
      notificationId: summary.id,
      suggestedActions: assessment.suggestedActions,
      confidence: assessment.confidence,
    });

    let existingMessages = [...messages];

    const { messages: actionMessages, response } = await adapters.ai.executeSuggestedActions({
      request: aiRequest,
      octokit,
      assessment,
      existingMessages,
    });

    logger.info(`[NOTIFICATIONS][pull_request:mention] AI action result`, {
      notificationId: summary.id,
      results: response.results,
      finalResponse: response.finalResponse,
      messages: actionMessages,
    });
  } else {
    logger.info(`[NOTIFICATIONS][pull_request:mention] AI chose to ignore the notification`, {
      notificationId: summary.id,
      assessment,
      mentionPreview: mentionContext?.body?.slice(0, 320),
    });
  }
}

type MentionContextDetails = {
  body: string | null;
  author: string | null;
  htmlUrl: string | null;
  type: string | null;
};

async function fetchMentionContext(
  context: Context<"server.start" | "server.restart", "action">,
  latestCommentUrl?: string | null
): Promise<MentionContextDetails | null> {
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
    const body = typeof data.body === "string" ? (data.body as string) : typeof comment?.body === "string" ? (comment.body as string) : null;
    const user = (data.user as { login?: string } | undefined)?.login;
    const actor = (data.actor as { login?: string } | undefined)?.login;

    return {
      body,
      author: user ?? actor ?? null,
      htmlUrl: typeof data.html_url === "string" ? data.html_url : null,
      type: typeof data.node_id === "string" ? (data.node_id.split(":")[0] ?? null) : null,
    };
  } catch (error) {
    context.logger.error(`[NOTIFICATIONS][pull_request:mention] Failed to load mention context`, {
      latestCommentUrl,
      err: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function buildAdditionalContext(summary: NotificationSummary, mentionContext: MentionContextDetails | null): string[] {
  const contextLines = [
    `Repo: ${summary.repository.fullName ?? "unknown"}`,
    `Subject: ${summary.subject.title ?? "untitled"}`,
    `Reason: ${summary.reason}`,
    `Unread: ${summary.unread}`,
  ];

  if (mentionContext?.author) {
    contextLines.push(`Mention author: ${mentionContext.author}`);
  }

  if (mentionContext?.htmlUrl) {
    contextLines.push(`Comment URL: ${mentionContext.htmlUrl}`);
  }

  return contextLines;
}
