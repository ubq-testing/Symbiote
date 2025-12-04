import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { PluginSettings } from "../../types/plugin-input";
import { TelegramAdapter } from "../telegram/adapter";
import { KvAdapter } from "../kv";

// Local imports
import type { SymbioteEnv, Ai } from "./types";
import { ModelRegistry, createModelRegistry } from "./model-registry";
import { OPENROUTER_BASE_URL } from "./constants";
import {
  DEFAULT_ASSESSMENT,
  DEFAULT_SUGGESTED_ACTIONS_RESPONSE,
  MAX_CLASSIFICATION_TOOL_CALLS,
  MAX_ACTION_TOOL_CALLS,
  DEFAULT_AI_TEMPERATURE,
} from "./constants";
import { createErrorMessage } from "./utils";
import { buildClassificationMessages, buildSuggestedActionsMessages } from "./message-builders";
import { handleAssistantMessage } from "./tool-handler";
import {
  NotificationAssessmentRequest,
  AssessmentRequest,
  AssessmentResponse,
  SuggestedActionsResponse,
} from "./prompts/types";
import {
  ALL_READ_ONLY_TOOLS,
  GITHUB_TOOLS,
  WORKSPACE_LOOKUP_TOOLS,
  ALL_TOOLS,
} from "./tools";
import { TELEGRAM_TOOLS } from "./telegram-tools";

/**
 * Concrete implementation of the AI Adapter
 * Handles classification of notifications/events and execution of suggested actions
 */
export class AiAdapter implements Ai {
  private readonly client: OpenAI;
  private readonly configuredModel: string | null;
  private readonly hostUsername: string;
  private readonly orgsToWorkIn: string[];
  private readonly env: SymbioteEnv;
  private readonly kv: KvAdapter;
  private readonly telegram: TelegramAdapter | null;
  private readonly allWriteTools: ChatCompletionTool[];
  private readonly modelRegistry: ModelRegistry;
  private readonly useFreeModels: boolean;
  private readonly excludedModels: string[];

  constructor(
    env: SymbioteEnv,
    config: PluginSettings,
    kv: KvAdapter,
    telegram: TelegramAdapter | null
  ) {
    const aiConfig = config.aiConfig!;
    
    // Determine if we should use free models (when baseUrl is OpenRouter and no specific model configured)
    this.useFreeModels = aiConfig.baseUrl.includes("openrouter") && !aiConfig.model;
    this.excludedModels = aiConfig.excludedModels ?? [];
    
    this.client = new OpenAI({
      apiKey: env.AI_API_KEY,
      baseURL: aiConfig.baseUrl,
    });
    
    this.configuredModel = aiConfig.model || null;
    this.hostUsername = env.SYMBIOTE_HOST.USERNAME;
    this.orgsToWorkIn = config.orgsToWorkIn ?? [];
    this.env = env;
    this.kv = kv;
    this.telegram = telegram;
    this.modelRegistry = createModelRegistry(kv, this.excludedModels);

    // Build available tools based on what adapters are available
    this.allWriteTools = [
      ...GITHUB_TOOLS,
      ...WORKSPACE_LOOKUP_TOOLS,
      ...(telegram ? TELEGRAM_TOOLS : []),
    ];
  }

  /**
   * Gets the model to use for this request
   * If useFreeModels is enabled, dynamically selects the best free model
   */
  private async getModel(): Promise<string> {
    if (this.configuredModel) {
      return this.configuredModel;
    }
    
    if (this.useFreeModels) {
      return this.modelRegistry.getModelByCapability({
        requireTools: true,
        preferCoder: true,
        minContextLength: 128000,
      });
    }
    
    // Fallback to best available free model
    return this.modelRegistry.getBestModel();
  }

  /**
   * Unified classification method - handles both notifications and events
   */
  async classify(request: AssessmentRequest): Promise<{
    messages: ChatCompletionMessageParam[];
    assessment: AssessmentResponse;
  }> {
    const { octokit, ...rest } = request;
    const messages = buildClassificationMessages(rest);
    let toolCallCount = 0;
    let currentMessages: ChatCompletionMessageParam[] = [...messages];
    const inputKind = request.kind;

    try {
      const model = await this.getModel();
      console.log(`[AI] Using model: ${model} for classification`);
      
      while (toolCallCount < MAX_CLASSIFICATION_TOOL_CALLS) {
        const completion = await this.client.chat.completions.create({
          model,
          temperature: DEFAULT_AI_TEMPERATURE,
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

        const result = await handleAssistantMessage<AssessmentResponse>({
          message,
          currentMessages,
          octokit,
          toolCallCount,
          defaultResponse: DEFAULT_ASSESSMENT,
          env: this.env,
          kv: this.kv,
          hostUsername: this.hostUsername,
          orgsToWorkIn: this.orgsToWorkIn,
        });

        toolCallCount = result.toolCallCount;

        if (result.done && result.normalized) {
          return {
            messages: [...currentMessages, { role: "assistant", content: JSON.stringify(result.normalized) }],
            assessment: result.normalized,
          };
        }

        if (result.done) {
          break;
        }
      }
    } catch (error) {
      console.error(`[AI] Failed to classify ${inputKind}`, { error });
      return {
        messages: [
          ...currentMessages,
          {
            role: "assistant",
            content: createErrorMessage(error, DEFAULT_ASSESSMENT),
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
   * Execute suggested actions from an assessment
   */
  async executeSuggestedActions({
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
    const messages = buildSuggestedActionsMessages(
      request,
      assessment,
      existingMessages,
      !!this.telegram
    );
    let toolCallCount = 0;
    let currentMessages = [...messages];

    try {
      const model = await this.getModel();
      console.log(`[AI] Using model: ${model} for action execution`);
      
      while (toolCallCount < MAX_ACTION_TOOL_CALLS) {
        const completion = await this.client.chat.completions.create({
          model,
          temperature: DEFAULT_AI_TEMPERATURE,
          messages: currentMessages,
          tools: ALL_TOOLS,
          tool_choice: toolCallCount === MAX_ACTION_TOOL_CALLS ? "none" : "auto",
        });

        const choice = completion.choices[0];
        if (!choice) {
          break;
        }

        const message = choice.message;
        currentMessages.push(message);

        const result = await handleAssistantMessage<SuggestedActionsResponse>({
          message,
          currentMessages,
          octokit,
          telegram: this.telegram,
          toolCallCount,
          defaultResponse: DEFAULT_SUGGESTED_ACTIONS_RESPONSE,
          env: this.env,
          kv: this.kv,
          hostUsername: this.hostUsername,
          orgsToWorkIn: this.orgsToWorkIn,
        });

        toolCallCount = result.toolCallCount;

        if (result.done) {
          return {
            messages: currentMessages,
            response: result.normalized ?? DEFAULT_SUGGESTED_ACTIONS_RESPONSE,
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
}

/**
 * Factory function to create an AI adapter instance
 * Returns null if AI is not configured
 */
export async function createAiAdapter(
  env: SymbioteEnv,
  config: PluginSettings,
  kv: KvAdapter,
  telegram?: TelegramAdapter | null
): Promise<AiAdapter | null> {
  return new AiAdapter(env, config, kv, telegram ?? null);
}