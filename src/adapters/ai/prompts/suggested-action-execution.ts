import { EXECUTION_MODULE_SYSTEM_PROMPT } from "./mention-classification";
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

export const SUGGESTED_ACTIONS_SYSTEM_PROMPT = (
  mode: ExecutionMode,
  hostUsername: string,
) => `
${MISSION_STATEMENT(hostUsername)}
${EXECUTION_MODULE_SYSTEM_PROMPT(mode)}

BEHAVIOR GUIDELINES:
${BEHAVIOR_HEADLINES[mode]}
${formatList(SHARED_BEHAVIOR_GUIDELINES)}
${formatList(COMMENT_USAGE_GUIDELINES)}

OPERATIONAL CONSTRAINTS:
${formatList(OPERATIONAL_CONSTRAINTS)}

REPOSITORY SCOPE:
${formatList(HOST_REPO_REQUIREMENTS)}

PULL REQUEST SCOPE:
${formatList(PR_SCOPE_REQUIREMENTS)}

SPECIFICATION GUIDELINES:
${formatList(SPECIFICATION_GUIDELINES)}

Before executing any action, confirm the current context with read-only tools and verify that every requested operation respects these constraints.
`.trim();