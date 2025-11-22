import { Context as PluginContext } from "@ubiquity-os/plugin-sdk";
import { PluginSettings } from "./plugin-input";
import { WorkerEnv, WorkflowEnv } from "./env";

export type SupportedEvents = "issue_comment.created" | "issues.opened" | "pull_request.opened";

export type Command = {
    action: "todo";
}

/**
 * The context in which the plugin is running.
 */
export type SymbioteRuntime = "action" | "worker";

export type Context<
    TEvents extends SupportedEvents = SupportedEvents,
    TRuntime extends SymbioteRuntime = SymbioteRuntime
> =
    (TRuntime extends "worker" ? { request: Request } : {})
    &
    (TRuntime extends "worker" ? PluginContext<PluginSettings, WorkerEnv, Command, TEvents> :
        TRuntime extends "action" ? PluginContext<PluginSettings, WorkflowEnv, Command, TEvents> :
        never);



