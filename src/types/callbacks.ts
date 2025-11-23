import { SupportedEvents, Context, SymbioteRuntime, SupportedCustomEvents, CustomContext } from "./context";
import { CustomEventSchemas } from "./custom-event-schemas";
import { PluginSettings } from "./plugin-input";

export type CallbackResult = { status: 200 | 201 | 204 | 404 | 500; reason: string; content?: string | Record<string, unknown> };

export type HandlerCallbacks<T extends SupportedEvents = SupportedEvents, TRuntime extends SymbioteRuntime = SymbioteRuntime> = {
  [K in T]: Array<(context: Context<K, TRuntime>) => Promise<CallbackResult>>;
};

export interface PluginInputs<T extends SupportedEvents = SupportedEvents, TU extends CustomContext["payload"] = CustomContext["payload"]> {
  stateId: string;
  eventName: T;
  eventPayload: TU;
  settings: PluginSettings;
  ref: string;
  command: string;
  signature: string;
  authToken: string;
}

export type SymbioteServerCallbackPayloads = {
  [K in SupportedEvents]: K extends SupportedCustomEvents ? CustomEventSchemas<K> : never;
}

export type RepositoryDispatchPayload<T extends keyof SupportedEvents = keyof SupportedEvents> = {
  action: T;
  client_payload: T extends SupportedCustomEvents ? CustomEventSchemas<T> : never;
}