import { RestEndpointMethodTypes } from "@ubiquity-os/plugin-sdk/octokit";
import { Context } from "../../types";
import { dispatcher } from "../dispatcher";

export class SymbioteServer {
    private _serverStatus: "running" | "stopped" | "error" | null = null;
    private _maxRuntimeHours = 6 - 1; // 1 hour safety buffer
    private _currentRuntimeHours = 0;
    private _currentRunData: RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][0] | null = null;

    constructor(
        private readonly _context: Context<"issue_comment.created", "worker">,
        private readonly _workflowId: string = "symbiote-server.yml"
    ) { }

    async init() {
        await this.checkServerDetails();

        // if the server is running, check if it has been running for too long
        if (this._currentRunData && this._currentRunData.status === "in_progress") {
            const createdAt = new Date(this._currentRunData.created_at);
            const now = new Date();
            this._currentRuntimeHours = (now.getTime() - createdAt.getTime()) / 3600000;
            if (this._currentRuntimeHours >= this._maxRuntimeHours) {
                await this.stopServer(this._context);
                return await this.spawnServer(this._context);
            }
        }


        // if the server is not running, set the status to stopped
        if (!this._currentRunData || this._currentRunData.status !== "in_progress") {
            return await this.spawnServer(this._context);
        }
    }

    async restartServer(context: Context<"issue_comment.created", "worker">) {
        const { logger } = context;
        logger.info(`Restarting Symbiote server`);
        await this.stopServer(context);
        return await this.spawnServer(context);
    }

    async spawnServer(context: Context<"issue_comment.created", "worker">) {
        if (this._serverStatus !== "stopped") {
            throw new Error("Server is already running");
        }
        const { logger } = context;
        logger.info(`Spawning Symbiote server`);
        return await dispatcher(context, this._workflowId);
    }

    async stopServer(context: Context<"issue_comment.created", "worker">) {
        const { logger, octokit, env } = context;
        logger.info(`Stopping Symbiote server`);

        if (!this._currentRunData?.id) {
            throw logger.error(`Cannot stop Symbiote server: No run data found`);
        }

        await octokit.rest.actions.cancelWorkflowRun({
            owner: env.SYMBIOTE_HOST.USERNAME,
            repo: env.SYMBIOTE_HOST.FORKED_REPO.repo,
            workflow_id: this._workflowId,
            run_id: this._currentRunData.id,
        }) as RestEndpointMethodTypes["actions"]["cancelWorkflowRun"]["response"];


        // confirm the server has been stopped
        await this.checkServerDetails();

        if (this._serverStatus === "running") {
            throw logger.error(`Cannot stop Symbiote server: Server is still running`);
        }

        return true;
    }

    // see if we have a server running
    async checkServerDetails() {
        const { env, octokit } = this._context;

        const response = await octokit.rest.actions.listWorkflowRuns({
            owner: env.SYMBIOTE_HOST.USERNAME,
            repo: env.SYMBIOTE_HOST.FORKED_REPO.repo,
            workflow_id: this._workflowId,
        });


        this._currentRunData = response.data.workflow_runs[0];
        this._serverStatus = this._currentRunData?.status === "in_progress" ? "running" : "stopped";
    }

}