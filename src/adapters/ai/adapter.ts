import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { WorkerEnv, WorkflowEnv } from "../../types/env";
import { PluginSettings } from "../../types/plugin-input";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { executeGitHubTool, GITHUB_READ_ONLY_TOOLS, GITHUB_TOOLS, ToolName } from "./tools";
import { MENTION_CLASSIFICATION_SYSTEM_PROMPT } from "./prompts/mention-classification";
import { SUGGESTED_ACTIONS_SYSTEM_PROMPT } from "./prompts/suggested-action-execution";
import { formatList } from "./prompts/shared";
import { MentionAssessmentRequest, MentionAssessmentResponse, SuggestedActionsResponse, MentionPriority } from "./prompts/types";

type SymbioteEnv = WorkerEnv | WorkflowEnv;

export interface AiAdapter {
  classifyMention(request: MentionAssessmentRequest): Promise<{
    messages: ChatCompletionMessageParam[];
    assessment: MentionAssessmentResponse;
  }>;
  executeSuggestedActions({
    request,
    octokit,
    assessment,
    existingMessages,
  }: {
    request: MentionAssessmentRequest;
    octokit: InstanceType<typeof customOctokit>;
    assessment: MentionAssessmentResponse;
    existingMessages: ChatCompletionMessageParam[];
  }): Promise<{
    messages: ChatCompletionMessageParam[];
    response: SuggestedActionsResponse;
  }>;
}

const DEFAULT_ASSESSMENT: MentionAssessmentResponse = {
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

export async function createAiAdapter(env: SymbioteEnv, config: PluginSettings): Promise<AiAdapter | null> {
  const aiConfig = config.aiConfig;
  if (!aiConfig) {
    return null;
  }

  const client = new OpenAI({
    apiKey: env.AI_API_KEY,
    baseURL: aiConfig.baseUrl,
  });

  async function classifyMention(request: MentionAssessmentRequest): Promise<{
    messages: ChatCompletionMessageParam[];
    assessment: MentionAssessmentResponse;
  }> {
    const { octokit, ...rest } = request;
    const messages = buildMentionMessages(rest);
    const maxToolCalls = 5; // Limit tool usage to prevent infinite loops
    let toolCallCount = 0;

    let currentMessages: ChatCompletionMessageParam[] = [...messages];

    try {
      while (toolCallCount < maxToolCalls) {
        const completion = await client.chat.completions.create({
          model: aiConfig.model,
          temperature: 0.2,
          messages: currentMessages,
          tools: GITHUB_READ_ONLY_TOOLS,
          tool_choice: toolCallCount === 0 ? "auto" : "none", // Allow tools initially, then force final response
        });

        const choice = completion.choices[0];
        if (!choice) {
          break;
        }

        const message = choice.message;

        // Add the assistant's message to the conversation
        currentMessages.push(message);

        const {
          toolCallCount: nextToolCallCount,
          normalized,
          done,
        } = await handleAssistantMessage<MentionAssessmentResponse>({
          message,
          currentMessages,
          octokit,
          toolCallCount,
          defaultResponse: DEFAULT_ASSESSMENT,
          env,
        });

        toolCallCount = nextToolCallCount;

        if (done) {
          if (normalized) {
            return {
              messages: [...currentMessages, { role: "assistant", content: JSON.stringify(normalized) }],
              assessment: normalized
            };
          }
        }
      }
    } catch (error) {
      console.error(`[AI] Failed to classify mention`, { error });
      return {
        messages:[
        ...currentMessages,
        {
          role: "assistant",
          content: 
`An error occurred while parsing the response into a JSON object, a default will be provided as well as details about the error.

# DEFAULT RESPONSE

${JSON.stringify(DEFAULT_ASSESSMENT)}
        
# ERROR DETAILS

${error instanceof Error ? error.message : String(error)}\n\n\n`.trim(),
        },
      ],
      assessment: DEFAULT_ASSESSMENT,
    }
    }
    return {
      messages: [...currentMessages, { role: "assistant", content: JSON.stringify(DEFAULT_ASSESSMENT) }],
      assessment: DEFAULT_ASSESSMENT,
    };
  }

  async function executeSuggestedActions({
    request,
    octokit,
    assessment,
    existingMessages,
  }: {
    request: MentionAssessmentRequest;
    octokit: InstanceType<typeof customOctokit>;
    assessment: MentionAssessmentResponse;
    existingMessages: ChatCompletionMessageParam[];
  }): Promise<{
    messages: ChatCompletionMessageParam[];
    response: SuggestedActionsResponse;
  }> {
    const messages = buildSuggestedActionsMessages(request, assessment, existingMessages);
    let toolCallCount = 0;
    const maxToolCalls = 10; // Limit tool usage to prevent infinite loops
    let currentMessages = [...messages];

    try {
      while (toolCallCount < maxToolCalls) {
        const completion = await client.chat.completions.create({
          model: aiConfig.model,
          temperature: 0.2,
          messages: currentMessages,
          tools: GITHUB_TOOLS,
          tool_choice: toolCallCount === maxToolCalls ? "none" : "auto", // Allow tools initially, then force final response
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
          toolCallCount,
          defaultResponse: DEFAULT_SUGGESTED_ACTIONS_RESPONSE,
          env,
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

  function buildSuggestedActionsMessages(
    request: MentionAssessmentRequest,
    assessment: MentionAssessmentResponse,
    existingMessages: ChatCompletionMessageParam[]
  ): ChatCompletionMessageParam[] {
    // replace the first system message with the suggested actions system prompt
    existingMessages.find((message) => message.role === "system")!.content = SUGGESTED_ACTIONS_SYSTEM_PROMPT("write", request.hostUsername);

    // the most recent message was the assessment response
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

  return {
    classifyMention,
    executeSuggestedActions,
  };
}

function buildMentionMessages(request: Omit<MentionAssessmentRequest, "octokit">): ChatCompletionMessageParam[] {
  const { hostUsername, ...rest } = request;
  const payload = {
    hostUsername,
    notification: rest,
  };

  const systemPrompt = MENTION_CLASSIFICATION_SYSTEM_PROMPT(hostUsername);

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

function safeParse<T extends MentionAssessmentResponse | SuggestedActionsResponse>(content: string): T | string {
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`[AI] Unable to parse assessment JSON`, { error, content });
    return content;
  }
}

function normalizeAssessment(candidate: Partial<MentionAssessmentResponse>): MentionAssessmentResponse {
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

function isPriority(value: unknown): value is MentionPriority {
  return value === "low" || value === "medium" || value === "high";
}

function isClassification(value: unknown): value is MentionAssessmentResponse["classification"] {
  return value === "respond" || value === "investigate" || value === "ignore";
}

async function handleAssistantMessage<T extends MentionAssessmentResponse | SuggestedActionsResponse>({
  message,
  currentMessages,
  octokit,
  toolCallCount,
  defaultResponse,
  env,
}: {
  message: OpenAI.Chat.Completions.ChatCompletionMessage;
  currentMessages: ChatCompletionMessageParam[];
  octokit: InstanceType<typeof customOctokit>;
  toolCallCount: number;
  defaultResponse: T;
  env: SymbioteEnv;
}): Promise<{ toolCallCount: number; normalized?: T; done: boolean }> {
  let updatedCount = toolCallCount;

  if (message.tool_calls && message.tool_calls.length > 0) {
    for (const toolCall of message.tool_calls) {
      updatedCount += 1;

      try {
        if (updatedCount > 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        const toolResult = await executeGitHubTool(octokit, toolCall, env);
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

