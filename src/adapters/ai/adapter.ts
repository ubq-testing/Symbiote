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
  // Read-only tools for gathering information
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

  // Action tools for performing operations
  {
    type: "function",
    function: {
      name: "create_pull_request",
      description: "Create a new pull request",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          title: { type: "string", description: "Pull request title" },
          head: { type: "string", description: "The name of the branch where your changes are implemented" },
          base: { type: "string", description: "The name of the branch you want the changes pulled into", default: "main" },
          body: { type: "string", description: "The contents of the pull request" },
          draft: { type: "boolean", description: "Whether to create the pull request as a draft", default: false },
        },
        required: ["owner", "repo", "title", "head", "base"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_issue",
      description: "Create a new issue",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          title: { type: "string", description: "Issue title" },
          body: { type: "string", description: "Issue body/description" },
          labels: { type: "array", items: { type: "string" }, description: "Array of label names to add to the issue" },
          assignees: { type: "array", items: { type: "string" }, description: "Array of usernames to assign to the issue" },
        },
        required: ["owner", "repo", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_comment",
      description: "Create a new comment on an issue or pull request",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          issue_number: { type: "number", description: "Issue or pull request number" },
          body: { type: "string", description: "Comment body" },
        },
        required: ["owner", "repo", "issue_number", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_review",
      description: "Create a review on a pull request",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          pull_number: { type: "number", description: "Pull request number" },
          body: { type: "string", description: "Review body" },
          event: { type: "string", enum: ["APPROVE", "REQUEST_CHANGES", "COMMENT"], description: "Review action", default: "COMMENT" },
          comments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "File path for the comment" },
                position: { type: "number", description: "Line position for the comment" },
                body: { type: "string", description: "Comment body" },
              },
              required: ["path", "position", "body"],
            },
            description: "Optional review comments on specific lines",
          },
        },
        required: ["owner", "repo", "pull_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_pull_request",
      description: "Update an existing pull request",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          pull_number: { type: "number", description: "Pull request number" },
          title: { type: "string", description: "New title for the pull request" },
          body: { type: "string", description: "New body for the pull request" },
          state: { type: "string", enum: ["open", "closed"], description: "New state for the pull request" },
          base: { type: "string", description: "Change the base branch" },
        },
        required: ["owner", "repo", "pull_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_issue",
      description: "Update an existing issue",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          issue_number: { type: "number", description: "Issue number" },
          title: { type: "string", description: "New title for the issue" },
          body: { type: "string", description: "New body for the issue" },
          state: { type: "string", enum: ["open", "closed"], description: "New state for the issue" },
          labels: { type: "array", items: { type: "string" }, description: "Replace all labels with this array" },
          assignees: { type: "array", items: { type: "string" }, description: "Replace all assignees with this array" },
        },
        required: ["owner", "repo", "issue_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_comment",
      description: "Update an existing comment",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          comment_id: { type: "number", description: "Comment ID" },
          body: { type: "string", description: "New comment body" },
        },
        required: ["owner", "repo", "comment_id", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_reaction",
      description: "Add a reaction emoji to a comment, issue, or pull request",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          subject_id: { type: "number", description: "ID of the issue, pull request, or comment" },
          content: {
            type: "string",
            enum: ["+1", "-1", "laugh", "confused", "heart", "hooray", "rocket", "eyes"],
            description: "Reaction emoji content"
          },
        },
        required: ["owner", "repo", "subject_id", "content"],
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
    apiKey: env.AI_API_KEY,
    baseURL: aiConfig.baseUrl,
  });

  async function classifyMention(request: MentionAssessmentRequest): Promise<MentionAssessmentResponse> {
    const { octokit, ...rest } = request;
    const messages = buildMentionMessages(rest);
    const maxToolCalls = 5; // Limit tool usage to prevent infinite loops
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
                await new Promise((resolve) => setTimeout(resolve, 500));
              }

              const toolResult = await executeGitHubTool(octokit, toolCall);
              currentMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult),
              });
            } catch (error) {
              console.warn(`[AI] Tool call failed: ${toolCall.function.name}`, {
                error: error instanceof Error ? error.message : String(error),
                toolCallId: toolCall.id,
              });

              currentMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  error: error instanceof Error ? error.message : String(error),
                  tool: toolCall.function.name,
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

function buildMentionMessages(request: Omit<MentionAssessmentRequest, "octokit">): ChatCompletionMessageParam[] {
  const { hostUsername, ...rest } = request;
  const payload = {
    hostUsername,
    notification: rest,
  };

  const systemMessage = `
You're a symbiont to ${hostUsername} on GitHub, you operate asynchronously on their behalf and for their benefit.

Your primary goal is to make your host's life easier and more productive by automating, streamlining, and improving their workflow.

You are given a notification from GitHub and you need to decide what to do with it on behalf of your host.

AVAILABLE TOOLS:

READING TOOLS (use these to gather information):
- fetch_pull_request_details: Get PR details, status, and recent commits
- fetch_issue_details: Get issue details and metadata
- fetch_recent_comments: Get recent comments from PRs/issues
- fetch_commit_details: Get commit information and file changes

ACTION TOOLS (use these to take actions on behalf of your host):
- create_pull_request: Create new PRs (e.g., starter implementations, fixes)
- create_issue: Create new issues (e.g., track todos, report problems)
- create_comment: Reply to issues/PRs with helpful information
- create_review: Submit PR reviews with feedback
- update_pull_request: Modify existing PRs (title, description, close, etc.)
- update_issue: Modify existing issues (labels, assignees, close, etc.)
- update_comment: Edit previous comments
- add_reaction: Add emoji reactions to show acknowledgment

BEHAVIOR GUIDELINES:
- Be proactive but cautious - only act when you have sufficient context
- Use reading tools first to understand situations before taking action
- When "respond" classification: Use action tools to directly help your host
- When "investigate" classification: Gather more info with reading tools, then potentially act
- When "ignore" classification: The notification doesn't require any action

EXAMPLES OF WHEN TO ACT:
- Someone asks for help in a comment → create_comment with solution
- PR needs review feedback → create_review with constructive feedback
- Issue describes a bug you can fix → create_pull_request with fix
- Task mentioned that you can implement → create_issue to track, then create_pull_request
- PR is ready for merge → update_pull_request to merge or add_reaction

After gathering any needed context with tools, respond with a detailed JSON object describing your assessment and any actions you plan to take, like this:
{
  "shouldAct": boolean,
  "priority": "low" | "medium" | "high",
  "confidence": number (0-1),
  "reason": string,
  "suggestedActions": string[],
  "classification": "respond" | "investigate" | "ignore"
}
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
    suggestedActions: Array.isArray(candidate.suggestedActions)
      ? candidate.suggestedActions.filter((item): item is string => typeof item === "string")
      : DEFAULT_ASSESSMENT.suggestedActions,
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
      // Read-only tools
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
          recent_commits: commits.data.slice(0, 5).map((commit) => ({
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
            labels: issue.data.labels.map((label) => (typeof label === "string" ? label : label.name)),
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
          comments: comments.data.slice(0, limit).map((comment) => ({
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
            files:
              commit.data.files?.slice(0, 10).map((file) => ({
                filename: file.filename,
                status: file.status,
                additions: file.additions,
                deletions: file.deletions,
              })) || [],
          },
        };
      }

      // Action tools
      case "create_pull_request": {
        const { owner, repo, title, head, base = "main", body, draft = false } = params;
        // const pr = await octokit.rest.pulls.create({
        //   owner,
        //   repo,
        //   title,
        //   head,
        //   base,
        //   body,
        //   draft,
        // });

        console.log("create_pull_request", params);

        return {
          pull_request: {
            number: 1,
            title: "test",
            html_url: "https://github.com/test/test/pull/1",
            created_at: new Date().toISOString(),
          },
        };
      }

      case "create_issue": {
        const { owner, repo, title, body, labels, assignees } = params;
        // const issue = await octokit.rest.issues.create({
          // owner,
          // repo,
        //   title,
        //   body,
        //   labels,
        //   assignees,
        // });

        console.log("create_issue", params);

        return {
          issue: {
            number: 1,
            title: "test",
            html_url: "https://github.com/test/test/issues/1",
            created_at: new Date().toISOString(),
          },
        };
      }

      case "create_comment": {
        const { owner, repo, issue_number, body } = params;
        // const comment = await octokit.rest.issues.createComment({
        //   owner,
        //   repo,
        //   issue_number,
        //   body,
        // });

        console.log("create_comment", params);

        return {
          comment: {
            id: 1,
            html_url: "https://github.com/test/test/issues/1/comments/1",
            created_at: new Date().toISOString(),
          },
        };
      }

      case "create_review": {
        const { owner, repo, pull_number, body, event = "COMMENT", comments } = params;
        // const review = await octokit.rest.pulls.createReview({
        //   owner,
        //   repo,
        //   pull_number,
        //   body,
        //   event,
        //   comments,
        // });

        console.log("create_review", params);


        return {
          review: {
            id: 1,
            state: "commented",
            html_url: "https://github.com/test/test/pull/1/reviews/1",
            submitted_at: new Date().toISOString(),
          },
        };
      }

      case "update_pull_request": {
        const { owner, repo, pull_number, title, body, state, base } = params;
        // const pr = await octokit.rest.pulls.update({
        //   owner,
        //   repo,
        //   pull_number,
        //   title,
        //   body,
        //   state,
        //   base,
        // });

        console.log("update_pull_request", params);

        return {
          pull_request: {
            number: 1,
            title: "test",
            state: "open",
            updated_at: new Date().toISOString(),
          },
        };
      }

      case "update_issue": {
        const { owner, repo, issue_number, title, body, state, labels, assignees } = params;
        // const issue = await octokit.rest.issues.update({
        //   owner,
        //   repo,
        //   issue_number,
        //   title,
        //   body,
        //   state,
        //   labels,
        //   assignees,
        // });

        console.log("update_issue", params);

        return {
          issue: {
            number: 1,
            title: "test",
            state: "open",
            updated_at: new Date().toISOString(),
          },
        };
      }

      case "update_comment": {
        const { owner, repo, comment_id, body } = params;
        // const comment = await octokit.rest.issues.updateComment({
        //   owner,
        //   repo,
        //   comment_id,
        //   body,
        // });

        console.log("update_comment", params);

        return {
          comment: {
            id: 1,
            updated_at: new Date().toISOString(),
          },
        };
      }

      case "add_reaction": {
        const { owner, repo, subject_id, content } = params;
        // const reaction = await octokit.rest.reactions.createForIssue({
        //   owner,
        //   repo,
        //   issue_number: subject_id,
        //   content,
        // });

        console.log("add_reaction", params);
        
        
        return {
          reaction: {
            id: 1,
            content: "+1",
            created_at: new Date().toISOString(),
          },
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    // Handle GitHub API errors gracefully
    if (error instanceof Error && "status" in error) {
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
    return { error: `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}
