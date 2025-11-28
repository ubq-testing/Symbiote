import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { KvAdapter } from "../kv";
import type { WorkspaceRepo, WorkspaceRegistry, ResolvedSubject } from "./prompts/types";
import type { Notification, UserEvent } from "../../types/github";

// ─────────────────────────────────────────────────────────────────────────────
// KV Key Builders
// ─────────────────────────────────────────────────────────────────────────────

const KV_KEYS = {
  workspaceRegistry: (hostUsername: string) => ["workspace-registry", hostUsername],
  forkMap: (upstreamFullName: string) => ["fork-map", upstreamFullName],
} as const;

// Cache expiry: 24 hours (repos don't change that frequently)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Workspace Registry Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Syncs the workspace registry by fetching all repos from:
 * - Host's personal account
 * - All organizations in orgsToWorkIn
 *
 * Stores the result in KV for fast subsequent lookups.
 */
export async function syncWorkspaceRegistry({
  octokit,
  hostUsername,
  orgsToWorkIn,
  kv,
}: {
  octokit: InstanceType<typeof customOctokit>;
  hostUsername: string;
  orgsToWorkIn: string[];
  kv: KvAdapter;
}): Promise<WorkspaceRegistry> {
  console.log(`[CONTEXT] Syncing workspace registry for ${hostUsername}`, {
    orgs: orgsToWorkIn,
  });

  // Fetch host's personal repos
  const hostRepos = await fetchUserRepos(octokit, hostUsername);

  // Fetch repos from each org
  const orgRepos: Record<string, WorkspaceRepo[]> = {};
  for (const org of orgsToWorkIn) {
    try {
      orgRepos[org] = await fetchOrgRepos(octokit, org);
    } catch (error) {
      console.warn(`[CONTEXT] Failed to fetch repos for org ${org}:`, error);
      orgRepos[org] = [];
    }
  }

  // Build fork map: upstream_full_name -> fork_full_name
  const forkMap: Record<string, string> = {};

  // Add host's personal forks to the map
  for (const repo of hostRepos) {
    if (repo.is_fork && repo.upstream_full_name) {
      forkMap[repo.upstream_full_name] = repo.full_name;
    }
  }

  // Add org forks to the map
  for (const repos of Object.values(orgRepos)) {
    for (const repo of repos) {
      if (repo.is_fork && repo.upstream_full_name) {
        // Only add if not already present (prefer host's personal fork)
        if (!forkMap[repo.upstream_full_name]) {
          forkMap[repo.upstream_full_name] = repo.full_name;
        } else {
          console.log(`[CONTEXT] Fork ${repo.upstream_full_name} already exists in fork map, skipping`);
          //   not sure if this is the best handling for this, probs best to prefer org fork over host fork
          //   but for now, we'll just skip it
        }
      }
    }
  }

  const registry: WorkspaceRegistry = {
    host_repos: hostRepos,
    org_repos: orgRepos,
    fork_map: forkMap,
    last_synced: new Date().toISOString(),
  };

  // Store in KV
  await kv.set(KV_KEYS.workspaceRegistry(hostUsername), registry);

  // Also store individual fork mappings for quick lookup
  for (const [upstream, fork] of Object.entries(forkMap)) {
    await kv.set(KV_KEYS.forkMap(upstream), fork);
  }

  console.log(`[CONTEXT] Workspace registry synced`, {
    hostRepoCount: hostRepos.length,
    orgCount: Object.keys(orgRepos).length,
    forkMapSize: Object.keys(forkMap).length,
  });

  return registry;
}

/**
 * Gets the workspace registry from KV cache, or syncs if expired/missing.
 */
export async function getWorkspaceRegistry({
  octokit,
  hostUsername,
  orgsToWorkIn,
  kv,
  forceSync = false,
}: {
  octokit: InstanceType<typeof customOctokit>;
  hostUsername: string;
  orgsToWorkIn: string[];
  kv: KvAdapter;
  forceSync?: boolean;
}): Promise<WorkspaceRegistry> {
  if (!forceSync) {
    try {
      const cached = await kv.get<WorkspaceRegistry>(KV_KEYS.workspaceRegistry(hostUsername));

      if (cached.value) {
        const lastSynced = new Date(cached.value.last_synced).getTime();
        const now = Date.now();

        if (now - lastSynced < CACHE_TTL_MS) {
          console.log(`[CONTEXT] Using cached workspace registry (age: ${Math.round((now - lastSynced) / 1000)}s)`);
          return cached.value;
        }
      }
    } catch (error) {
      console.warn(`[CONTEXT] Failed to read workspace registry from KV:`, error);
    }
  }

  // Cache miss or expired, sync fresh
  return syncWorkspaceRegistry({ octokit, hostUsername, orgsToWorkIn, kv });
}

/**
 * Quick lookup: find the host's fork of a given upstream repo
 */
export async function findHostForkOf({
  upstreamFullName,
  registry,
  kv,
}: {
  upstreamFullName: string;
  registry?: WorkspaceRegistry;
  kv?: KvAdapter;
}): Promise<string | null> {
  // Check registry first if provided
  if (registry?.fork_map[upstreamFullName]) {
    return registry.fork_map[upstreamFullName];
  }

  // Fall back to KV lookup
  if (kv) {
    try {
      const cached = await kv.get<string>(KV_KEYS.forkMap(upstreamFullName));
      return cached.value ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject Resolution Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the subject (PR or Issue) from a notification, pre-fetching
 * all relevant context about forks and branches.
 */
export async function resolveNotificationSubject({
  octokit,
  notification,
  hostUsername,
  registry,
}: {
  octokit: InstanceType<typeof customOctokit>;
  notification: Notification;
  hostUsername: string;
  registry: WorkspaceRegistry;
}): Promise<ResolvedSubject | null> {
  const subjectUrl = notification.subject?.url;
  if (!subjectUrl) {
    return null;
  }

  // Parse the subject URL to extract owner/repo/number
  // URLs look like: https://api.github.com/repos/owner/repo/pulls/123
  //             or: https://api.github.com/repos/owner/repo/issues/123
  const match = subjectUrl.match(/repos\/([^/]+)\/([^/]+)\/(pulls|issues)\/(\d+)/);
  if (!match) {
    console.warn(`[CONTEXT] Could not parse subject URL: ${subjectUrl}`);
    return null;
  }

  const [, owner, repo, type, numberStr] = match;
  const number = parseInt(numberStr, 10);
  const isPullRequest = type === "pulls";

  try {
    if (isPullRequest) {
      return await resolvePullRequest({
        octokit,
        owner,
        repo,
        number,
        hostUsername,
        registry,
      });
    } else {
      return await resolveIssue({
        octokit,
        owner,
        repo,
        number,
        hostUsername,
        registry,
      });
    }
  } catch (error) {
    console.error(`[CONTEXT] Failed to resolve subject:`, error);
    return null;
  }
}

/**
 * Resolves the subject from an event payload
 */
export async function resolveEventSubject({
  octokit,
  event,
  hostUsername,
  registry,
}: {
  octokit: InstanceType<typeof customOctokit>;
  event: UserEvent;
  hostUsername: string;
  registry: WorkspaceRegistry;
}): Promise<ResolvedSubject | null> {
  const payload = event.payload as Record<string, unknown>;
  const repoName = event.repo?.name;

  if (!repoName) {
    return null;
  }

  const [owner, repo] = repoName.split("/");

  // Check for PR in payload
  if (payload.pull_request) {
    const pr = payload.pull_request as { number?: number };
    if (pr.number) {
      return resolvePullRequest({
        octokit,
        owner,
        repo,
        number: pr.number,
        hostUsername,
        registry,
      });
    }
  }

  // Check for issue in payload
  if (payload.issue) {
    const issue = payload.issue as { number?: number };
    if (issue.number) {
      return resolveIssue({
        octokit,
        owner,
        repo,
        number: issue.number,
        hostUsername,
        registry,
      });
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchUserRepos(octokit: InstanceType<typeof customOctokit>, username: string): Promise<WorkspaceRepo[]> {
  const repos: WorkspaceRepo[] = [];

  try {
    const response = await octokit.rest.repos.listForUser({
      username,
      type: "owner",
      sort: "updated",
      per_page: 100,
    });

    for (const repo of response.data) {
      const workspaceRepo: WorkspaceRepo = {
        full_name: repo.full_name,
        owner: repo.owner.login,
        owner_type: "User",
        is_fork: repo.fork,
        default_branch: repo.default_branch ?? "main",
      };

      // If it's a fork, fetch the parent info
      if (repo.fork) {
        try {
          const repoDetails = await octokit.rest.repos.get({
            owner: repo.owner.login,
            repo: repo.name,
          });
          if (repoDetails.data.parent) {
            workspaceRepo.upstream_full_name = repoDetails.data.parent.full_name;
          }
        } catch (error) {
          console.warn(`[CONTEXT] Failed to fetch parent for fork ${repo.full_name}:`, error);
        }
      }

      repos.push(workspaceRepo);
    }
  } catch (error) {
    console.error(`[CONTEXT] Failed to fetch repos for user ${username}:`, error);
  }

  return repos;
}

async function fetchOrgRepos(octokit: InstanceType<typeof customOctokit>, org: string): Promise<WorkspaceRepo[]> {
  const repos: WorkspaceRepo[] = [];

  try {
    const response = await octokit.rest.repos.listForOrg({
      org,
      type: "all",
      sort: "updated",
      per_page: 100,
    });

    for (const repo of response.data) {
      const workspaceRepo: WorkspaceRepo = {
        full_name: repo.full_name,
        owner: repo.owner.login,
        owner_type: "Organization",
        is_fork: repo.fork ?? false,
        default_branch: repo.default_branch ?? "main",
      };

      // If it's a fork, fetch the parent info
      if (repo.fork) {
        try {
          const repoDetails = await octokit.rest.repos.get({
            owner: repo.owner.login,
            repo: repo.name,
          });
          if (repoDetails.data.parent) {
            workspaceRepo.upstream_full_name = repoDetails.data.parent.full_name;
          }
        } catch (error) {
          console.warn(`[CONTEXT] Failed to fetch parent for fork ${repo.full_name}:`, error);
        }
      }

      repos.push(workspaceRepo);
    }
  } catch (error) {
    console.error(`[CONTEXT] Failed to fetch repos for org ${org}:`, error);
  }

  return repos;
}

async function resolvePullRequest({
  octokit,
  owner,
  repo,
  number,
  hostUsername,
  registry,
}: {
  octokit: InstanceType<typeof customOctokit>;
  owner: string;
  repo: string;
  number: number;
  hostUsername: string;
  registry: WorkspaceRegistry;
}): Promise<ResolvedSubject> {
  const pr = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: number,
  });

  const baseRepo = `${owner}/${repo}`;
  const headFork = pr.data.head.repo?.full_name ?? null;
  const isHostPr = pr.data.user?.login === hostUsername;

  // Find host's fork of the base repo
  const hostForkForBase = registry.fork_map[baseRepo] ?? null;

  return {
    type: "PullRequest",
    number,
    title: pr.data.title,
    state: pr.data.state,
    head_fork: headFork ?? undefined,
    head_branch: pr.data.head.ref,
    base_repo: baseRepo,
    base_branch: pr.data.base.ref,
    is_host_pr: isHostPr,
    host_fork_for_base: hostForkForBase ?? undefined,
  };
}

async function resolveIssue({
  octokit,
  owner,
  repo,
  number,
  hostUsername,
  registry,
}: {
  octokit: InstanceType<typeof customOctokit>;
  owner: string;
  repo: string;
  number: number;
  hostUsername: string;
  registry: WorkspaceRegistry;
}): Promise<ResolvedSubject> {
  const issue = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: number,
  });

  const baseRepo = `${owner}/${repo}`;
  const isHostIssue = issue.data.user?.login === hostUsername;

  // Find host's fork of the repo
  const hostForkForBase = registry.fork_map[baseRepo] ?? null;

  // For issues, we need to determine the default branch
  let defaultBranch = "development";
  try {
    const repoInfo = await octokit.rest.repos.get({ owner, repo });
    defaultBranch = repoInfo.data.default_branch;
  } catch (e) {
    console.error(`[CONTEXT] Failed to get default branch for issue ${owner}/${repo}:`, e);
  }

  return {
    type: "Issue",
    number,
    title: issue.data.title,
    state: issue.data.state,
    base_repo: baseRepo,
    base_branch: defaultBranch,
    is_host_pr: isHostIssue,
    host_fork_for_base: hostForkForBase ?? undefined,
  };
}
