import { CommentHandler, Context as PluginContext } from "@ubiquity-os/plugin-sdk";
import { PluginSettings } from "./plugin-input";
import { WorkerEnv, WorkflowEnv } from "./env";
import { EmitterWebhookEvent, EmitterWebhookEventName } from "@octokit/webhooks";
import { customOctokit} from "@ubiquity-os/plugin-sdk/octokit";
import { customEventSchemas, CustomEventSchemas } from "./custom-event-schemas";

export type SupportedCustomEvents = "server.register";
export type SupportedWebhookEvents = "issue_comment.created" | "issues.opened" | "pull_request.opened";
export type SupportedEvents = SupportedWebhookEvents | SupportedCustomEvents;
export type Command = {
    action: "server.spawn" | "server.restart" | "server.stop";
}

export interface CustomContext<
    TConfig = PluginSettings,
    TEnv = WorkerEnv | WorkflowEnv,
    TCommand = Command,
    TSupportedEvents extends SupportedEvents = SupportedEvents
> {
    eventName: TSupportedEvents;
    payload: TSupportedEvents extends keyof typeof customEventSchemas ? CustomEventSchemas<TSupportedEvents> :
    TSupportedEvents extends EmitterWebhookEventName ? EmitterWebhookEvent<TSupportedEvents>["payload"] : never;
    command: TCommand | null;
    octokit: InstanceType<typeof customOctokit>;
    config: TConfig;
    env: TEnv;
    logger: PluginContext["logger"];
    commentHandler: CommentHandler;
}

/**
 * The context in which the plugin is running.
 */
export type SymbioteRuntime = "action" | "worker";

export type Context<
    TEvents extends SupportedEvents = SupportedEvents,
    TRuntime extends SymbioteRuntime = SymbioteRuntime
> =
    // worker runtime will have a request object
    (TRuntime extends "worker" ? { request: Request } : {})
    &
    (
        TRuntime extends "worker" ?
        // if the event is a supported GitHub webhook event, return the standard plugin context
        TEvents extends EmitterWebhookEventName ? CustomContext<PluginSettings, WorkerEnv, Command, TEvents> :
        // if the event is a custom event, return the custom context
        TEvents extends SupportedCustomEvents ? CustomContext<PluginSettings, WorkerEnv, Command, TEvents> :
        // any other event is not supported
        never
        :
        TRuntime extends "action" ?
        // if the event is a supported GitHub webhook event, return the standard plugin context
        TEvents extends EmitterWebhookEventName ? CustomContext<PluginSettings, WorkflowEnv, Command, TEvents> :
        // if the event is a custom event, return the custom context
        TEvents extends SupportedCustomEvents ? CustomContext<PluginSettings, WorkflowEnv, Command, TEvents> :
        // any other event is not supported
        never
        :
        // any other runtime is not supported
        never
    );