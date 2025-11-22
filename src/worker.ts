import { createPlugin } from "@ubiquity-os/plugin-sdk";
import { Manifest } from "@ubiquity-os/plugin-sdk/manifest";
import { LOG_LEVEL, LogLevel, Logs } from "@ubiquity-os/ubiquity-os-logger";
import { ExecutionContext } from "hono";
import manifest from "../manifest.json" with { type: "json" };
import { runSymbiote } from "./index";
import { workerEnvSchema, pluginSettingsSchema, PluginSettings, SupportedEvents, Command, SupportedCustomEvents, Context } from "./types";
import { WorkerEnv } from "./types/env";
import { Value } from "@sinclair/typebox/value";
import { CustomEventSchemas, customEventSchemas } from "./types/custom-event-schemas";

function createLogger(logLevel: LogLevel) {
  return new Logs(logLevel);
}

function validateEnvironment(env: WorkerEnv, logger: Logs): { error?: string } | WorkerEnv {
  const cleanedEnv = Value.Clean(workerEnvSchema, env);
  if (!Value.Check(workerEnvSchema, cleanedEnv)) {
    const errors = [...Value.Errors(workerEnvSchema, cleanedEnv)];
    logger.error(`Invalid environment variables: ${errors.map((error) => error.message).join(", ")}`);
    return {
      error: errors.map((error) => error.message).join(", "),
    };
  }

  return Value.Decode(workerEnvSchema, Value.Default(workerEnvSchema, env));
}

function isCustomEventGuard<T extends SupportedEvents = SupportedEvents>(event: T): event is T {
  return event in customEventSchemas;
}

function validateCallbackPayload<T extends SupportedEvents = SupportedEvents>({
  payload,
  logger,
  event
}: {
  payload: unknown,
  logger: Logs,
  event: T,
}): CustomEventSchemas<T>["client_payload"] {
  if (!isCustomEventGuard(event)) {
    throw new Error(`Invalid event: ${event}`);
  }

  const payloadSchema = customEventSchemas[event as keyof typeof customEventSchemas];

  const cleanedPayload = Value.Clean(payloadSchema, payload);
  if (!Value.Check(payloadSchema, cleanedPayload)) {
    const errors = [...Value.Errors(payloadSchema, cleanedPayload)];
    logger.error(`Invalid payload: ${errors.map((error) => error.message).join(", ")}`);
    throw new Error(`Invalid payload: ${errors.map((error) => error.message).join(", ")}`);
  }
  return Value.Decode(payloadSchema, Value.Default(payloadSchema, cleanedPayload)).client_payload;
}

function isErrorGuard(value: unknown): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value;
}


export default {
  async fetch(request: Request, env: WorkerEnv, executionCtx?: ExecutionContext) {
    const logger = createLogger(env.LOG_LEVEL as LogLevel);
    const honoApp = createPlugin<PluginSettings, WorkerEnv, Command, Exclude<SupportedEvents, SupportedCustomEvents>>(
      (context) => {
        return runSymbiote<SupportedEvents, "worker">(
          {
            ...context,
            request: request.clone(),
          } as Context<Exclude<SupportedEvents, SupportedCustomEvents>, "worker">
        );
      },
      manifest as Manifest,
      {
        envSchema: workerEnvSchema,
        postCommentOnError: true,
        settingsSchema: pluginSettingsSchema,
        logLevel: (env.LOG_LEVEL as LogLevel) ?? LOG_LEVEL.INFO,
        kernelPublicKey: env.KERNEL_PUBLIC_KEY as string,
        bypassSignatureVerification: true
      }
    );

    honoApp.post("/callback", async (c) => {
      const validatedEnv = validateEnvironment(c.env as WorkerEnv, logger);
      if (typeof validatedEnv === 'object' && 'error' in validatedEnv && validatedEnv.error) {
        return c.json({ message: validatedEnv.error }, 500);
      }
      const body = await c.req.json()
      const event = c.req.header("X-GitHub-Event") as SupportedEvents;
      const validatedPayload = validateCallbackPayload<SupportedEvents>({ payload: body, logger, event });

      if (isErrorGuard(validatedPayload)) {
        return c.json({ message: validatedPayload.error }, 500);
      }









      /**
       * TODO: Use KV to store the session ID and workflow run ID
       */


      return c.json({ message: "Callback received" });
    });

    return honoApp.fetch(request, env, executionCtx);
  },
};
