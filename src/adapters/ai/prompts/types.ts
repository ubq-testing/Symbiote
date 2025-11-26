import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";

export interface MentionAssessmentRequest {
    hostUsername: string;
    notificationReason: string;
    notificationType: string;
    repoFullName?: string | null;
    subjectTitle?: string | null;
    subjectUrl?: string | null;
    latestCommentUrl?: string | null;
    mentionAuthor?: string | null;
    mentionText?: string | null;
    unread: boolean;
    createdAt?: string;
    additionalContext?: string[];
    octokit: InstanceType<typeof customOctokit>;
  }
  
  export type MentionPriority = "low" | "medium" | "high";
  
  export interface MentionAssessmentResponse {
    shouldAct: boolean;
    priority: MentionPriority;
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
  