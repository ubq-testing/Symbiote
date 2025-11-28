import { LogLevel, Logs } from "@ubiquity-os/ubiquity-os-logger";
import { PluginSettings, pluginSettingsSchema, SupportedCustomEvents ,Context, CustomContext, SupportedEvents, WorkerEnv } from "../../../../types/index";
import { isCustomEventGuard } from "../../../../types/typeguards";
import { Context as HonoContext } from "hono";
import { validateCallbackPayload } from "../../../../utils/validate-payload";
import { Value } from "@sinclair/typebox/value";
import { CommentHandler } from "@ubiquity-os/plugin-sdk";
import { runSymbiote } from "../../../../index";
import { createAdapters } from "../../../../adapters/create-adapters";
import { createAppOctokit, createUserOctokit } from "../../../octokit";

export async function createCallbackRoute({
    ctx,
    validatedEnv,
    logger,
    clonedRequest
  }:{
    ctx: HonoContext;
    validatedEnv: WorkerEnv;
    logger: Logs;
    clonedRequest: Request;
  }){
    // Validate the worker secret
    const authHeader = ctx.req.header("Authorization");
    const expectedSecret = validatedEnv.WORKER.SECRET;
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== expectedSecret) {
      return ctx.json({ message: "Unauthorized" }, 401);
    }
  
    const body = await ctx.req.json();
    const event = ctx.req.header("X-GitHub-Event") as SupportedCustomEvents;
    logger.info(`Received callback for event: ${event}`, {body,event});
  
    // Handle custom events (server.restart, etc.)
    if (isCustomEventGuard(event)) {
      try {
        const validatedPayload = validateCallbackPayload({ payload: body, logger, event });
  
        /**
         * Gets default plugin settings.
         * TODO: Implement proper config fetching/merging from plugin settings if needed.
         */
  
        const config = Value.Default(pluginSettingsSchema, {}) as PluginSettings;
        const adapters = await createAdapters(validatedEnv, config);
        
        // appOctokit: Authorized as the GitHub App for app-level operations (installations, etc.)
        const appOctokit = await createAppOctokit(validatedEnv);
        // hostOctokit: Authorized with host PAT for polling events/notifications
        const hostOctokit = appOctokit;
        // symbioteOctokit: Authorized with OAuth token to act on behalf of the user (comments, PRs, issues)
        const symbioteOctokit = await createUserOctokit(validatedPayload.client_payload.authToken);
  
        // Route to appropriate handler via runSymbiote
        const results = await runSymbiote<SupportedEvents, "worker">({
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
          symbioteOctokit,
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
        } as Context<typeof event, "worker">);
  
        return ctx.json({ ...results }, results.status as never);
      } catch (error) {
        logger.error(`Error handling callback: ${error}`);
        return ctx.json({ message: error instanceof Error ? error.message : String(error) }, 500);
      }
    }
  
    // For webhook events, just acknowledge
    return ctx.body(JSON.stringify({ message: "Callback received" }), 200);
  }
  