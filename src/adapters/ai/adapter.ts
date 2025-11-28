import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { WorkerEnv, WorkflowEnv } from "../../types/env";
import { PluginSettings } from "../../types/plugin-input";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { 
  executeGitHubTool, 
  executeWorkspaceTool,
  isWorkspaceTool,
  ALL_READ_ONLY_TOOLS, 
  GITHUB_TOOLS,
  WORKSPACE_LOOKUP_TOOLS,
  ALL_TOOLS,
} from "./tools";
import { TELEGRAM_TOOLS, executeTelegramTool, isTelegramTool } from "./telegram-tools";
import { NOTIFICATION_CLASSIFICATION_SYSTEM_PROMPT, EVENT_CLASSIFICATION_SYSTEM_PROMPT } from "./prompts/notification-classification";
import { SUGGESTED_ACTIONS_SYSTEM_PROMPT } from "./prompts/suggested-action-execution";
import { formatList } from "./prompts/shared";
import {
  NotificationAssessmentRequest,
  EventAssessmentRequest,
  AssessmentRequest,
  AssessmentResponse,
  SuggestedActionsResponse,
  AssessmentPriority,
  isNotificationRequest,
  isEventRequest,
} from "./prompts/types";
import { TelegramAdapter } from "../telegram/adapter";
import { KvAdapter } from "../kv";

type SymbioteEnv = WorkerEnv | WorkflowEnv;

export interface AiAdapter {
  /**
   * Unified classification method - handles both notifications and events
   */
  classify(request: AssessmentRequest): Promise<{
    messages: ChatCompletionMessageParam[];
    assessment: AssessmentResponse;
  }>;

  /**
   * @deprecated Use classify() instead
   */
  classifyNotification(request: NotificationAssessmentRequest): Promise<{
    messages: ChatCompletionMessageParam[];
    assessment: AssessmentResponse;
  }>;

  /**
   * Execute suggested actions from an assessment
   */
  executeSuggestedActions({
    request,
    octokit,
    assessment,
    existingMessages,
  }: {
    request: AssessmentRequest;
    octokit: InstanceType<typeof customOctokit>;
    assessment: AssessmentResponse;
    existingMessages: ChatCompletionMessageParam[];
  }): Promise<{
    messages: ChatCompletionMessageParam[];
    response: SuggestedActionsResponse;
  }>;
}

const DEFAULT_ASSESSMENT: AssessmentResponse = {
  shouldAct: false,
  priority: "low",
  confidence: 0.1,
  reason: "No automated assessment available.",
  suggestedActions: [],
  classification: "ignore",
};

const DEFAULT_SUGGESTED_ACTIONS_RESPONSE: SuggestedActionsResponse = {
  finalResponse: "No automated response available.",
  results: [],
};

export async function createAiAdapter(
  env: SymbioteEnv,
  config: PluginSettings,
  kv: KvAdapter,
  telegram?: TelegramAdapter | null
): Promise<AiAdapter | null> {
  const aiConfig = config.aiConfig;
  if (!aiConfig) {
    return null;
  }

  const client = new OpenAI({
    apiKey: env.AI_API_KEY,
    baseURL: aiConfig.baseUrl,
  });

  const hostUsername = env.SYMBIOTE_HOST.USERNAME;
  const orgsToWorkIn = config.orgsToWorkIn ?? [];

  // Build available tools based on what adapters are available
  const allWriteTools: ChatCompletionTool[] = [
    ...GITHUB_TOOLS,
    ...WORKSPACE_LOOKUP_TOOLS,
    ...(telegram ? TELEGRAM_TOOLS : []),
  ];

  /**
   * Unified classification method - handles both notifications and events
   */
  async function classify(request: AssessmentRequest): Promise<{
    messages: ChatCompletionMessageParam[];
    assessment: AssessmentResponse;
  }> {
    const { octokit, ...rest } = request;
    const messages = buildClassificationMessages(rest);
    const maxToolCalls = 5;
    let toolCallCount = 0;

    let currentMessages: ChatCompletionMessageParam[] = [...messages];
    const inputKind = request.kind;

    try {
      while (toolCallCount < maxToolCalls) {
        const completion = await client.chat.completions.create({
          model: aiConfig.model,
          temperature: 0.2,
          messages: currentMessages,
          tools: ALL_READ_ONLY_TOOLS,
          tool_choice: toolCallCount === 0 ? "auto" : "none",
        });

        const choice = completion.choices[0];
        if (!choice) {
          break;
        }

        const message = choice.message;
        currentMessages.push(message);

        const {
          toolCallCount: nextToolCallCount,
          normalized,
          done,
        } = await handleAssistantMessage<AssessmentResponse>({
          message,
          currentMessages,
          octokit,
          toolCallCount,
          defaultResponse: DEFAULT_ASSESSMENT,
          env,
          kv,
          hostUsername,
          orgsToWorkIn,
        });

        toolCallCount = nextToolCallCount;

        if (done) {
          if (normalized) {
            return {
              messages: [...currentMessages, { role: "assistant", content: JSON.stringify(normalized) }],
              assessment: normalized,
            };
          }
        }
      }
    } catch (error) {
      console.error(`[AI] Failed to classify ${inputKind}`, { error });
      return {
        messages: [
          ...currentMessages,
          {
            role: "assistant",
            content: `An error occurred while parsing the response into a JSON object, a default will be provided as well as details about the error.

# DEFAULT RESPONSE

${JSON.stringify(DEFAULT_ASSESSMENT)}
        
# ERROR DETAILS

${error instanceof Error ? error.message : String(error)}`.trim(),
          },
        ],
        assessment: DEFAULT_ASSESSMENT,
      };
    }
    return {
      messages: [...currentMessages, { role: "assistant", content: JSON.stringify(DEFAULT_ASSESSMENT) }],
      assessment: DEFAULT_ASSESSMENT,
    };
  }

  /**
   * @deprecated Use classify() instead - kept for backward compatibility
   */
  async function classifyNotification(request: NotificationAssessmentRequest): Promise<{
    messages: ChatCompletionMessageParam[];
    assessment: AssessmentResponse;
  }> {
    return classify(request);
  }

  async function executeSuggestedActions({
    request,
    octokit,
    assessment,
    existingMessages,
  }: {
    request: AssessmentRequest;
    octokit: InstanceType<typeof customOctokit>;
    assessment: AssessmentResponse;
    existingMessages: ChatCompletionMessageParam[];
  }): Promise<{
    messages: ChatCompletionMessageParam[];
    response: SuggestedActionsResponse;
  }> {
    const messages = buildSuggestedActionsMessages(request, assessment, existingMessages, !!telegram);
    let toolCallCount = 0;
    const maxToolCalls = 10;
    let currentMessages = [...messages];

    try {
      while (toolCallCount < maxToolCalls) {
        const completion = await client.chat.completions.create({
          model: aiConfig.model,
          temperature: 0.2,
          messages: currentMessages,
          tools: ALL_TOOLS,
          tool_choice: toolCallCount === maxToolCalls ? "none" : "auto",
        });

        const choice = completion.choices[0];
        if (!choice) {
          break;
        }

        const message = choice.message;
        currentMessages.push(message);

        const {
          toolCallCount: nextToolCallCount,
          normalized,
          done,
        } = await handleAssistantMessage<SuggestedActionsResponse>({
          message,
          currentMessages,
          octokit,
          telegram,
          toolCallCount,
          defaultResponse: DEFAULT_SUGGESTED_ACTIONS_RESPONSE,
          env,
          kv,
          hostUsername,
          orgsToWorkIn,
        });

        toolCallCount = nextToolCallCount;
        if (done) {
          if (!normalized) {
            return {
              messages: currentMessages,
              response: DEFAULT_SUGGESTED_ACTIONS_RESPONSE,
            };
          }

          return {
            messages: currentMessages,
            response: normalized,
          };
        }
      }
    } catch (error) {
      console.error(`[AI] Failed to execute suggested actions`, { error });
    }

    return {
      messages: currentMessages,
      response: DEFAULT_SUGGESTED_ACTIONS_RESPONSE,
    };
  }

  return {
    classify,
    classifyNotification,
    executeSuggestedActions,
  };
}

function buildSuggestedActionsMessages(
  request: AssessmentRequest,
  assessment: AssessmentResponse,
  existingMessages: ChatCompletionMessageParam[],
  telegramEnabled: boolean
): ChatCompletionMessageParam[] {
  existingMessages.find((message) => message.role === "system")!.content = SUGGESTED_ACTIONS_SYSTEM_PROMPT("write", request.hostUsername, telegramEnabled);

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

/**
 * Builds classification messages for either notification or event input
 */
function buildClassificationMessages(request: Omit<AssessmentRequest, "octokit">): ChatCompletionMessageParam[] {
  if (isNotificationRequest(request as AssessmentRequest)) {
    return buildNotificationMessages(request as Omit<NotificationAssessmentRequest, "octokit">);
  } else {
    return buildEventMessages(request as Omit<EventAssessmentRequest, "octokit">);
  }
}

function buildNotificationMessages(request: Omit<NotificationAssessmentRequest, "octokit">): ChatCompletionMessageParam[] {
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

function buildEventMessages(request: Omit<EventAssessmentRequest, "octokit">): ChatCompletionMessageParam[] {
  const { hostUsername, event, resolvedSubject } = request;

  const stripUrlsFromObject = (obj: any) => {
    if (typeof obj === "object" && obj !== null) {
      for (const key in obj) {
        if (key.endsWith("_url") && !key.toLowerCase().includes("html_url")) {
          delete obj[key];
        }
      }
    }
  };

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
      payload: stripUrlsFromObject(event.payload),
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

function safeParse<T extends AssessmentResponse | SuggestedActionsResponse>(content: string): T | string {
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`[AI] Unable to parse assessment JSON`, { error, content });
    return content;
  }
}

function normalizeAssessment(candidate: Partial<AssessmentResponse>): AssessmentResponse {
  return {
    shouldAct: typeof candidate.shouldAct === "boolean" ? candidate.shouldAct : DEFAULT_ASSESSMENT.shouldAct,
    priority: isPriority(candidate.priority) ? candidate.priority : DEFAULT_ASSESSMENT.priority,
    confidence: typeof candidate.confidence === "number" ? candidate.confidence : DEFAULT_ASSESSMENT.confidence,
    reason: typeof candidate.reason === "string" && candidate.reason.length > 0 ? candidate.reason : DEFAULT_ASSESSMENT.reason,
    suggestedActions: Array.isArray(candidate.suggestedActions)
      ? candidate.suggestedActions.filter((item): item is string => typeof item === "string")
      : DEFAULT_ASSESSMENT.suggestedActions,
    classification: isClassification(candidate.classification) ? candidate.classification : DEFAULT_ASSESSMENT.classification,
  };
}

function isPriority(value: unknown): value is AssessmentPriority {
  return value === "low" || value === "medium" || value === "high";
}

function isClassification(value: unknown): value is AssessmentResponse["classification"] {
  return value === "respond" || value === "investigate" || value === "ignore";
}

async function handleAssistantMessage<T extends AssessmentResponse | SuggestedActionsResponse>({
  message,
  currentMessages,
  octokit,
  telegram,
  toolCallCount,
  defaultResponse,
  env,
  kv,
  hostUsername,
  orgsToWorkIn,
}: {
  message: OpenAI.Chat.Completions.ChatCompletionMessage;
  currentMessages: ChatCompletionMessageParam[];
  octokit: InstanceType<typeof customOctokit>;
  telegram?: TelegramAdapter | null;
  toolCallCount: number;
  defaultResponse: T;
  env: SymbioteEnv;
  kv: KvAdapter;
  hostUsername: string;
  orgsToWorkIn: string[];
}): Promise<{ toolCallCount: number; normalized?: T; done: boolean }> {
  let updatedCount = toolCallCount;

  if (message.tool_calls && message.tool_calls.length > 0) {
    for (const toolCall of message.tool_calls) {
      updatedCount += 1;

      try {
        if (updatedCount > 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        let toolResult: unknown;

        // Route to appropriate tool executor
        if (isTelegramTool(toolCall.function.name) && telegram) {
          toolResult = await executeTelegramTool(telegram, toolCall);
        } else if (isWorkspaceTool(toolCall.function.name)) {
          toolResult = await executeWorkspaceTool(toolCall, kv, octokit, hostUsername, orgsToWorkIn);
        } else {
          toolResult = await executeGitHubTool(octokit, toolCall, env);
        }

        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      } catch (error) {
        console.warn(`[AI] Tool call failed: ${toolCall.function.name}`, {
          error: error instanceof Error ? error.message : String(error),
          toolCallId: toolCall.id,
        });

        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            tool: toolCall.function.name,
          }),
        });
      }
    }

    return { toolCallCount: updatedCount, done: false };
  }

  const answer = message.content;
  if (!answer) {
    return { toolCallCount: updatedCount, normalized: defaultResponse, done: true };
  }

  const parsed = safeParse<T>(answer);
  if (typeof parsed === "string") {
    console.error(`[AI] Unable to parse response into a JSON object`, { answer });
    return { toolCallCount: updatedCount, normalized: defaultResponse, done: true };
  }

  return { toolCallCount: updatedCount, normalized: parsed, done: true };
}
