import type { ChatCompletionTool } from "openai/resources/chat/completions";

export type ToolName<
T extends typeof GITHUB_READ_ONLY_TOOLS | typeof GITHUB_WRITE_ONLY_TOOLS = typeof GITHUB_READ_ONLY_TOOLS | typeof GITHUB_WRITE_ONLY_TOOLS> = {
  [K in keyof T]: T[K]["function"]["name"]
}[keyof T];

export const GITHUB_READ_ONLY_TOOLS = [
  // Read-only tools for gathering information
  // fetch_pull_request_details
  // fetch_issue_details
  // fetch_recent_comments
  // fetch_commit_details
  // fetch_recent_commits
  // check_app_installation
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
