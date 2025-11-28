import type { ChatCompletionTool } from "openai/resources/chat/completions";
import OpenAI from "openai";
import { TelegramAdapter, TelegramMessage } from "../telegram/adapter";

// Configuration for response waiting
const DEFAULT_POLL_INTERVAL_MS = 3000; // Check every 3 seconds
const DEFAULT_TIMEOUT_MS = 1000 * 60 * 30; // 30 minute timeout

export const TELEGRAM_TOOLS: ChatCompletionTool[] = [
  {
    type: "function" as const,
    function: {
      name: "send_telegram_message" as const,
      description: `Send a message to your host via Telegram and optionally wait for their response. Use this when you need to:
- Ask for clarification or guidance on a task
- Request approval before taking an action
- Share important updates or findings
- Get human input when you're uncertain

IMPORTANT: Set await_response to true when you need the host's input to continue. The tool will block until the host responds (up to 30 minutes).`,
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The message to send to the host. Be concise but clear. Can use basic HTML formatting (<b>, <i>, <code>, <pre>).",
          },
          await_response: {
            type: "boolean",
            description: "If true, wait for the host to respond before returning. Use this when you need their input to continue. Default is false (fire-and-forget notification).",
            default: false,
          },
          timeout_minutes: {
            type: "number",
            description: "Maximum minutes to wait for a response (only applies when await_response is true). Default is 30 minutes.",
            default: 30,
          },
        },
        required: ["message"],
      },
    },
  },
];

export type TelegramToolName = "send_telegram_message";

export interface TelegramToolResult {
  success: boolean;
  result?: {
    messageId?: number;
    awaitedResponse: boolean;
    hostResponse?: {
      text: string;
      receivedAt: string;
    };
    timedOut?: boolean;
  };
  error?: string;
}

export async function executeTelegramTool(
  telegram: TelegramAdapter,
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
): Promise<TelegramToolResult> {
  const { name, arguments: args } = toolCall.function as { name: TelegramToolName; arguments: string };

  try {
    const params = JSON.parse(args);

    switch (name) {
      case "send_telegram_message": {
        const { message, await_response = false, timeout_minutes = 30 } = params;
        
        // Send the message
        const sendResult = await telegram.sendMessage(message);

        if (!sendResult.ok) {
          return { success: false, error: sendResult.error };
        }

        // If not awaiting response, return immediately
        if (!await_response) {
          return {
            success: true,
            result: {
              messageId: sendResult.messageId,
              awaitedResponse: false,
            },
          };
        }

        // Store that we're awaiting a response
        await telegram.storePendingPrompt(message);

        // Wait for the host's response
        const timeoutMs = Math.min(timeout_minutes * 60 * 1000, DEFAULT_TIMEOUT_MS);
        const startTime = Date.now();
        
        console.log(`[TELEGRAM] Waiting for host response (timeout: ${timeout_minutes}min)...`);

        while (Date.now() - startTime < timeoutMs) {
          // Check for responses
          const responses = await telegram.getPendingResponses();

          if (responses.length > 0) {
            // Get the first (oldest) response
            const response = responses[0];
            
            // Clear the response from the queue
            await telegram.clearPendingResponse(response.id);

            console.log(`[TELEGRAM] Host responded: "${response.text.slice(0, 100)}..."`);

            return {
              success: true,
              result: {
                messageId: sendResult.messageId,
                awaitedResponse: true,
                hostResponse: {
                  text: response.text,
                  receivedAt: response.timestamp,
                },
              },
            };
          }

          // Wait before polling again
          await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_INTERVAL_MS));
        }

        // Timeout reached
        console.log(`[TELEGRAM] Timeout waiting for host response after ${timeout_minutes} minutes`);

        return {
          success: true,
          result: {
            messageId: sendResult.messageId,
            awaitedResponse: true,
            timedOut: true,
          },
        };
      }

      default:
        return { success: false, error: `Unknown Telegram tool: ${name}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function isTelegramTool(toolName: string): toolName is TelegramToolName {
  return toolName === "send_telegram_message";
}

