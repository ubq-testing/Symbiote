import { Logs } from "@ubiquity-os/ubiquity-os-logger";
import { Context as HonoContext } from "hono";
import { finalizeOAuthCallback } from "./backend";
import { renderOAuthResultPage } from "./frontend";
import { WorkerEnv } from "../../../../types";
import { createKvAdapter } from "../../../../adapters/kv";
import { createAppOctokit } from "../../../octokit";

export async function createOAuthCallbackRoute({ ctx, validatedEnv, logger }: { ctx: HonoContext; validatedEnv: WorkerEnv; logger: Logs }) {
  {
    const code = ctx.req.query("code");
    const state = ctx.req.query("state");

    if (!code || !state) {
      return ctx.text("Missing code or state", 400);
    }

    try {
      const kv = await createKvAdapter(validatedEnv);
      const appOctokit = await createAppOctokit(validatedEnv);
      await finalizeOAuthCallback({
        kv,
        env: validatedEnv,
        code,
        state,
        logger,
        appOctokit,
      });

      return ctx.html(
        renderOAuthResultPage({
          title: "Authorization complete",
          status: "success",
          message: "Symbiote is now authorized and can act on your behalf. Close this window and return to GitHub to continue the flow.",
        }),
        200
      );
    } catch (error) {
      logger.error("OAuth callback failed", { e: error });
      const errorMessage = error instanceof Error ? error.message : String(error);
      return ctx.html(
        renderOAuthResultPage({
          title: "Authorization failed",
          status: "error",
          message: "Something went wrong while finalizing authorization. Please retry the GitHub App flow.",
          detail: errorMessage,
        }),
        400
      );
    }
  }
}