import { Context, SupportedEvents } from "../types";
import { PluginInputs } from "../types/callbacks";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { CallbackResult } from "../types/callbacks";

export async function dispatcher(context: Context<SupportedEvents, "worker">): Promise<CallbackResult> {
  const result = await workflowDispatch(context);
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
async function workflowDispatch<T extends SupportedEvents = SupportedEvents>(context: Context<T, "worker">) {
    const payload = (await context.request.json()) as PluginInputs; // required cast

    const octokit = new customOctokit({
        auth: payload.authToken,
    });
    Reflect.deleteProperty(payload, "signature");

  return await octokit.rest.actions.createWorkflowDispatch({
    owner: context.env.SYMBIOTE_HOST.USERNAME,  
    repo: context.env.SYMBIOTE_HOST.FORKED_REPO.owner,
    workflow_id: "compute.yml",
    ref: context.config.executionBranch,
    inputs: {
      ...payload,
      eventPayload: JSON.stringify(context.payload),
      settings: JSON.stringify(context.config),
    },  
  });
}
