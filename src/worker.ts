import { CommentHandler, createPlugin } from "@ubiquity-os/plugin-sdk";
import { Manifest } from "@ubiquity-os/plugin-sdk/manifest";
import { LOG_LEVEL, LogLevel, Logs } from "@ubiquity-os/ubiquity-os-logger";
import { ExecutionContext } from "hono";
import manifest from "../manifest.json" with { type: "json" };
import { runSymbiote } from "./index.ts";
import { workerEnvSchema, pluginSettingsSchema, PluginSettings, SupportedEvents, SupportedCustomEvents, SupportedWebhookEvents } from "./types/index";
import { WorkerEnv } from "./types/env";
import { Command } from "./types/command";
import { Value } from "@sinclair/typebox/value";
import { CustomEventSchemas, customEventSchemas } from "./types/custom-event-schemas";
import { env as honoEnv } from "hono/adapter";
import { validateEnvironment } from "./utils/validate-env";
import { PluginInputs } from "./types/callbacks.ts";
import { Context } from "./types/index";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { ContentfulStatusCode } from "hono/utils/http-status.js";

function createLogger(logLevel: LogLevel) {
  return new Logs(logLevel);
}

function isCustomEventGuard<T extends SupportedCustomEvents = SupportedCustomEvents>(event: T): event is T {
  return event in customEventSchemas;
}

function validateCallbackPayload<T extends SupportedCustomEvents = SupportedCustomEvents>({
  payload,
  logger,
  event,
}: {
  payload: unknown;
  logger: Logs;
  event: T;
}): CustomEventSchemas<T> {
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
  return Value.Decode(payloadSchema, Value.Default(payloadSchema, cleanedPayload));
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

    const honoApp = createPlugin<PluginSettings, WorkerEnv, Command, SupportedWebhookEvents & SupportedCustomEvents>(
      async (context) => {
        return runSymbiote<SupportedEvents, "worker">(
          {
            ...context,
            env: validatedEnv,
            request: clonedRequest,
            pluginInputs: (await clonedRequest.json()) as PluginInputs,
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
        bypassSignatureVerification: true,
      }
    );

    honoApp.post("/callback", async (c) => {
      if (typeof validatedEnv === "object" && "error" in validatedEnv && validatedEnv.error) {
        return c.json({ message: validatedEnv.error }, 500);
      }

      // Validate the worker secret
      const authHeader = c.req.header("Authorization");
      const expectedSecret = validatedEnv.WORKER_SECRET;
      if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== expectedSecret) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const body = await c.req.json();
      const event = c.req.header("X-GitHub-Event") as SupportedCustomEvents;
      logger.info(`Received callback for event: ${event}`, {
        body,
        event,
      });

      // Handle custom events (server.restart, etc.)
      if (isCustomEventGuard(event)) {
        try {
          const validatedPayload = validateCallbackPayload({ payload: body, logger, event });

          async function fetchMergedConfig(): Promise<PluginSettings> {
            return {
              executionBranch: "development",
            } as PluginSettings;
          }

          const config = await fetchMergedConfig();

          // Route to appropriate handler via runSymbiote
          const results = await runSymbiote(
            {
              eventName: event,
              request: clonedRequest,
              commentHandler: new CommentHandler(),
              config,
              env: validatedEnv,
              logger: new Logs(validatedEnv.LOG_LEVEL as LogLevel),
              payload: validatedPayload,
              octokit: new customOctokit({
                auth: validatedPayload.client_payload.authToken,
              }),
              command: null,
              pluginInputs: {
                stateId: validatedPayload.client_payload.stateId,
                eventName: event,
                eventPayload: validatedPayload,
                settings: config,
                ref: validatedPayload.client_payload.ref,
                command: validatedPayload.client_payload.command,
                authToken: validatedPayload.client_payload.authToken,
                signature: validatedPayload.client_payload.signature,
              },
            } as Context<typeof event, "worker">,
            "worker"
          );

          
          return c.json({ ...results }, results.status as ContentfulStatusCode);
        } catch (error) {
          logger.error(`Error handling callback: ${error}`);
          return c.json({ message: error instanceof Error ? error.message : String(error) }, 500);
        }
      }

      // For webhook events, just acknowledge
      return c.body(JSON.stringify({ message: "Callback received" }), 200);
    });

    return honoApp.fetch(request, env, executionCtx);
  },
};
