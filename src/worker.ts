import { createPlugin } from "@ubiquity-os/plugin-sdk";
import { Manifest } from "@ubiquity-os/plugin-sdk/manifest";
import { LOG_LEVEL, LogLevel, Logs } from "@ubiquity-os/ubiquity-os-logger";
import { ExecutionContext } from "hono";
import manifest from "../manifest.json" with { type: "json" };
import { runSymbiote } from "./index.ts";
import { workerEnvSchema, pluginSettingsSchema, PluginSettings, SupportedEvents, Command, SupportedCustomEvents, Context, SupportedWebhookEvents } from "./types";
import { WorkerEnv } from "./types/env";
import { Value } from "@sinclair/typebox/value";
import { CustomEventSchemas, customEventSchemas } from "./types/custom-event-schemas";
import { env as honoEnv } from "hono/adapter";
import { validateEnvironment } from "./utils/validate-env";

function createLogger(logLevel: LogLevel) {
  return new Logs(logLevel);
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
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string";
}

export default {
  async fetch(request: Request, env: WorkerEnv, executionCtx?: ExecutionContext) {
    const logger = createLogger(env.LOG_LEVEL ?? LOG_LEVEL.INFO);
    const clonedRequest = request.clone();
    const validatedEnv = validateEnvironment(
      honoEnv({
        ...(executionCtx ?? {}),
        ...env,
      } as unknown as Parameters<typeof honoEnv>[0]),
      "worker"
    );

    const honoApp = createPlugin<
      PluginSettings,
      WorkerEnv,
      Command,
      SupportedWebhookEvents & SupportedCustomEvents
    >(
      (context) => {
        return runSymbiote<SupportedEvents, "worker">(
          {
            ...context,
            env: validatedEnv,
            request: clonedRequest,
          },
          "worker"
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
      if (typeof validatedEnv === 'object' && 'error' in validatedEnv && validatedEnv.error) {
        return c.json({ message: validatedEnv.error }, 500);
      }

      // Validate the worker secret
      const authHeader = c.req.header("Authorization");
      const expectedSecret = validatedEnv.WORKER_SECRET;
      if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== expectedSecret) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const body = await c.req.json()
      const event = c.req.header("X-GitHub-Event") as SupportedEvents;
      console.log(`Received callback for event: ${event}`,{
        body,
        event,
      });
      // const validatedPayload = validateCallbackPayload<Supporte 200nts>({ payload: body, logger, event });

      // if (isErrorGuard(validatedPayload)) {
      //   return c.json({ message: validatedPayload.error }, 500);
      // }

      /**
       * TODO: Use KV to store the session ID and workflow run ID
       */

      return c.json({ message: "Callback received" }, 200);
    });

    return honoApp.fetch(request, env, executionCtx);
  },
};
