import { RestEndpointMethodTypes } from "@ubiquity-os/plugin-sdk/octokit";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { WorkflowEnv } from "../types/env";

const MAX_RUNTIME_HOURS = 6 - 1; // 1 hour safety buffer

export interface RuntimeTracker {
  getCurrentRuntimeHours(): Promise<number>;
  shouldRestart(): Promise<boolean>;
  getWorkflowRunId(): number | null;
}

/**
 * Creates a runtime tracker for action context using GITHUB_RUN_ID and GitHub API
 */
export function createRuntimeTracker(
  env: WorkflowEnv,
  octokit: InstanceType<typeof customOctokit>
): RuntimeTracker {
  const runId = process.env.GITHUB_RUN_ID ? parseInt(process.env.GITHUB_RUN_ID, 10) : null;
  const { owner, repo } = env.SYMBIOTE_HOST.FORKED_REPO;

  let cachedRunData: RestEndpointMethodTypes["actions"]["getWorkflowRun"]["response"]["data"] | null = null;
  let lastFetchTime: number = 0;
  const CACHE_TTL_MS = 60 * 1000; // Cache for 1 minute

  async function fetchWorkflowRun(): Promise<RestEndpointMethodTypes["actions"]["getWorkflowRun"]["response"]["data"] | null> {
    if (!runId || !owner || !repo) {
      return null;
    }

    const now = Date.now();
    if (cachedRunData && (now - lastFetchTime) < CACHE_TTL_MS) {
      return cachedRunData;
    }

    try {
      const response = await octokit.rest.actions.getWorkflowRun({
        owner,
        repo,
        run_id: runId,
      });

      cachedRunData = response.data;
      lastFetchTime = now;
      return response.data;
    } catch (error) {
      console.error("Error fetching workflow run:", error);
      return cachedRunData; // Return cached data if available
    }
  }

  return {
    async getCurrentRuntimeHours(): Promise<number> {
      const runData = await fetchWorkflowRun();
      if (!runData || !runData.created_at) {
        return 0;
      }

      const createdAt = new Date(runData.created_at);
      const now = new Date();
      return (now.getTime() - createdAt.getTime()) / 3600000;
    },

    async shouldRestart(): Promise<boolean> {
      const runtimeHours = await this.getCurrentRuntimeHours();
      return runtimeHours >= MAX_RUNTIME_HOURS;
    },

    getWorkflowRunId(): number | null {
      return runId;
    },
  };
}

