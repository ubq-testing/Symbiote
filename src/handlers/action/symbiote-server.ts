import { customOctokit, RestEndpointMethodTypes } from "@ubiquity-os/plugin-sdk/octokit";
import { Context, SupportedCustomEvents, SupportedEvents, SymbioteRuntime } from "../../types/index";
import { dispatcher } from "../dispatcher";
import { CallbackResult } from "../../types/callbacks";
import { customEventSchemas } from "../../types/custom-event-schemas";
import { isCommentEvent } from "../../types/typeguards";
import { readUserToken, generateOAuthState, storePendingState, buildAuthorizationUrl, postAuthorizationComment } from "../worker/routes/oauth/backend";
import { buildTokenKey } from "../../utils/kv";
import { createAppOctokit, createRepoOctokit } from "../octokit";

const MS_PER_HOUR = 60 * 60 * 1000;

function isCustomEvent(context: Context<SupportedEvents, SymbioteRuntime>): context is Context<SupportedCustomEvents, SymbioteRuntime> {
  return context.eventName in customEventSchemas;
}

export class SymbioteServer {
  private _serverStatus: "running" | "stopped" | "error" | null = null;
  private _maxRuntimeHours: number;
  private _currentRuntimeHours = 0;
  private _currentRunData: RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][0] | null = null;
  private _sessionId: string | null = null;
  private _context: Context<"issue_comment.created" | "server.start" | "server.restart" | "server.stop", "worker">;
  /**
   * Not the file name of the action used when dispatch,
   * but the workflow ID of the workflow run that is currently running.
   *
   * E.G., octokit.rest.actions.listWorkflowRuns().data.workflow_runs[0].id,
   * which is the workflow ID of the workflow run that is currently running.
   */
  private _workflowId: number | null = null;

  constructor(context: Context<"issue_comment.created" | "server.start" | "server.restart" | "server.stop", "worker">) {
    this._context = context;
    if (isCommentEvent(context)) {
      this._sessionId = context.pluginInputs.stateId;
    } else if (isCustomEvent(context)) {
      this._sessionId = context.payload.client_payload.stateId;
    }
    const maxRuntimeHours = context.config.maxRuntimeHours ?? 6;
    const safetyBufferHours = 1;
    this._maxRuntimeHours = maxRuntimeHours - safetyBufferHours;
  }

  get serverStatus() {
    return this._serverStatus;
  }

  get currentRunData() {
    return this._currentRunData;
  }

  get sessionId() {
    return this._sessionId;
  }

  get workflowId() {
    return this._workflowId;
  }

  get maxRuntimeHours() {
    return this._maxRuntimeHours;
  }

  get currentRuntimeHours() {
    return this._currentRuntimeHours;
  }

  /**
   * - Check if the server is running
   * - If the server is running, check if it has been running for too long
   * - If the server has been running for too long, stop the server and spawn a new one
   * - If the server is not running, spawn a new server
   */
  async init() {
    await this.checkServerDetails();
    let needsRestart = false;
    let isRunning = false;

    if (isCommentEvent(this._context)) {
      this._context.appOctokit = await createRepoOctokit({
        env: this._context.env,
        owner: this._context.payload.repository?.owner?.login ?? "",
        repo: this._context.payload.repository?.name ?? "",
      });
    } else if (isCustomEvent(this._context)) {
      this._context.appOctokit = await createRepoOctokit({
        env: this._context.env,
        owner: this._context.env.SYMBIOTE_HOST.FORKED_REPO.owner,
        repo: this._context.env.SYMBIOTE_HOST.FORKED_REPO.repo,
      });
    } else {
      throw new Error("Invalid context type for Symbiote server");
    }

    // if the server is running, check if it has been running for too long
    if (this._currentRunData && this._currentRunData.status === "in_progress") {
      this._workflowId = this._currentRunData.id;
      const createdAt = new Date(this._currentRunData.created_at);
      const now = new Date();
      this._currentRuntimeHours = (now.getTime() - createdAt.getTime()) / MS_PER_HOUR;
      if (this._currentRuntimeHours >= this._maxRuntimeHours) {
        needsRestart = true;
        isRunning = true;
      } else {
        this._context.logger.info(`Symbiote server is running`, { currentRunData: this._currentRunData });
      }
    }

    // if the server is not running, set the status to stopped
    if (!this._currentRunData || this._currentRunData.status !== "in_progress") {
      needsRestart = true;
      isRunning = false;
    }

    return { needsRestart, isRunning, runData: this._currentRunData };
  }

  async restartServer() {
    const { logger } = this._context;
    logger.info(`Restarting Symbiote server`);
    await this.stopServer();
    return await this.spawnServer();
  }

  async spawnServer() {
    if (this._serverStatus !== "stopped") {
      throw new Error("Server is already running");
    }
    if (!this._sessionId) {
      throw new Error("Session ID not found");
    }
    const { logger } = this._context;
    logger.info(`Spawning Symbiote server`);
    return await dispatcher({
      ...this._context,
      eventName: "server.start",
      payload: {
        action: "server.start",
        client_payload: {
          ...(isCommentEvent(this._context)
            ? {
                ...this._context.pluginInputs,
              }
            : {
                ...this._context.payload.client_payload,
              }),
          workflowId: this.workflowId ?? 0,
          sessionId: this.sessionId ?? "",
        },
      },
    });
  }

  async stopServer(): Promise<CallbackResult> {
    const { logger, appOctokit, env } = this._context;
    logger.info(`Stopping Symbiote server`);

    if (!this._currentRunData?.id) {
      return { status: 500, reason: "Cannot stop Symbiote server: No run data found" };
    }

    const response = (await appOctokit.rest.actions.cancelWorkflowRun({
      owner: env.SYMBIOTE_HOST.FORKED_REPO.owner,
      repo: env.SYMBIOTE_HOST.FORKED_REPO.repo,
      workflow_id: "compute.yml",
      run_id: this._currentRunData.id,
    })) as RestEndpointMethodTypes["actions"]["cancelWorkflowRun"]["response"];

    if (response.status === 202) {
      return { status: 200, reason: "Symbiote server stopped" };
    }

    // confirm the server has been stopped
    await this.checkServerDetails();

    if (this._serverStatus === "running") {
      return { status: 500, reason: "Cannot stop Symbiote server: Server is still running" };
    }

    return { status: 200, reason: "Symbiote server stopped" };
  }

  // see if we have a server running
  async checkServerDetails() {
    const { env, appOctokit } = this._context;

    try {
      const response = await appOctokit.rest.actions.listWorkflowRuns({
        owner: env.SYMBIOTE_HOST.FORKED_REPO.owner,
        repo: env.SYMBIOTE_HOST.FORKED_REPO.repo,
        workflow_id: "compute.yml",
      });

      this._currentRunData = response.data.workflow_runs[0];
      this._serverStatus = this._currentRunData?.status === "in_progress" ? "running" : "stopped";
    } catch (error) {
      if (!(error instanceof Error)) {
        throw this._context.logger.error(`Error checking server details: ${error}`, { error: new Error(String(error)) });
      }

      if (error.message.toLowerCase().includes("not found")) {
        this._serverStatus = "stopped";
        this._currentRunData = null;
        return;
      }

      throw this._context.logger.error(`Error checking server details: ${error}`, { error: error });
    }
  }

  async handleServerStart(): Promise<CallbackResult> {
    const { logger, adapters } = this._context;
    let sessionId, workflowId;
    if (isCommentEvent(this._context)) {
      sessionId = this._context.pluginInputs.stateId;
      workflowId = this._workflowId ?? 0;
    } else if (isCustomEvent(this._context)) {
      sessionId = this._context.payload.client_payload.sessionId;
      workflowId = this._context.payload.client_payload.workflowId;
    }

    logger.info(`Handling server.start event in worker`, { sessionId, workflowId });

    const login = this._context.env.SYMBIOTE_HOST.USERNAME;
    const encryptionKey = this._context.env.OAUTH.TOKEN_ENCRYPTION_KEY;
    const cachedToken = await readUserToken(adapters.kv, login, encryptionKey);

    if (cachedToken) {
      let validToken = await this.validateOAuthToken(cachedToken);

      if (!validToken) {
        logger.info("Cached OAuth token is invalid, requesting new authorization", { login });
        await this._context.adapters.kv.delete(buildTokenKey(login));
        return await this.requestOAuthAuthorization(login);
      }

      logger.info("Using cached OAuth token for user", { login });
      this._context.pluginInputs.authToken = cachedToken;
      // symbioteOctokit is for public-facing actions (comments, PRs, issues) using the OAuth token
      this._context.symbioteOctokit = new customOctokit({ auth: cachedToken });
      return await this.spawnServer();
    } else {
      logger.info("No OAuth token found for user, requesting new authorization", { login });
    }

    return await this.requestOAuthAuthorization(login);
  }

  async requestOAuthAuthorization(login: string): Promise<CallbackResult> {
    const { logger, adapters, env, appOctokit } = this._context;
    let owner, repo, issueNumber;
    if (isCommentEvent(this._context)) {
      owner = this._context.payload.repository?.owner?.login;
      repo = this._context.payload.repository?.name;
      issueNumber = this._context.payload.issue?.number;

      if (!issueNumber) {
        throw logger.error("Missing issue or pull request number when requesting OAuth authorization");
      }
    } else if (isCustomEvent(this._context)) {
      // TODO: Implement custom event handling
      // in reality, we shouldn't need this i don't think
      throw new Error("Custom event OAuth not implemented");
    }

    if (!owner || !repo || !issueNumber) {
      logger.error("Missing repository or issue context when requesting OAuth authorization");
      return { status: 500, reason: "Unable to build OAuth authorization comment" };
    }

    const state = generateOAuthState();
    await storePendingState(adapters.kv, state, {
      login,
      owner,
      repo,
      issueNumber,
      createdAt: new Date().toISOString(),
    });

    const authUrl = buildAuthorizationUrl(env, state);
    await postAuthorizationComment({
      appOctokit,
      owner,
      repo,
      issueNumber,
      login,
      url: authUrl,
    });

    logger.info("OAuth authorization requested", { login, owner, repo, issueNumber, state });

    return { status: 200, reason: "OAuth authorization requested. Link generated and posted to issue." };
  }

  async validateOAuthToken(token: string): Promise<boolean> {
    try {
      // Create a temporary octokit with the token to validate it
      const tempOctokit = new customOctokit({ auth: token });
      await tempOctokit.rest.users.getAuthenticated();
      return true;
    } catch (error) {
      return false;
    }
  }
}
