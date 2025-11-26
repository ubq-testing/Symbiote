import OpenAI from "openai";
import type { ChatCompletionMessage, ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { WorkerEnv, WorkflowEnv } from "../../types/env";
import { PluginSettings } from "../../types/plugin-input";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { GITHUB_READ_ONLY_TOOLS, GITHUB_TOOLS } from "./tools";
import { MENTION_CLASSIFICATION_SYSTEM_PROMPT } from "./prompts/mention-classification";
import { SUGGESTED_ACTIONS_SYSTEM_PROMPT } from "./prompts/suggested-action-execution";
import { formatList } from "./prompts/shared";
import { MentionAssessmentRequest, MentionAssessmentResponse, SuggestedActionsResponse, MentionPriority } from "./prompts/types";

type SymbioteEnv = WorkerEnv | WorkflowEnv;

export interface AiAdapter {
  classifyMention(request: MentionAssessmentRequest): Promise<{
    messages: ChatCompletionMessageParam[];
    assessment: MentionAssessmentResponse;
  }>;
  executeSuggestedActions({
    request,
    octokit,
    assessment,
    existingMessages,
  }: {
    request: MentionAssessmentRequest;
    octokit: InstanceType<typeof customOctokit>;
    assessment: MentionAssessmentResponse;
    existingMessages: ChatCompletionMessageParam[];
  }): Promise<{
    messages: ChatCompletionMessageParam[];
    response: SuggestedActionsResponse;
  }>;
}

const DEFAULT_ASSESSMENT: MentionAssessmentResponse = {
  shouldAct: false,
  priority: "low",
  confidence: 0.1,
  reason: "No automated assessment available.",
  suggestedActions: [],
  classification: "ignore",
};

const DEFAULT_SUGGESTED_ACTIONS_RESPONSE: SuggestedActionsResponse = {
  finalResponse: "No automated response available.",
  results: [],
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

  async function classifyMention(request: MentionAssessmentRequest): Promise<{
    messages: ChatCompletionMessageParam[];
    assessment: MentionAssessmentResponse;
  }> {
    const { octokit, ...rest } = request;
    const messages = buildMentionMessages(rest);
    const maxToolCalls = 5; // Limit tool usage to prevent infinite loops
    let toolCallCount = 0;

    let currentMessages: ChatCompletionMessageParam[] = [...messages];

    try {
      while (toolCallCount < maxToolCalls) {
        const completion = await client.chat.completions.create({
          model: aiConfig.model,
          temperature: 0.2,
          messages: currentMessages,
          tools: GITHUB_READ_ONLY_TOOLS,
          tool_choice: toolCallCount === 0 ? "auto" : "none", // Allow tools initially, then force final response
        });

        const choice = completion.choices[0];
        if (!choice) {
          break;
        }

        const message = choice.message;

        // Add the assistant's message to the conversation
        currentMessages.push(message);

        const {
          toolCallCount: nextToolCallCount,
          normalized,
          done,
        } = await handleAssistantMessage<MentionAssessmentResponse>({
          message,
          currentMessages,
          octokit,
          toolCallCount,
          defaultResponse: DEFAULT_ASSESSMENT,
        });

        toolCallCount = nextToolCallCount;

        if (done) {
          if (normalized) {
            return {
              messages: [...currentMessages, { role: "assistant", content: JSON.stringify(normalized) }],
              assessment: normalized
            };
          }
        }
      }
    } catch (error) {
      console.error(`[AI] Failed to classify mention`, { error });
      return {
        messages:[
        ...currentMessages,
        {
          role: "assistant",
          content: 
`An error occurred while parsing the response into a JSON object, a default will be provided as well as details about the error.

# DEFAULT RESPONSE

${JSON.stringify(DEFAULT_ASSESSMENT)}
        
# ERROR DETAILS

${error instanceof Error ? error.message : String(error)}\n\n\n`.trim(),
        },
      ],
      assessment: DEFAULT_ASSESSMENT,
    }
    }
    return {
      messages: [...currentMessages, { role: "assistant", content: JSON.stringify(DEFAULT_ASSESSMENT) }],
      assessment: DEFAULT_ASSESSMENT,
    };
  }

  async function executeSuggestedActions({
    request,
    octokit,
    assessment,
    existingMessages,
  }: {
    request: MentionAssessmentRequest;
    octokit: InstanceType<typeof customOctokit>;
    assessment: MentionAssessmentResponse;
    existingMessages: ChatCompletionMessageParam[];
  }): Promise<{
    messages: ChatCompletionMessageParam[];
    response: SuggestedActionsResponse;
  }> {
    const messages = buildSuggestedActionsMessages(request, assessment, existingMessages);
    let toolCallCount = 0;
    const maxToolCalls = 10; // Limit tool usage to prevent infinite loops
    let currentMessages = [...messages];

    try {
      while (toolCallCount < maxToolCalls) {
        const completion = await client.chat.completions.create({
          model: aiConfig.model,
          temperature: 0.2,
          messages: currentMessages,
          tools: GITHUB_TOOLS,
          tool_choice: toolCallCount === maxToolCalls ? "none" : "auto", // Allow tools initially, then force final response
        });

        const choice = completion.choices[0];
        if (!choice) {
          break;
        }

        const message = choice.message;

        currentMessages.push(message);

        const {
          toolCallCount: nextToolCallCount,
          normalized,
          done,
        } = await handleAssistantMessage<SuggestedActionsResponse>({
          message,
          currentMessages,
          octokit,
          toolCallCount,
          defaultResponse: DEFAULT_SUGGESTED_ACTIONS_RESPONSE,
        });

        toolCallCount = nextToolCallCount;
        if (done) {
          if (!normalized) {
            return {
              messages: currentMessages,
              response: DEFAULT_SUGGESTED_ACTIONS_RESPONSE,
            };
          }

          return {
            messages: currentMessages,
            response: normalized,
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

  function buildSuggestedActionsMessages(
    request: MentionAssessmentRequest,
    assessment: MentionAssessmentResponse,
    existingMessages: ChatCompletionMessageParam[]
  ): ChatCompletionMessageParam[] {
    // replace the first system message with the suggested actions system prompt
    existingMessages.find((message) => message.role === "system")!.content = SUGGESTED_ACTIONS_SYSTEM_PROMPT("write", request.hostUsername);

    // the most recent message was the assessment response
    return [
      ...existingMessages,
      {
        role: "user",
        content: `
Using the existing context, begin iterating through the following action items and execute them one by one.

${formatList(assessment.suggestedActions)}

Respond with a final response detailed JSON object describing the results of the actions, like this:
{
  "finalResponse": "final response to the user",
  "results": [
    {
      "action": "action_name",
      "result": "success" | "failure",
      "reason": "reason for the result",
    },
  ],
}
        `.trim(),
      },
    ];
  }

  return {
    classifyMention,
    executeSuggestedActions,
  };
}

function buildMentionMessages(request: Omit<MentionAssessmentRequest, "octokit">): ChatCompletionMessageParam[] {
  const { hostUsername, ...rest } = request;
  const payload = {
    hostUsername,
    notification: rest,
  };

  const systemPrompt = MENTION_CLASSIFICATION_SYSTEM_PROMPT(hostUsername);

  return [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: JSON.stringify(payload, null, 2),
    },
  ];
}

function safeParse<T extends MentionAssessmentResponse | SuggestedActionsResponse>(content: string): T | string {
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`[AI] Unable to parse assessment JSON`, { error, content });
    return content;
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

async function handleAssistantMessage<T extends MentionAssessmentResponse | SuggestedActionsResponse>({
  message,
  currentMessages,
  octokit,
  toolCallCount,
  defaultResponse,
}: {
  message: OpenAI.Chat.Completions.ChatCompletionMessage;
  currentMessages: ChatCompletionMessageParam[];
  octokit: InstanceType<typeof customOctokit>;
  toolCallCount: number;
  defaultResponse: T;
}): Promise<{ toolCallCount: number; normalized?: T; done: boolean }> {
  let updatedCount = toolCallCount;

  if (message.tool_calls && message.tool_calls.length > 0) {
    for (const toolCall of message.tool_calls) {
      updatedCount += 1;

      try {
        if (updatedCount > 1) {
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

    return { toolCallCount: updatedCount, done: false };
  }

  const answer = message.content;
  if (!answer) {
    return { toolCallCount: updatedCount, normalized: defaultResponse, done: true };
  }

  const parsed = safeParse<T>(answer);
  if (typeof parsed === "string") {
    const newResponse = `
An error occurred while parsing the response into a JSON object, alt
    
    `;

    return { toolCallCount: updatedCount, normalized: defaultResponse, done: true };
  }

  return { toolCallCount: updatedCount, normalized: parsed, done: true };
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
            title,
            html_url: `https://github.com/${owner}/${repo}/pull/1`,
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
            title,
            html_url: `https://github.com/${owner}/${repo}/issues/1`,
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
            html_url: `https://github.com/${owner}/${repo}/issues/1/comments/1`,
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
            html_url: `https://github.com/${owner}/${repo}/pull/1/reviews/1`,
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
            title,
            state,
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
            title,
            state,
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
            id: comment_id,
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
            content,
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
