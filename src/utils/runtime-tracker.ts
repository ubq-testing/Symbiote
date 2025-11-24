import { RestEndpointMethodTypes } from "@ubiquity-os/plugin-sdk/octokit";
import { Context } from "../types/index";

const MS_PER_HOUR = 60 * 60 * 1000;

export interface RuntimeTracker {
  getCurrentRuntimeHours(): Promise<number>;
  shouldRestart(): Promise<boolean>;
  getWorkflowRunId(): number | null;
}

/**
 * Creates a runtime tracker for action context using GITHUB_RUN_ID and GitHub API
 */
export function createRuntimeTracker(
  context: Context<"server.start" | "server.restart", "action">,
): RuntimeTracker {
  const { env, appOctokit, config } = context;
  const runId = context.env.GITHUB_RUN_ID ? parseInt(context.env.GITHUB_RUN_ID, 10) : null;
  const { owner, repo } = env.SYMBIOTE_HOST.FORKED_REPO;

  const maxRuntimeHours = config.maxRuntimeHours ?? 6;
  const safetyBufferHours = 1;
  const maxRuntimeHoursWithBuffer = maxRuntimeHours - safetyBufferHours;
  const cacheTtlMs = 60 * 1000;

  let cachedRunData: RestEndpointMethodTypes["actions"]["getWorkflowRun"]["response"]["data"] | null = null;
  let lastFetchTime: number = 0;

  async function fetchWorkflowRun(): Promise<RestEndpointMethodTypes["actions"]["getWorkflowRun"]["response"]["data"] | null> {
    if (!runId || !owner || !repo) {
      return null;
    }

    const now = Date.now();
    if (cachedRunData && (now - lastFetchTime) < cacheTtlMs) {
      return cachedRunData;
    }

    try {
      const response = await appOctokit.rest.actions.getWorkflowRun({
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
      return (now.getTime() - createdAt.getTime()) / MS_PER_HOUR;
    },

    async shouldRestart(): Promise<boolean> {
      const runtimeHours = await this.getCurrentRuntimeHours();
      return runtimeHours >= maxRuntimeHoursWithBuffer;
    },

    getWorkflowRunId(): number | null {
      return runId;
    },
  };
}

