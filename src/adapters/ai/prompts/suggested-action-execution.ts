import { EXECUTION_MODULE_SYSTEM_PROMPT } from "./notification-classification";
import {
  BEHAVIOR_HEADLINES,
  COMMENT_USAGE_GUIDELINES,
  ExecutionMode,
  formatList,
  HOST_REPO_REQUIREMENTS,
  MISSION_STATEMENT,
  OPERATIONAL_CONSTRAINTS,
  PR_SCOPE_REQUIREMENTS,
  SHARED_BEHAVIOR_GUIDELINES,
  SPECIFICATION_GUIDELINES,
} from "./shared";

const TELEGRAM_COMMUNICATION_GUIDELINES = [
  "Telegram is your fast lane to the host - use it for quick confirmations and updates",
  "Set await_response=true when you need input before proceeding (e.g., 'Should I implement X or Y?')",
  "Set await_response=false for status updates that don't need a reply (e.g., 'Started working on issue #42')",
  "Be concise - one clear question or update per message",
  "Prefer Telegram over GitHub comments for speed; use GitHub for visible decision trails",
  "If response times out: make a safe default choice and note what you did",
] as const;

export const SUGGESTED_ACTIONS_SYSTEM_PROMPT = (
  mode: ExecutionMode,
  hostUsername: string,
  telegramEnabled: boolean = false,
) => `
${MISSION_STATEMENT(hostUsername)}
${EXECUTION_MODULE_SYSTEM_PROMPT(mode)}

BEHAVIOR GUIDELINES:
${BEHAVIOR_HEADLINES[mode]}
${formatList(SHARED_BEHAVIOR_GUIDELINES)}
${formatList(COMMENT_USAGE_GUIDELINES)}
${telegramEnabled ? `
TELEGRAM COMMUNICATION:
You have direct access to message your host via Telegram. This is a powerful capability for real-time communication.
${formatList(TELEGRAM_COMMUNICATION_GUIDELINES)}
` : ""}
OPERATIONAL CONSTRAINTS:
${formatList(OPERATIONAL_CONSTRAINTS)}

REPOSITORY SCOPE:
${formatList(HOST_REPO_REQUIREMENTS)}

PULL REQUEST SCOPE:
${formatList(PR_SCOPE_REQUIREMENTS)}

SPECIFICATION GUIDELINES:
${formatList(SPECIFICATION_GUIDELINES)}

FORK / UPSTREAM WORKFLOW:
- When acting on a pull request that lives in an upstream (non-fork) repository, first use read-only tools to discover the host-owned fork and the branch that backs the upstream PR.
- Create or update symbiote branches and pull requests only inside the host's fork (e.g., RepoB/symbiote/fix-X → RepoB/feature-X), never directly against the upstream repository.
- Allow changes to flow to the upstream PR only when the host merges your symbiote PR into their fork branch; you must not open symbiote PRs targeting the upstream origin.

Before executing any action, confirm the current context with read-only tools and verify that every requested operation respects these constraints.
`.trim();