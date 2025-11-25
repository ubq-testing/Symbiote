import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { Logs } from "@ubiquity-os/ubiquity-os-logger";
import { KvAdapter } from "../../../../adapters/kv";
import { WorkerEnv } from "../../../../types/env";

const TOKEN_KEY_PREFIX = ["oauth", "token"];
const STATE_KEY_PREFIX = ["oauth", "state"];

export interface OAuthPendingState {
  login: string;
  owner: string;
  repo: string;
  issueNumber: number;
  createdAt: string;
}

export interface OAuthTokenRecord {
  token: string;
  updatedAt: string;
}

interface OAuthCallbackParams {
  kv: KvAdapter;
  env: WorkerEnv;
  code: string;
  state: string;
  logger: Logs;
  appOctokit: InstanceType<typeof customOctokit>;
}

interface GitHubAccessTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

function normalizeLogin(login: string) {
  return login.toLowerCase();
}

function buildTokenKey(login: string) {
  return [...TOKEN_KEY_PREFIX, normalizeLogin(login)];
}

function buildStateKey(state: string) {
  return [...STATE_KEY_PREFIX, state];
}

export function generateOAuthState() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Array.from({ length: 32 })
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
}

export function buildAuthorizationUrl(env: WorkerEnv, state: string) {
  const params = new URLSearchParams({
    client_id: env.OAUTH.CLIENT_ID,
    redirect_uri: env.OAUTH.REDIRECT_URI,
    state,
    // full permissions, full scope
    scope: "repo,org,user,notifications,issues,pull_requests,workflows,actions,deployments,discussions,pull_requests,workflows,workflow_run_logs,workflow_runs",
    allow_signup: "false",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function readUserToken(kv: KvAdapter, login: string): Promise<string | null> {
  const entry = await kv.get<OAuthTokenRecord>(buildTokenKey(login));
  return entry.value?.token ?? null;
}

export async function saveUserToken(kv: KvAdapter, login: string, token: string): Promise<void> {
  await kv.set(buildTokenKey(login), {
    token,
    updatedAt: new Date().toISOString(),
  });
}

export async function storePendingState(
  kv: KvAdapter,
  state: string,
  pending: OAuthPendingState,
): Promise<void> {
  await kv.set(buildStateKey(state), pending);
}

export async function consumePendingState(kv: KvAdapter, state: string): Promise<OAuthPendingState | null> {
  const entry = await kv.get<OAuthPendingState>(buildStateKey(state));
  if (!entry.value) {
    return null;
  }
  await kv.delete(buildStateKey(state));
  return entry.value;
}

export async function postAuthorizationComment({
  appOctokit,
  owner,
  repo,
  issueNumber,
  login,
  url,
}: {
  appOctokit: InstanceType<typeof customOctokit>;
  owner: string;
  repo: string;
  issueNumber: number;
  login: string;
  url: string;
}) {
  const body = [
    `@${login} Symbiote needs your permission to act on your behalf. Please [authorize the GitHub App](${url}).`,
    "After the authorization completes, rerun `/symbiote start` to launch the server.",
  ].join("\n\n");

  await appOctokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

export async function finalizeOAuthCallback({
  kv,
  env,
  code,
  state,
  logger,
  appOctokit,
}: OAuthCallbackParams) {
  const pending = await consumePendingState(kv, state);
  if (!pending) {
    logger.warn("OAuth callback invoked with missing or expired state", { state });
    throw new Error("OAuth state has expired or is invalid");
  }

  const token = await exchangeCodeForToken(env, code, state);
  await saveUserToken(kv, pending.login, token);

  const message = [
    `Thanks, @${pending.login}! Authorization succeeded.`,
    "Symbiote can now act on your behalf. Run `/symbiote start` to begin or wait for the worker to respond to the previous command.",
  ].join("\n\n");

  await appOctokit.rest.issues.createComment({
    owner: pending.owner,
    repo: pending.repo,
    issue_number: pending.issueNumber,
    body: message,
  });

  logger.info("OAuth token stored", { login: pending.login });
  return { login: pending.login, token };
}

async function exchangeCodeForToken(env: WorkerEnv, code: string, state: string) {
  const params = new URLSearchParams({
    client_id: env.OAUTH.CLIENT_ID,
    client_secret: env.OAUTH.CLIENT_SECRET,
    code,
    redirect_uri: env.OAUTH.REDIRECT_URI,
    state,
  });

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} when exchanging the OAuth code`);
  }

  const payload = (await response.json()) as GitHubAccessTokenResponse;
  if (!payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "Missing access token from GitHub");
  }

  return payload.access_token;
}

