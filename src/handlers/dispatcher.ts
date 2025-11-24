import { Context, SupportedEvents, SymbioteRuntime } from "../types/index";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { CallbackResult } from "../types/callbacks";
import { isActionRuntimeCtx, isEdgeRuntimeCtx } from "../types/typeguards";
import { compressString} from "@ubiquity-os/plugin-sdk/compression";


export async function dispatcher(context: Context<SupportedEvents, SymbioteRuntime>, workflowId = "compute.yml"): Promise<CallbackResult> {
  const result = await workflowDispatch(context, workflowId);
  if (result.status !== 204) {
    return { status: result.status, reason: JSON.stringify(result.data) };
  }
  return { status: 200, reason: "Workflow dispatched" };
}

async function workflowDispatch<T extends SupportedEvents = SupportedEvents>(
  context: Context<T, SymbioteRuntime>,
  workflowId: string
) {
  if (isActionRuntimeCtx(context)) {
    return await context.octokit.rest.actions.createWorkflowDispatch({
      owner: context.env.SYMBIOTE_HOST.FORKED_REPO.owner,
      repo: context.env.SYMBIOTE_HOST.FORKED_REPO.repo,
      workflow_id: workflowId,
      ref: context.config.executionBranch,
    });
  } else if (isEdgeRuntimeCtx(context)) {
    if (!context.request) {
      throw new Error("Request object not available - dispatcher should only be called in worker runtime");
    }
    const { pluginInputs } = context;

    const octokit = new customOctokit({
      auth: pluginInputs.authToken,
    });
    const { owner, repo } = context.env.SYMBIOTE_HOST.FORKED_REPO;

    if (!owner || !repo) {
      throw new Error("Invalid SYMBIOTE_HOST.FORKED_REPO");
    }

    return await octokit.rest.actions.createWorkflowDispatch({
      owner: context.env.SYMBIOTE_HOST.FORKED_REPO.owner,
      repo: context.env.SYMBIOTE_HOST.FORKED_REPO.repo,
      workflow_id: workflowId,
      ref: context.config.executionBranch,
      inputs: {
        ...pluginInputs,
        eventPayload: compressString(JSON.stringify(context.payload)),
        settings: compressString(JSON.stringify(context.config)),
      },
    });
  } else {
    throw new Error("Invalid runtime");
  }
}
