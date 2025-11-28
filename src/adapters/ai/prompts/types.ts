import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import type { Notification, UserEvent } from "../../../types/github";

// ─────────────────────────────────────────────────────────────────────────────
// Input Types - What we receive from GitHub
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationAssessmentRequest {
  kind: "notification";
  hostUsername: string;
  notification: Notification;
  latestCommentBody?: string | null;
  latestCommentAuthor?: string | null;
  octokit: InstanceType<typeof customOctokit>;
}

export interface EventAssessmentRequest {
  kind: "event";
  hostUsername: string;
  event: UserEvent;
  octokit: InstanceType<typeof customOctokit>;
}

/**
 * Unified input type for assessment - the AI adapter can process either
 */
export type AssessmentRequest = NotificationAssessmentRequest | EventAssessmentRequest;

// ─────────────────────────────────────────────────────────────────────────────
// Output Types - What the AI produces
// ─────────────────────────────────────────────────────────────────────────────

export type AssessmentPriority = "low" | "medium" | "high";

/**
 * Classification produced by the AI for any input type
 */
export interface AssessmentResponse {
  shouldAct: boolean;
  priority: AssessmentPriority;
  confidence: number;
  reason: string;
  suggestedActions: string[];
  classification: "respond" | "investigate" | "ignore";
}

/** @deprecated Use AssessmentResponse instead */
export type NotificationAssessmentResponse = AssessmentResponse;

export interface SuggestedActionsResponse {
  finalResponse: string;
  results: {
    action: string;
    result: "success" | "failure";
    reason: string;
  }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────────────────────────────────────

export function isNotificationRequest(req: AssessmentRequest): req is NotificationAssessmentRequest {
  return req.kind === "notification";
}

export function isEventRequest(req: AssessmentRequest): req is EventAssessmentRequest {
  return req.kind === "event";
}
