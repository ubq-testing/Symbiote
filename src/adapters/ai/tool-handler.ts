import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type OpenAI from "openai";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { AssessmentResponse, SuggestedActionsResponse } from "./prompts/types";
import { executeGitHubTool, executeWorkspaceTool, isWorkspaceTool } from "./tools";
import { executeTelegramTool, isTelegramTool } from "./telegram-tools";
import { TelegramAdapter } from "../telegram/adapter";
import { KvAdapter } from "../kv";
import { SymbioteEnv, HandleAssistantMessageResult } from "./types";
import { safeParse } from "./utils";
import { TOOL_CALL_DELAY_MS } from "./constants";

/**
 * Parameters for handling assistant messages during AI conversation
 */
export interface HandleAssistantMessageParams<T extends AssessmentResponse | SuggestedActionsResponse> {
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
}

/**
 * Handles an assistant message during AI conversation, processing tool calls and responses
 * 
 * @param params - The parameters for handling the message
 * @returns Result containing updated tool call count, normalized response, and completion status
 */
export async function handleAssistantMessage<T extends AssessmentResponse | SuggestedActionsResponse>({
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
}: HandleAssistantMessageParams<T>): Promise<HandleAssistantMessageResult<T>> {
  let updatedCount = toolCallCount;

  // Process tool calls if present
  if (message.tool_calls && message.tool_calls.length > 0) {
    for (const toolCall of message.tool_calls) {
      updatedCount += 1;

      try {
        // Add delay between consecutive tool calls
        if (updatedCount > 1) {
          await new Promise((resolve) => setTimeout(resolve, TOOL_CALL_DELAY_MS));
        }

        const toolResult = await executeToolCall(
          toolCall,
          octokit,
          telegram,
          env,
          kv,
          hostUsername,
          orgsToWorkIn
        );

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

  // Process final response
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

/**
 * Routes and executes a tool call to the appropriate handler
 */
async function executeToolCall(
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
  octokit: InstanceType<typeof customOctokit>,
  telegram: TelegramAdapter | null | undefined,
  env: SymbioteEnv,
  kv: KvAdapter,
  hostUsername: string,
  orgsToWorkIn: string[]
): Promise<unknown> {
  const toolName = toolCall.function.name;

  // Route to appropriate tool executor
  if (isTelegramTool(toolName) && telegram) {
    return executeTelegramTool(telegram, toolCall);
  } else if (isWorkspaceTool(toolName)) {
    return executeWorkspaceTool(toolCall, kv, octokit, hostUsername, orgsToWorkIn);
  } else {
    return executeGitHubTool(octokit, toolCall, env);
  }
}
