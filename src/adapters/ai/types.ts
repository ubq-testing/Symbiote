import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { WorkerEnv, WorkflowEnv } from "../../types/env";
import {
  AssessmentRequest,
  AssessmentResponse,
  SuggestedActionsResponse,
} from "./prompts/types";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";

/**
 * Union type representing the supported Symbiote environments
 */
export type SymbioteEnv = WorkerEnv | WorkflowEnv;

// ─────────────────────────────────────────────────────────────────────────────
// OpenRouter Model Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * OpenRouter model pricing structure
 */
export interface OpenRouterPricing {
  prompt: string;
  completion: string;
  request: string;
  image: string;
  web_search?: string;
  internal_reasoning?: string;
}

/**
 * OpenRouter model architecture details
 */
export interface OpenRouterArchitecture {
  modality: string;
  input_modalities: string[];
  output_modalities: string[];
  tokenizer: string;
  instruct_type: string | null;
}

/**
 * OpenRouter top provider details
 */
export interface OpenRouterTopProvider {
  context_length: number;
  max_completion_tokens: number;
  is_moderated: boolean;
}

/**
 * Full OpenRouter model response structure
 */
export interface OpenRouterModel {
  id: string;
  canonical_slug: string;
  hugging_face_id: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: OpenRouterArchitecture;
  pricing: OpenRouterPricing;
  top_provider: OpenRouterTopProvider;
  per_request_limits: unknown | null;
  supported_parameters: string[];
  default_parameters: Record<string, unknown>;
}

/**
 * OpenRouter API response for /models endpoint
 */
export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

/**
 * Cached free model entry with ranking metadata
 */
export interface CachedFreeModel {
  id: string;
  name: string;
  context_length: number;
  max_completion_tokens: number;
  supports_tools: boolean;
  is_coder: boolean;
  score: number;
}

/**
 * Cached model registry stored in KV
 */
export interface ModelRegistryCache {
  models: CachedFreeModel[];
  last_synced: string;
  ttl_hours: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Adapter Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AI Adapter interface for classifying notifications/events and executing suggested actions
 */
export interface Ai {
  /**
   * handles both notifications and events
   */
  classify(request: AssessmentRequest): Promise<{
    messages: ChatCompletionMessageParam[];
    assessment: AssessmentResponse;
  }>;

  /**
   * Execute suggested actions from an assessment
   */
  executeSuggestedActions(params: {
    request: AssessmentRequest;
    octokit: InstanceType<typeof customOctokit>;
    assessment: AssessmentResponse;
    existingMessages: ChatCompletionMessageParam[];
  }): Promise<{
    messages: ChatCompletionMessageParam[];
    response: SuggestedActionsResponse;
  }>;
}

/**
 * Result from handling an assistant message during AI conversation
 */
export interface HandleAssistantMessageResult<T> {
  toolCallCount: number;
  normalized?: T;
  done: boolean;
}

/**
 * Parameters for handling assistant messages
 */
export interface HandleAssistantMessageParams<T> {
  message: import("openai").default.Chat.Completions.ChatCompletionMessage;
  currentMessages: ChatCompletionMessageParam[];
  octokit: InstanceType<typeof customOctokit>;
  telegram?: import("../telegram/adapter").TelegramAdapter | null;
  toolCallCount: number;
  defaultResponse: T;
  env: SymbioteEnv;
  kv: import("../kv").KvAdapter;
  hostUsername: string;
  orgsToWorkIn: string[];
}
