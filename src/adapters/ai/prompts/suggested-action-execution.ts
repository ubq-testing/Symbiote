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

FORK / UPSTREAM WORKFLOW:
- When acting on a pull request that lives in an upstream (non-fork) repository, first use read-only tools to discover the host-owned fork and the branch that backs the upstream PR.
- Create or update symbiote branches and pull requests only inside the host's fork (e.g., RepoB/symbiote/fix-X → RepoB/feature-X), never directly against the upstream repository.
- Allow changes to flow to the upstream PR only when the host merges your symbiote PR into their fork branch; you must not open symbiote PRs targeting the upstream origin.

Before executing any action, confirm the current context with read-only tools and verify that every requested operation respects these constraints.
`.trim();