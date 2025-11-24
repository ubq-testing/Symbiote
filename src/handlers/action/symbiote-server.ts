import { RestEndpointMethodTypes } from "@ubiquity-os/plugin-sdk/octokit";
import { Context, SupportedCustomEvents, SupportedEvents, SymbioteRuntime } from "../../types/index";
import { dispatcher } from "../dispatcher";
import { CallbackResult } from "../../types/callbacks";
import { customEventSchemas } from "../../types/custom-event-schemas";
import { isActionRuntimeCtx, isEdgeRuntimeCtx } from "../../types/typeguards";

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
  private _context: Context<SupportedEvents, SymbioteRuntime>;
  /**
   * Not the file name of the action used when dispatch,
   * but the workflow ID of the workflow run that is currently running.
   *
   * E.G., octokit.rest.actions.listWorkflowRuns().data.workflow_runs[0].id,
   * which is the workflow ID of the workflow run that is currently running.
   */
  private _workflowId: number | null = null;

  constructor(context: Context<SupportedEvents, SymbioteRuntime>) {
    if(isCustomEvent(context)) {
      this._sessionId = context.payload.client_payload.stateId;
    } else if(isEdgeRuntimeCtx(context)) {
      this._sessionId = context.pluginInputs?.stateId;
    }
    this._context = context;
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
          ...(this._context as Context<SupportedCustomEvents, "action">).payload.client_payload,
          sessionId: this._sessionId,
          workflowId: this._currentRunData?.id ?? this._workflowId ?? 0,
        },
      },
    });
  }

  async stopServer(): Promise<CallbackResult> {
    const { logger, octokit, env } = this._context;
    logger.info(`Stopping Symbiote server`);

    if (!this._currentRunData?.id) {
      return { status: 500, reason: "Cannot stop Symbiote server: No run data found" };
    }

    const response = (await octokit.rest.actions.cancelWorkflowRun({
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
    const { env, octokit } = this._context;

    try {
      const response = await octokit.rest.actions.listWorkflowRuns({
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
}
