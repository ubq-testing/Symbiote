import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { WorkerEnv, WorkflowEnv } from "../../types/env";
import { PluginSettings } from "../../types/plugin-input";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";

type SymbioteEnv = WorkerEnv | WorkflowEnv;

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

// GitHub Tool Definitions
const GITHUB_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "fetch_pull_request_details",
      description: "Fetch detailed information about a pull request including title, description, status, and recent commits",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          pull_number: { type: "number", description: "Pull request number" },
        },
        required: ["owner", "repo", "pull_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_issue_details",
      description: "Fetch detailed information about an issue including title, description, and comments",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          issue_number: { type: "number", description: "Issue number" },
        },
        required: ["owner", "repo", "issue_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_recent_comments",
      description: "Fetch recent comments from a pull request or issue",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          number: { type: "number", description: "Pull request or issue number" },
          type: { type: "string", enum: ["pull_request", "issue"], description: "Type of thread" },
          limit: { type: "number", description: "Maximum number of comments to fetch", default: 10 },
        },
        required: ["owner", "repo", "number", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_commit_details",
      description: "Fetch details about a specific commit",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          commit_sha: { type: "string", description: "Commit SHA" },
        },
        required: ["owner", "repo", "commit_sha"],
      },
    },
  },
];

export interface AiAdapter {
  classifyMention(request: MentionAssessmentRequest): Promise<MentionAssessmentResponse>;
}

const DEFAULT_ASSESSMENT: MentionAssessmentResponse = {
  shouldAct: false,
  priority: "low",
  confidence: 0.1,
  reason: "No automated assessment available.",
  suggestedActions: [],
  classification: "ignore",
};

export async function createAiAdapter(env: SymbioteEnv, config: PluginSettings): Promise<AiAdapter | null> {
  const aiConfig = config.aiConfig;
  if (!aiConfig) {
    return null;
  }

  const client = new OpenAI({
    apiKey:env.AI_API_KEY,
    baseURL: aiConfig.baseUrl,
  });

  async function classifyMention(request: MentionAssessmentRequest): Promise<MentionAssessmentResponse> {
    const messages = buildMentionMessages(request);
    const maxToolCalls = 3; // Limit tool usage to prevent infinite loops
    let toolCallCount = 0;

    console.log("messages", messages);

    try {
      let currentMessages = [...messages];

      while (toolCallCount < maxToolCalls) {
        const completion = await client.chat.completions.create({
          model: aiConfig.model,
          temperature: 0.2,
          messages: currentMessages,
          tools: GITHUB_TOOLS,
          tool_choice: toolCallCount === 0 ? "auto" : "none", // Allow tools initially, then force final response
        });

        const choice = completion.choices[0];
        if (!choice) {
          break;
        }

        const message = choice.message;

        // Add the assistant's message to the conversation
        currentMessages.push(message);

        // Check if the assistant wants to use tools
        if (message.tool_calls && message.tool_calls.length > 0) {
          toolCallCount += message.tool_calls.length;

          // Execute each tool call with rate limiting
          for (const toolCall of message.tool_calls) {
            try {
              // Small delay between tool calls to avoid rate limiting
              if (toolCallCount > 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }

              const toolResult = await executeGitHubTool(request.octokit, toolCall);
              currentMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult),
              });
            } catch (error) {
              console.warn(`[AI] Tool call failed: ${toolCall.function.name}`, {
                error: error instanceof Error ? error.message : String(error),
                toolCallId: toolCall.id
              });

              currentMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  error: error instanceof Error ? error.message : String(error),
                  tool: toolCall.function.name
                }),
              });
            }
          }
        } else {
          // No more tool calls, this should be the final response
          const answer = message.content;
          if (!answer) {
            return DEFAULT_ASSESSMENT;
          }

          const parsed = safeParse(answer);
          return normalizeAssessment(parsed);
        }
      }

      // If we exhausted tool calls without a final response, return default
      return DEFAULT_ASSESSMENT;
    } catch (error) {
      console.error(`[AI] Failed to classify mention`, { error });
      return DEFAULT_ASSESSMENT;
    }
  }

  return {
    classifyMention,
  };
}

function buildMentionMessages(request: MentionAssessmentRequest): ChatCompletionMessageParam[] {
  const { hostUsername, ...rest } = request;
  const payload = {
    hostUsername,
    notification: rest,
  };

  const systemMessage = `
You are Symbiote, an autonomous GitHub co-pilot that triages mentions for ${hostUsername}.

You have access to GitHub tools to gather additional context when needed. Use these tools BEFORE making your final assessment if the initial notification data is insufficient.

Available tools:
- fetch_pull_request_details: Get PR title, description, status, and recent commits
- fetch_issue_details: Get issue details and metadata
- fetch_recent_comments: Get recent comments from PRs or issues
- fetch_commit_details: Get commit message, files changed, and stats

When to use tools:
- If latestCommentUrl is null, the notification might be from commits, pushes, or state changes
- When you need to understand what changed or what the mention is about
- To get the full context before deciding how to respond

After gathering any needed context with tools, respond with **strict JSON** matching:
{
  "shouldAct": boolean,
  "priority": "low" | "medium" | "high",
  "confidence": number (0-1),
  "reason": string,
  "suggestedActions": string[],
  "classification": "respond" | "investigate" | "ignore"
}

Guidance:
- "respond" means Symbiote should autonomously reply or prep work right now.
- "investigate" means gather context or prep a work plan before responding.
- "ignore" means no action is needed yet.
- Use all available data (original notification + tool results) to infer urgency and appropriate action.
`.trim();

  return [
    {
      role: "system",
      content: systemMessage,
    },
    {
      role: "user",
      content: JSON.stringify(payload, null, 2),
    },
  ];
}

function safeParse(content: string): Partial<MentionAssessmentResponse> {
  try {
    return JSON.parse(content) as MentionAssessmentResponse;
  } catch (error) {
    console.error(`[AI] Unable to parse assessment JSON`, { error, content });
    return {};
  }
}

function normalizeAssessment(candidate: Partial<MentionAssessmentResponse>): MentionAssessmentResponse {
  return {
    shouldAct: typeof candidate.shouldAct === "boolean" ? candidate.shouldAct : DEFAULT_ASSESSMENT.shouldAct,
    priority: isPriority(candidate.priority) ? candidate.priority : DEFAULT_ASSESSMENT.priority,
    confidence: typeof candidate.confidence === "number" ? candidate.confidence : DEFAULT_ASSESSMENT.confidence,
    reason: typeof candidate.reason === "string" && candidate.reason.length > 0 ? candidate.reason : DEFAULT_ASSESSMENT.reason,
    suggestedActions: Array.isArray(candidate.suggestedActions) ? candidate.suggestedActions.filter((item): item is string => typeof item === "string") : DEFAULT_ASSESSMENT.suggestedActions,
    classification: isClassification(candidate.classification) ? candidate.classification : DEFAULT_ASSESSMENT.classification,
  };
}

function isPriority(value: unknown): value is MentionPriority {
  return value === "low" || value === "medium" || value === "high";
}

function isClassification(value: unknown): value is MentionAssessmentResponse["classification"] {
  return value === "respond" || value === "investigate" || value === "ignore";
}

async function executeGitHubTool(
  octokit: InstanceType<typeof customOctokit>,
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
): Promise<unknown> {
  const { name, arguments: args } = toolCall.function;

  try {
    const params = JSON.parse(args);

    switch (name) {
      case "fetch_pull_request_details": {
        const { owner, repo, pull_number } = params;
        const pr = await octokit.rest.pulls.get({
          owner,
          repo,
          pull_number,
        });

        // Also fetch recent commits
        const commits = await octokit.rest.pulls.listCommits({
          owner,
          repo,
          pull_number,
          per_page: 5,
        });

        return {
          pull_request: {
            number: pr.data.number,
            title: pr.data.title,
            body: pr.data.body,
            state: pr.data.state,
            merged: pr.data.merged,
            draft: pr.data.draft,
            created_at: pr.data.created_at,
            updated_at: pr.data.updated_at,
            author: pr.data.user?.login,
            head: {
              ref: pr.data.head.ref,
              sha: pr.data.head.sha,
            },
            base: {
              ref: pr.data.base.ref,
            },
          },
          recent_commits: commits.data.slice(0, 5).map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author?.name,
            date: commit.commit.author?.date,
          })),
        };
      }

      case "fetch_issue_details": {
        const { owner, repo, issue_number } = params;
        const issue = await octokit.rest.issues.get({
          owner,
          repo,
          issue_number,
        });

        return {
          issue: {
            number: issue.data.number,
            title: issue.data.title,
            body: issue.data.body,
            state: issue.data.state,
            created_at: issue.data.created_at,
            updated_at: issue.data.updated_at,
            author: issue.data.user?.login,
            labels: issue.data.labels.map(label => typeof label === 'string' ? label : label.name),
          },
        };
      }

      case "fetch_recent_comments": {
        const { owner, repo, number, type, limit = 10 } = params;

        let comments;
        if (type === "pull_request") {
          comments = await octokit.rest.pulls.listReviewComments({
            owner,
            repo,
            pull_number: number,
            per_page: limit,
            sort: "created",
            direction: "desc",
          });
        } else {
          comments = await octokit.rest.issues.listComments({
            owner,
            repo,
            issue_number: number,
            per_page: limit,
            sort: "created",
            direction: "desc",
          });
        }

        return {
          comments: comments.data.slice(0, limit).map(comment => ({
            id: comment.id,
            body: comment.body,
            author: comment.user?.login,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
          })),
        };
      }

      case "fetch_commit_details": {
        const { owner, repo, commit_sha } = params;
        const commit = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: commit_sha,
        });

        return {
          commit: {
            sha: commit.data.sha,
            message: commit.data.commit.message,
            author: commit.data.commit.author?.name,
            date: commit.data.commit.author?.date,
            files_changed: commit.data.files?.length || 0,
            additions: commit.data.stats?.additions || 0,
            deletions: commit.data.stats?.deletions || 0,
            files: commit.data.files?.slice(0, 10).map(file => ({
              filename: file.filename,
              status: file.status,
              additions: file.additions,
              deletions: file.deletions,
            })) || [],
          },
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    // Handle GitHub API errors gracefully
    if (error instanceof Error && 'status' in error) {
      const status = (error as any).status;
      if (status === 404) {
        return { error: `Resource not found: ${name}`, status: 404 };
      }
      if (status === 403) {
        return { error: `Access forbidden: ${name}`, status: 403 };
      }
      if (status === 422) {
        return { error: `Invalid request: ${name}`, status: 422 };
      }
    }

    console.error(`[AI] Tool execution failed: ${name}`, { error: error instanceof Error ? error.message : String(error) });
    return { error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

