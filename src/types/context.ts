import { CommentHandler, Context as PluginContext } from "@ubiquity-os/plugin-sdk";
import { PluginSettings } from "./plugin-input";
import { WorkerEnv, WorkflowEnv } from "./env";
import { EmitterWebhookEvent, EmitterWebhookEventName } from "@octokit/webhooks";
import { customOctokit} from "@ubiquity-os/plugin-sdk/octokit";
import { customEventSchemas, CustomEventSchemas } from "./custom-event-schemas";
import { Command } from "./command";
import { PluginInputs } from "./callbacks";
import { Adapters } from "../adapters/create-adapters";

export type SupportedCustomEvents = "server.start" | "server.restart" | "server.stop";
export type SupportedWebhookEvents = "issue_comment.created" | "issues.opened" | "pull_request.opened";
export type SupportedEvents = SupportedWebhookEvents | SupportedCustomEvents;

/**
 * # Octokit Authorization Guide
 * 
 * Three Octokit instances exist for different authorization contexts:
 * 
 * | Instance        | Auth Method           | Use For                                      |
 * |-----------------|----------------------|----------------------------------------------|
 * | `appOctokit`    | APP.ID + PRIVATE_KEY | App-level operations, listing installations |
 * | `hostOctokit`   | SYMBIOTE_HOST_PAT    | Polling events, notifications, private repos |
 * | `symbioteOctokit`| OAuth token         | Public-facing actions (comments, PRs, issues)|
 * 
 * ## When to use each:
 * 
 * - **appOctokit**: `apps.listInstallations()`, `apps.getAuthenticated()`, creating repo octokits
 * - **hostOctokit**: `activity.listEventsForAuthenticatedUser()`, `activity.listNotificationsForAuthenticatedUser()`
 * - **symbioteOctokit**: `issues.createComment()`, `pulls.create()`, `issues.create()` - anything user-facing
 */
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
    /**
     * **App-Level Authorization**
     * 
     * Authorized as the GitHub App (UbiquityOS, ubq-testing, etc.) using APP.ID & APP.PRIVATE_KEY.
     * 
     * @example
     * ```ts
     * // Listing all app installations
     * await appOctokit.rest.apps.listInstallations();
     * // Getting app info
     * await appOctokit.rest.apps.getAuthenticated();
     * // Creating a repo-scoped octokit (via createRepoOctokit helper)
     * ```
     * 
     * @see createRepoOctokit - for repository-scoped installation tokens
     */
    appOctokit: InstanceType<typeof customOctokit>;
    /**
     * **Host User Authorization**
     * 
     * Authorized with SYMBIOTE_HOST_PAT (personal access token of the host user).
     * 
     * Used for operations that require the host user's identity:
     * - Polling user events and notifications
     * - Accessing private repositories the host has access to
     * - Reading user-specific activity feeds
     * 
     * @example
     * ```ts
     * // Polling user events
     * await hostOctokit.rest.activity.listEventsForAuthenticatedUser({ username });
     * // Polling notifications
     * await hostOctokit.rest.activity.listNotificationsForAuthenticatedUser();
     * ```
     */
    hostOctokit: InstanceType<typeof customOctokit>;
    /**
     * **OAuth User Authorization (User-on-behalf-of)**
     * 
     * Authorized with an OAuth token from the GitHub App OAuth flow.
     * The user has authorized the app to act on their behalf.
     * Actions appear as: "Username commented · with AppName"
     * 
     * **USE THIS FOR ALL PUBLIC-FACING ACTIONS:**
     * - Creating comments
     * - Opening pull requests
     * - Creating issues
     * - Any action that should be attributed to the user
     * 
     * @example
     * ```ts
     * // Creating a comment as the user
     * await symbioteOctokit.rest.issues.createComment({ owner, repo, issue_number, body });
     * // Opening a PR as the user
     * await symbioteOctokit.rest.pulls.create({ owner, repo, title, head, base, body });
     * ```
     */
    symbioteOctokit: InstanceType<typeof customOctokit>;
    config: TConfig;
    env: TEnv;
    logger: PluginContext["logger"];
    commentHandler: CommentHandler;
    adapters: Adapters;
}

/**
 * The context in which the plugin is running.
 */
export type SymbioteRuntime = "action" | "worker";

export type Context<
    TEvents extends SupportedEvents = SupportedEvents,
    TRuntime extends SymbioteRuntime = SymbioteRuntime
> =
    { runtime: TRuntime } &
    // worker runtime will have a request object
    (TRuntime extends "worker" ? { request: Request, pluginInputs: PluginInputs } : {})
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