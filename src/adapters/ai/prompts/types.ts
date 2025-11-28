import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import type { Notification, UserEvent } from "../../../types/github";

// ─────────────────────────────────────────────────────────────────────────────
// Workspace Context Types - Pre-fetched repository and fork information
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents a repository in the host's workspace (personal account or org)
 */
export interface WorkspaceRepo {
  full_name: string;              // "ubiquity-os/some-repo" or "keyrxng/my-fork"
  owner: string;                  // "ubiquity-os" or "keyrxng"
  owner_type: "User" | "Organization";
  is_fork: boolean;
  upstream_full_name?: string;    // If fork: "original-owner/original-repo"
  default_branch: string;
}

/**
 * Complete registry of repositories the symbiote can work in
 * Cached in KV for fast lookups
 */
export interface WorkspaceRegistry {
  host_repos: WorkspaceRepo[];                    // Host's personal repos
  org_repos: Record<string, WorkspaceRepo[]>;     // Keyed by org name
  fork_map: Record<string, string>;               // upstream_full_name -> fork_full_name
  last_synced: string;                            // ISO timestamp
}

/**
 * Pre-resolved context about a notification/event subject (PR or Issue)
 */
export interface ResolvedSubject {
  type: "PullRequest" | "Issue";
  number: number;
  title: string;
  state: string;
  // PR-specific fields
  head_fork?: string;             // For PRs: "keyrxng/fork" (the fork the PR is from)
  head_branch?: string;           // For PRs: "feature-x"
  base_repo: string;              // "ubiquity/original-repo"
  base_branch: string;            // "development"
  // Host relationship
  is_host_pr: boolean;            // Did the host open this PR/Issue?
  host_fork_for_base?: string;    // Host's fork of base_repo (from registry)
}

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
  // Pre-resolved context
  workspaceRegistry?: WorkspaceRegistry;
  resolvedSubject?: ResolvedSubject;
}

export interface EventAssessmentRequest {
  kind: "event";
  hostUsername: string;
  event: UserEvent;
  octokit: InstanceType<typeof customOctokit>;
  // Pre-resolved context
  workspaceRegistry?: WorkspaceRegistry;
  resolvedSubject?: ResolvedSubject;
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
