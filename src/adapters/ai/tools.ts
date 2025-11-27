import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { createRepoOctokit } from "../../handlers/octokit";
import OpenAI from "openai";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { WorkerEnv, WorkflowEnv } from "../../types/env";

export type ToolName = {
  [K in keyof typeof TOOLS]: K
}[keyof typeof TOOLS];


const TOOLS = {
"fetch_pull_request_details": async ({owner, repo, pull_number}: {owner: string, repo: string, pull_number: number}) => {},
"fetch_issue_details": async ({owner, repo, issue_number}: {owner: string, repo: string, issue_number: number}) => {},
"fetch_recent_comments": async ({owner, repo, number, type, limit = 10}: {owner: string, repo: string, number: number, type: "pull_request" | "issue", limit?: number}) => {},
"fetch_commit_details": async ({owner, repo, commit_sha}: {owner: string, repo: string, commit_sha: string}) => {},
"fetch_recent_commits": async ({owner, repo, limit = 10}: {owner: string, repo: string, limit?: number}) => {},
"fetch_pull_request_reviews": async ({owner, repo, pull_number}: {owner: string, repo: string, pull_number: number}) => {},
"fetch_pull_request_timeline": async ({owner, repo, pull_number}: {owner: string, repo: string, pull_number: number}) => {},
"fetch_repository_details": async ({owner, repo}: {owner: string, repo: string}) => {},
"check_app_installation": async ({owner, repo}: {owner: string, repo: string}) => {},
"create_pull_request": async ({owner, repo, title, head, base, body, draft = false}: {owner: string, repo: string, title: string, head: string, base?: string, body: string, draft?: boolean}) => {},
"create_issue": async ({owner, repo, title, body, labels, assignees}: {owner: string, repo: string, title: string, body: string, labels: string[], assignees: string[]}) => {},
"create_comment": async ({owner, repo, issue_number, body}: {owner: string, repo: string, issue_number: number, body: string}) => {},
"create_review": async ({owner, repo, pull_number, body, event = "COMMENT", comments}: {owner: string, repo: string, pull_number: number, body: string, event?: "APPROVE" | "REQUEST_CHANGES" | "COMMENT", comments?: {path: string, position: number, body: string}[]}) => {},
"update_pull_request": async ({owner, repo, pull_number, title, body, state, base}: {owner: string, repo: string, pull_number: number, title: string, body: string, state?: "open" | "closed", base?: string} ) => {},
"update_issue": async ({owner, repo, issue_number, title, body, state, labels, assignees}: {owner: string, repo: string, issue_number: number, title: string, body: string, state?: "open" | "closed", labels?: string[], assignees?: string[]} ) => {},
"update_comment": async ({owner, repo, comment_id, body}: {owner: string, repo: string, comment_id: number, body: string}) => {},
"add_reaction":async ({owner, repo, subject_id, content}: {owner: string, repo: string, subject_id: number, content: string}) => {},
}

export const GITHUB_READ_ONLY_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "fetch_pull_request_details" as const,
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
    type: "function" as const,
    function: {
      name: "fetch_issue_details" as const,
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
    type: "function" as const,
    function: {
      name: "fetch_recent_comments" as const,
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
    type: "function" as const,
    function: {
      name: "fetch_commit_details" as const,
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
  {
    type: "function" as const,
    function: {
      name: "fetch_recent_commits" as const,
      description: "Fetch recent commits from a repository",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          limit: { type: "number", description: "Maximum number of commits to fetch", default: 10 },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "fetch_pull_request_reviews",
      description: "Fetch reviews for a pull request",
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
    type: "function" as const,
    function: {
      name: "fetch_pull_request_timeline",
      description: "Fetch the timeline for a pull request",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          pull_number: { type: "number", description: "Pull request number" },
        },
      },
      required: ["owner", "repo", "pull_number"],
    },
  },
  {
    type: "function" as const,
    function: {
      name: "fetch_repository_details" as const,
      description: "Fetch details about a repository",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
        },
      },
      required: ["owner", "repo"],
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_app_installation" as const,
      description: "Confirm if the Symbiote app is installed on the repository",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
        },
        required: ["owner", "repo"],
      },
    },
  },
];

export const GITHUB_WRITE_ONLY_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "create_pull_request" as const,
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
    type: "function" as const,
    function: {
      name: "create_issue" as const,
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
    type: "function" as const,
    function: {
      name: "create_comment" as const,
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
    type: "function" as const,
    function: {
      name: "create_review" as const,
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
    type: "function" as const,
    function: {
      name: "update_pull_request" as const,
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
    type: "function" as const,
    function: {
      name: "update_issue" as const,
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
    type: "function" as const,
    function: {
      name: "update_comment" as const,
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
    type: "function" as const,
    function: {
      name: "add_reaction" as const,
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
            description: "Reaction emoji content",
          },
        },
        required: ["owner", "repo", "subject_id", "content"],
      },
    },
  },
];

// GitHub Tool Definitions
export const GITHUB_TOOLS: ChatCompletionTool[] = [...GITHUB_READ_ONLY_TOOLS, ...GITHUB_WRITE_ONLY_TOOLS] as const;


export async function executeGitHubTool(
  octokit: InstanceType<typeof customOctokit>,
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
  env: WorkerEnv | WorkflowEnv,
) {
  const { name, arguments: args } = toolCall.function as {name: ToolName; arguments: string};

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

      case "fetch_pull_request_reviews": {
        const { owner, repo, pull_number } = params;
        const reviews = await octokit.rest.pulls.listReviews({
          owner,
          repo,
          pull_number,
        });

        return {
          reviews: reviews.data.map((review) => review),
        };
      }

      case "fetch_pull_request_timeline": {
        const { owner, repo, pull_number } = params;
        const timeline = await octokit.rest.issues.listEventsForTimeline({
          owner,
          repo,
          issue_number: pull_number,
        });


        return {
          timeline: timeline.data.map((event) => event),
        };
      }

      case "fetch_repository_details": {
        const { owner, repo } = params;
        const repository = await octokit.rest.repos.get({
          owner,
          repo,
        });

        return {
          repository: {
            owner: repository.data.owner.login,
            name: repository.data.name,
            full_name: repository.data.full_name,
            organization: repository.data.organization?.login,
            description: repository.data.description,
            html_url: repository.data.html_url,
            language: repository.data.language,
            topics: repository.data.topics,
            visibility: repository.data.visibility,
            private: repository.data.private,
            parent: repository.data.parent,
            fork: repository.data.fork,
            default_branch: repository.data.default_branch,
            master_branch: repository.data.master_branch,
            permissions: repository.data.permissions,
            created_at: repository.data.created_at,
            updated_at: repository.data.updated_at,
          },
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
            state_reason: issue.data.state_reason,
            created_at: issue.data.created_at,
            updated_at: issue.data.updated_at,
            closed_at: issue.data.closed_at,
            author: issue.data.user?.login,
            author_association: issue.data.author_association,
            labels: issue.data.labels.map((label) => (typeof label === "string" ? label : label.name)),
            assignees: (issue.data.assignees 
            ? issue.data.assignees.map((assignee) => assignee.login) 
            : issue.data.assignee 
            ? [issue.data.assignee.login] 
            : []), 
            comments: issue.data.comments,
            html_url: issue.data.html_url,
            parent_issue_url: issue.data.parent_issue_url,
            pull_request_url: issue.data.pull_request?.html_url,
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
            author_association: comment.author_association,
            node_id: comment.node_id,
            html_url: comment.html_url,
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

      case "check_app_installation": {
        try{
          const repoOctokit = await createRepoOctokit({
            env,
            owner: params.owner,
            repo: params.repo,
          });


          const installation = await repoOctokit.rest.apps.getRepoInstallation({
            owner: params.owner,
            repo: params.repo,
          });

          return {
            installation: {
              id: installation.data.id,
              html_url: installation.data.html_url,
              created_at: installation.data.created_at,
            },
          };
        } catch (error) {
          return {
            error: `Installation not found: ${name}`,
            status: 404,
          };
        }
      }

      // Action tools
      case "create_pull_request": {
        const { owner, repo, title, head, base, body, draft = false } = params;
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
