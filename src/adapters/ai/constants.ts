import { AssessmentResponse, SuggestedActionsResponse } from "./prompts/types";

/**
 * Default assessment response when AI classification fails or returns invalid data
 */
export const DEFAULT_ASSESSMENT: AssessmentResponse = {
  shouldAct: false,
  priority: "low",
  confidence: 0.1,
  reason: "No automated assessment available.",
  suggestedActions: [],
  classification: "ignore",
};

/**
 * Default suggested actions response when AI execution fails
 */
export const DEFAULT_SUGGESTED_ACTIONS_RESPONSE: SuggestedActionsResponse = {
  finalResponse: "No automated response available.",
  results: [],
};

/**
 * Maximum number of tool calls allowed during classification
 */
export const MAX_CLASSIFICATION_TOOL_CALLS = 5;

/**
 * Maximum number of tool calls allowed during action execution
 */
export const MAX_ACTION_TOOL_CALLS = 10;

/**
 * Default temperature for AI model calls
 */
export const DEFAULT_AI_TEMPERATURE = 0.2;

/**
 * Delay between consecutive tool calls (in milliseconds)
 */
export const TOOL_CALL_DELAY_MS = 500;

// ─────────────────────────────────────────────────────────────────────────────
// Model Registry Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * OpenRouter API base URL
 */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * KV key for storing the free models cache
 */
export const MODEL_REGISTRY_KV_KEY = ["ai", "model-registry"];

/**
 * Cache TTL in hours for the model registry
 */
export const MODEL_REGISTRY_TTL_HOURS = 24;

/**
 * Fallback model if no free models are available
 */
export const FALLBACK_MODEL = "anthropic/claude-sonnet-4";

/**
 * Scoring weights for model ranking
 * Higher scores = better ranking
 */
export const MODEL_SCORING = {
  /** Bonus for models with "coder" in the name */
  CODER_BONUS: 100,
  /** Bonus for models that support tool/function calling */
  TOOLS_BONUS: 50,
  /** Points per 100k context length */
  CONTEXT_POINTS_PER_100K: 10,
  /** Minimum context length required (128k) */
  MIN_CONTEXT_LENGTH: 128000,
} as const;
