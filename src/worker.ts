import { ExecutionContext } from "hono";
import { WorkerEnv } from "./types/env";
import { createOAuthCallbackRoute } from "./handlers/worker/routes/oauth/callback-route";
import { createCallbackRoute } from "./handlers/worker/routes/server/callback-route";
import { createKernelCallbackRoute } from "./handlers/worker/routes/kernel/callback-route";
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

    return honoApp.fetch(request, env, executionCtx);
  },
};
