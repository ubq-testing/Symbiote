import { ExecutionContext } from "hono";
import { WorkerEnv } from "./types/env";
import { createOAuthCallbackRoute } from "./handlers/worker/routes/oauth/callback-route";
import { createCallbackRoute } from "./handlers/worker/routes/server/callback-route";
import { createKernelCallbackRoute } from "./handlers/worker/routes/kernel/callback-route";
import {
  createTelegramWebhookRoute,
  initializeTelegramWebhook,
} from "./handlers/worker/routes/telegram/webhook-route";
import { setupEnvironment } from "./utils/env";

export default {
  async fetch(request: Request, env: WorkerEnv, executionCtx?: ExecutionContext) {
    const { clonedRequest, logger, validatedEnv } = await setupEnvironment(request, env, executionCtx);

    if (typeof validatedEnv === "object" && "error" in validatedEnv && validatedEnv.error) {
      return new Response(JSON.stringify({ message: validatedEnv.error }), { status: 500 });
    }

    const honoApp = await createKernelCallbackRoute({ validatedEnv, clonedRequest, env });

    honoApp.post("/callback", async (ctx) => createCallbackRoute({ ctx, clonedRequest, validatedEnv, logger }));

    honoApp.get("/oauth/callback", async (ctx) => createOAuthCallbackRoute({ ctx, validatedEnv, logger }));

    // Telegram webhook endpoint - receives updates from Telegram
    honoApp.post("/telegram", async (ctx) => createTelegramWebhookRoute({ ctx, validatedEnv, logger }));

    // Telegram initialization endpoint - registers webhook with Telegram API
    // Call this once after deployment: POST /telegram/init
    honoApp.post("/telegram/init", async (ctx) => {
      const result = await initializeTelegramWebhook(validatedEnv, logger);
      if (!result.ok) {
        return ctx.json({ ok: false, error: result.error }, 500);
      }
      return ctx.json({ ok: true, message: "Telegram webhook initialized" }, 200);
    });

    // Health check that also shows telegram webhook status
    honoApp.get("/health", async (ctx) => {
      return ctx.json({
        ok: true,
        telegram: validatedEnv.TELEGRAM ? "configured" : "not configured",
      });
    });

    return honoApp.fetch(request, env, executionCtx);
  },
};
