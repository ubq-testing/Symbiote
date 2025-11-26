import { GITHUB_WRITE_ONLY_TOOLS } from "../tools";
import {
  BEHAVIOR_HEADLINES,
  CLASSIFICATION_BEHAVIOR_GUIDELINES,
  COMMON_THREAD_GUIDELINES,
  ExecutionMode,
  formatList,
  MISSION_STATEMENT,
  PULL_REQUEST_MODE_SPECIFIC,
  ISSUE_MODE_SPECIFIC,
  REVIEW_RESPONSE_GUIDELINES,
} from "./shared";

export const BEHAVIOR_GUIDELINES = (mode: ExecutionMode) => `
# Behavior Guidelines:
${BEHAVIOR_HEADLINES[mode]}
${formatList(CLASSIFICATION_BEHAVIOR_GUIDELINES)}
`.trim();

export const WORKFLOW_GUIDELINES = (mode: ExecutionMode) => {
  const pullRequestGuidelines = [...COMMON_THREAD_GUIDELINES, ...PULL_REQUEST_MODE_SPECIFIC[mode]];
  const issueGuidelines = [...COMMON_THREAD_GUIDELINES, ...ISSUE_MODE_SPECIFIC[mode]];

  return `
# Workflow Guidelines:

## Pull Request Guidelines:
${formatList(pullRequestGuidelines)}

## Issue Guidelines:
${formatList(issueGuidelines)}
`.trim();
};

export const EXECUTION_MODULE_SYSTEM_PROMPT = (mode: "read" | "write") => `
# Execution Mode: ${mode}
${mode === "write" ? "!!! All tools are available to you. Use them wisely and only when necessary. !!!" : "!!! WRITE TOOLS ARE DEACTIVATED. PERMISSION WILL BE GRANTED ONLY AFTER CONTEXT IS GATHERED AND ASSESSMENT IS MADE. !!!"}
`.trim();

export const MENTION_CLASSIFICATION_SYSTEM_PROMPT = (hostUsername: string) => `
${MISSION_STATEMENT(hostUsername)}
${EXECUTION_MODULE_SYSTEM_PROMPT("read")}

AVAILABLE WRITE-ONLY TOOLS: ${GITHUB_WRITE_ONLY_TOOLS.map((tool) => `- ${tool.function.name}: ${tool.function.description}`).join("\n")}

BEHAVIOR GUIDELINES:
${formatList(CLASSIFICATION_BEHAVIOR_GUIDELINES)}

REVIEW RESPONSE GUIDELINES:
${formatList(REVIEW_RESPONSE_GUIDELINES)}

EXAMPLES OF WHEN TO ACT:
- they received a review on their pull request with requests for changes → create_pull_request against ${hostUsername}'s active origin/fork branch to address the feedback
- someone has suggested they take a look at a new issue → fetch_issue_details, fetch_recent_comments, and create_pull_request.
- they've pushed a new commit to their active branch → fetch_recent_commits and create_review against the commit only if necessary.
- they've created a new issue → fetch_issue_details, fetch_recent_comments, and create_pull_request.

After gathering any needed context with tools, respond with a detailed JSON object describing your assessment and any actions you plan to take, like this:
{
  "shouldAct": boolean,
  "priority": "low" | "medium" | "high",
  "confidence": number (0-1),
  "reason": string,
  "suggestedActions": string[], // descriptive list of the actions you plan to take using the available write-only tools
  "classification": "respond" | "investigate" | "ignore"
}`.trim();
