import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  NotificationAssessmentRequest,
  EventAssessmentRequest,
  AssessmentRequest,
  AssessmentResponse,
  isNotificationRequest,
} from "./prompts/types";
import { NOTIFICATION_CLASSIFICATION_SYSTEM_PROMPT, EVENT_CLASSIFICATION_SYSTEM_PROMPT } from "./prompts/notification-classification";
import { SUGGESTED_ACTIONS_SYSTEM_PROMPT } from "./prompts/suggested-action-execution";
import { formatList } from "./prompts/shared";
import { stripUrlsFromObject } from "./utils";

/**
 * Builds classification messages for either notification or event input
 */
export function buildClassificationMessages(request: Omit<AssessmentRequest, "octokit">): ChatCompletionMessageParam[] {
  if (isNotificationRequest(request as AssessmentRequest)) {
    return buildNotificationMessages(request as Omit<NotificationAssessmentRequest, "octokit">);
  } else {
    return buildEventMessages(request as Omit<EventAssessmentRequest, "octokit">);
  }
}

/**
 * Builds messages for notification classification
 */
export function buildNotificationMessages(request: Omit<NotificationAssessmentRequest, "octokit">): ChatCompletionMessageParam[] {
  const { hostUsername, notification, latestCommentBody, latestCommentAuthor, resolvedSubject } = request;

  const payload = {
    kind: "notification",
    hostUsername,
    notification: {
      id: notification.id,
      reason: notification.reason,
      unread: notification.unread,
      updated_at: notification.updated_at,
      repository: notification.repository
        ? {
            full_name: notification.repository.full_name,
            private: notification.repository.private,
            fork: notification.repository.fork,
            owner: notification.repository.owner?.login,
            html_url: notification.repository.html_url,
          }
        : null,
      subject: notification.subject
        ? {
            type: notification.subject.type,
            title: notification.subject.title,
            url: notification.subject.url,
            latest_comment_url: notification.subject.latest_comment_url,
          }
        : null,
    },
    latestComment: latestCommentBody
      ? {
          body: latestCommentBody,
          author: latestCommentAuthor,
        }
      : null,
    // Pre-resolved context for the specific subject (PR/Issue)
    // Use lookup_host_fork tool to find forks for other repos
    resolvedSubject: resolvedSubject ?? null,
  };

  const systemPrompt = NOTIFICATION_CLASSIFICATION_SYSTEM_PROMPT(hostUsername);

  return [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: JSON.stringify(payload, null, 2),
    },
  ];
}

/**
 * Builds messages for event classification
 */
export function buildEventMessages(request: Omit<EventAssessmentRequest, "octokit">): ChatCompletionMessageParam[] {
  const { hostUsername, event, resolvedSubject } = request;

  const payload = {
    kind: "event",
    hostUsername,
    event: {
      id: event.id,
      type: event.type,
      created_at: event.created_at,
      actor: event.actor
        ? {
            login: event.actor.login,
            avatar_url: event.actor.avatar_url,
          }
        : null,
      repo: event.repo
        ? {
            name: event.repo.name,
            url: event.repo.url,
          }
        : null,
      org: event.org
        ? {
            login: event.org.login,
          }
        : null,
      payload: stripUrlsFromObject(event.payload as Record<string, unknown>),
    },
    // Pre-resolved context for the specific subject (PR/Issue)
    // Use lookup_host_fork tool to find forks for other repos
    resolvedSubject: resolvedSubject ?? null,
  };

  const systemPrompt = EVENT_CLASSIFICATION_SYSTEM_PROMPT(hostUsername);

  return [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: JSON.stringify(payload, null, 2),
    },
  ];
}

/**
 * Builds messages for suggested action execution
 */
export function buildSuggestedActionsMessages(
  request: AssessmentRequest,
  assessment: AssessmentResponse,
  existingMessages: ChatCompletionMessageParam[],
  telegramEnabled: boolean
): ChatCompletionMessageParam[] {
  const systemMessage = existingMessages.find((message) => message.role === "system");
  if (systemMessage) {
    systemMessage.content = SUGGESTED_ACTIONS_SYSTEM_PROMPT("write", request.hostUsername, telegramEnabled);
  }

  return [
    ...existingMessages,
    {
      role: "user",
      content: `
Using the existing context, begin iterating through the following action items and execute them one by one.

${formatList(assessment.suggestedActions)}

Respond with a final response detailed JSON object describing the results of the actions, like this:
{
"finalResponse": "final response to the user",
"results": [
  {
    "action": "action_name",
    "result": "success" | "failure",
    "reason": "reason for the result",
  },
],
}
      `.trim(),
    },
  ];
}
