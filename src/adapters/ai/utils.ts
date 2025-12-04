import { AssessmentResponse, AssessmentPriority, SuggestedActionsResponse } from "./prompts/types";
import { DEFAULT_ASSESSMENT } from "./constants";

/**
 * Safely parses a JSON string into an assessment or suggested actions response
 * Returns the original string if parsing fails
 */
export function safeParse<T extends AssessmentResponse | SuggestedActionsResponse>(content: string): T | string {
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`[AI] Unable to parse assessment JSON`, { error, content });
    return content;
  }
}

/**
 * Type guard for AssessmentPriority values
 */
export function isPriority(value: unknown): value is AssessmentPriority {
  return value === "low" || value === "medium" || value === "high";
}

/**
 * Type guard for classification values
 */
export function isClassification(value: unknown): value is AssessmentResponse["classification"] {
  return value === "respond" || value === "investigate" || value === "ignore";
}

/**
 * Normalizes a partial assessment response into a complete one with default values
 */
export function normalizeAssessment(candidate: Partial<AssessmentResponse>): AssessmentResponse {
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

/**
 * Strips API URLs from an object (keeps html_url)
 * Used to reduce payload size for event messages
 */
export function stripUrlsFromObject<T extends Record<string, unknown>>(obj: T): T {
  if (typeof obj === "object" && obj !== null) {
    for (const key in obj) {
      if (key.endsWith("_url") && !key.toLowerCase().includes("html_url")) {
        delete obj[key];
      }
    }
  }
  return obj;
}

/**
 * Creates a formatted error message for AI classification failures
 */
export function createErrorMessage(error: unknown, defaultAssessment: AssessmentResponse): string {
  return `An error occurred while parsing the response into a JSON object, a default will be provided as well as details about the error.

# DEFAULT RESPONSE

${JSON.stringify(defaultAssessment)}
        
# ERROR DETAILS

${error instanceof Error ? error.message : String(error)}`.trim();
}
