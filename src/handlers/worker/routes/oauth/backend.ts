import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { Logs } from "@ubiquity-os/ubiquity-os-logger";
import { KvAdapter } from "../../../../adapters/kv";
import { WorkerEnv, WorkflowEnv } from "../../../../types/env";
import { createRepoOctokit } from "../../../octokit";
import { buildStateKey, buildTokenKey } from "../../../../utils/kv";
import { encrypt, decrypt, EncryptedData, isEncryptedData } from "../../../../utils/crypto";

export interface OAuthPendingState {
  login: string;
  owner: string;
  repo: string;
  issueNumber: number;
  createdAt: string;
}

/**
 * Encrypted OAuth token record stored in KV.
 * The token is encrypted using AES-256-GCM before storage.
 */
export interface OAuthTokenRecord {
  /** Encrypted token data */
  encryptedToken: EncryptedData;
  /** ISO timestamp of when the token was stored/updated */
  updatedAt: string;
}

/**
 * Legacy unencrypted token record for migration purposes.
 * @deprecated Only used for detecting and migrating old tokens
 */
interface LegacyOAuthTokenRecord {
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

/**
 * Reads and decrypts a user's OAuth token from KV storage.
 *
 * Handles both encrypted (current) and unencrypted (legacy) token formats.
 * Legacy tokens are automatically migrated to encrypted format on read.
 *
 * @param kv - KV adapter for storage access
 * @param login - GitHub username
 * @param encryptionKey - Base64-encoded encryption key from env
 * @returns Decrypted token or null if not found
 */
export async function readUserToken(
  kv: KvAdapter,
  login: string,
  encryptionKey: string
): Promise<string | null> {
  const entry = await kv.get<OAuthTokenRecord | LegacyOAuthTokenRecord>(buildTokenKey(login));

  if (!entry.value) {
    return null;
  }

  // Check if this is a legacy unencrypted token
  if ("token" in entry.value && typeof entry.value.token === "string") {
    const legacyRecord = entry.value as LegacyOAuthTokenRecord;
    console.log(`[OAuth] Migrating legacy unencrypted token for ${login}`);

    // Migrate to encrypted format
    await saveUserToken(kv, login, legacyRecord.token, encryptionKey);

    return legacyRecord.token;
  }

  // Decrypt the token
  const record = entry.value as OAuthTokenRecord;

  if (!record.encryptedToken || !isEncryptedData(record.encryptedToken)) {
    console.error(`[OAuth] Invalid token record format for ${login}`);
    return null;
  }

  try {
    return await decrypt(record.encryptedToken, encryptionKey);
  } catch (error) {
    console.error(`[OAuth] Failed to decrypt token for ${login}:`, error);
    return null;
  }
}

/**
 * Encrypts and saves a user's OAuth token to KV storage.
 *
 * @param kv - KV adapter for storage access
 * @param login - GitHub username
 * @param token - Plaintext OAuth token to encrypt and store
 * @param encryptionKey - Base64-encoded encryption key from env
 */
export async function saveUserToken(
  kv: KvAdapter,
  login: string,
  token: string,
  encryptionKey: string
): Promise<void> {
  const encryptedToken = await encrypt(token, encryptionKey);

  const record: OAuthTokenRecord = {
    encryptedToken,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(buildTokenKey(login), record);
  console.log(`[OAuth] Token encrypted and saved for ${login}`);
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
  await saveUserToken(kv, pending.login, token, env.OAUTH.TOKEN_ENCRYPTION_KEY);


  //  todo: think if we can handle this better without the duplicate command needed to start the server
  const message = [
    `Thanks, @${pending.login}! Authorization succeeded.`,
    "Symbiote can now act on your behalf. Run `/symbiote start` again to begin.",
  ].join("\n\n");

  const repoOctokit = await createRepoOctokit({
    env,
    owner: pending.owner,
    repo: pending.repo,
  });

  await repoOctokit.rest.issues.createComment({
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

