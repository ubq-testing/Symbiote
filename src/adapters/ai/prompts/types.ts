import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import type { Notification } from "../../../handlers/action/server/event-poller";

export interface NotificationAssessmentRequest {
  hostUsername: string;
  notification: Notification;
  latestCommentBody?: string | null;
  latestCommentAuthor?: string | null;
  octokit: InstanceType<typeof customOctokit>;
}

export type AssessmentPriority = "low" | "medium" | "high";

export interface NotificationAssessmentResponse {
  shouldAct: boolean;
  priority: AssessmentPriority;
  confidence: number;
  reason: string;
  suggestedActions: string[];
  classification: "respond" | "investigate" | "ignore";
}

export interface SuggestedActionsResponse {
  finalResponse: string;
  results: {
    action: string;
    result: "success" | "failure";
    reason: string;
  }[];
}
