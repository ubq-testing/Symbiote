import { Context, SupportedEvents } from "../types";
import { PluginInputs } from "../types/callbacks";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { CallbackResult } from "../types/callbacks";
import { brotliCompressSync } from "node:zlib";

function compressString(str: string): string {
  const input = Buffer.from(str, "utf8");
  const compressed = brotliCompressSync(input);
  return Buffer.from(compressed).toString("base64");
}

export async function dispatcher(context: Context<SupportedEvents, "worker">, workflowId = "compute.yml"): Promise<CallbackResult> {
  const result = await workflowDispatch(context, workflowId);
  if (result.status !== 204) {
    return { status: result.status, reason: JSON.stringify(result.data) };
  }
  return { status: 200, reason: "Workflow dispatched" };
}


/**
 * This is intended for smaller main workflow-detached jobs. Use-case not fully 
 * confirmed yet. Might remove this in the future and prefer main workflow 
 * calls instead.
 */
async function workflowDispatch<T extends SupportedEvents = SupportedEvents>(context: Context<T, "worker">, workflowId: string) {
    if (!context.request) {
        throw new Error("Request object not available - dispatcher should only be called in worker runtime");
    }
    const payload = (await context.request.json()) as PluginInputs; // required cast

    const octokit = new customOctokit({
        auth: payload.authToken,
    });
    const { owner, repo } = context.env.SYMBIOTE_HOST.FORKED_REPO;

    if(!owner || !repo) {
      throw new Error("Invalid SYMBIOTE_HOST.FORKED_REPO");
    }

  return await octokit.rest.actions.createWorkflowDispatch({
    owner: context.env.SYMBIOTE_HOST.FORKED_REPO.owner,
    repo: context.env.SYMBIOTE_HOST.FORKED_REPO.repo,
    workflow_id: workflowId,
    ref: context.config.executionBranch,
    inputs: {
      ...payload,
      eventPayload: compressString(JSON.stringify(context.payload)),
      settings: JSON.stringify(context.config),
    },
  });
}
