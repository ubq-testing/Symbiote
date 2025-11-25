import { CommentHandler, createPlugin } from "@ubiquity-os/plugin-sdk";
import { Manifest } from "@ubiquity-os/plugin-sdk/manifest";
import { LOG_LEVEL, LogLevel, Logs } from "@ubiquity-os/ubiquity-os-logger";
import { ExecutionContext } from "hono";
import manifest from "../manifest.json" with { type: "json" };
import { runSymbiote } from "./index";
import { workerEnvSchema, pluginSettingsSchema, PluginSettings, SupportedEvents, SupportedCustomEvents, SupportedWebhookEvents, CustomContext } from "./types/index";
import { WorkerEnv } from "./types/env";
import { Command } from "./types/command";
import { Value } from "@sinclair/typebox/value";
import { CustomEventSchemas, customEventSchemas } from "./types/custom-event-schemas";
import { env as honoEnv } from "hono/adapter";
import { validateEnvironment } from "./utils/validate-env";
import { PluginInputs } from "./types/callbacks";
import { Context } from "./types/index";
import { createAdapters } from "./adapters/create-adapters";
import { createAppOctokit, createUserOctokit } from "./handlers/octokit";

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
        const adapters = await createAdapters(validatedEnv);
        return runSymbiote<SupportedEvents, "worker">(
          {
            ...context,
            // TODO: Worker should only have octokit as standard
            appOctokit: context.octokit,
            hostOctokit: context.octokit,
            env: validatedEnv,
            request: clonedRequest,
            pluginInputs: (await clonedRequest.json()) as PluginInputs,
            runtime: "worker",
            adapters,
          },
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
      } as unknown as Parameters<
        typeof createPlugin<
          PluginSettings,
          WorkerEnv,
          Command,
          SupportedWebhookEvents & SupportedCustomEvents
        >
      >[2]
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

          /**
           * Gets default plugin settings.
           * TODO: Implement proper config fetching/merging from plugin settings if needed.
           */
          async function getDefaultConfig(): Promise<PluginSettings> {
            return {
              executionBranch: "development",
            } as PluginSettings;
          }

          const config = await getDefaultConfig();

          const adapters = await createAdapters(validatedEnv);

          const appOctokit = await createAppOctokit(validatedEnv);
          const hostOctokit = await createUserOctokit(validatedPayload.client_payload.authToken);

          // Route to appropriate handler via runSymbiote
          const results = await runSymbiote<SupportedEvents, "worker">(
            {
              eventName: event,
              request: clonedRequest,
              commentHandler: new CommentHandler(),
              config,
              env: validatedEnv,
              logger: new Logs(validatedEnv.LOG_LEVEL as LogLevel) as unknown as CustomContext["logger"],
              payload: validatedPayload,
              adapters,
              appOctokit,
              hostOctokit,
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
              runtime: "worker",
            } as Context<typeof event, "worker">,
          );

          
          return c.json({ ...results }, results.status as never);
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
