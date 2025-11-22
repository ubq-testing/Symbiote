import { Context, SupportedEvents, SymbioteRuntime } from "./context";
import { PluginSettings } from "./plugin-input";
import { EmitterWebhookEvent } from "@octokit/webhooks";

export type CallbackResult = { status: 200 | 201 | 204 | 404 | 500; reason: string; content?: string | Record<string, unknown> };

export type HandlerCallbacks<T extends SupportedEvents = SupportedEvents, TRuntime extends SymbioteRuntime = SymbioteRuntime> = {
  [K in T]: Array<(context: Context<K, TRuntime>) => Promise<CallbackResult>>;
};

// TODO: add support for custom payloads via repository_dispatch/workflow_dispatch

export interface PluginInputs<T extends SupportedEvents = SupportedEvents, TU extends EmitterWebhookEvent<T> = EmitterWebhookEvent<T>> {
  stateId: string;
  eventName: T;
  eventPayload: TU["payload"];
  settings: PluginSettings;
  ref: string;
  command: string;
  signature: string;
  authToken: string;
}