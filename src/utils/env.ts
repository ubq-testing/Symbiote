import { Value } from "@sinclair/typebox/value";
import { workerEnvSchema, workflowEnvSchema } from "../types/env";
import { SymbioteRuntime } from "../types/index";
import { StaticDecode } from "@sinclair/typebox";
import { createLogger } from "./logger";
import { LOG_LEVEL } from "@ubiquity-os/ubiquity-os-logger";
import { ExecutionContext } from "hono";
import { WorkerEnv } from "../types/env";
import { env as honoEnv } from "hono/adapter";

export function validateEnvironment(env: Record<string, string>, runtime: SymbioteRuntime) {
  const schema = runtime === "worker" ? workerEnvSchema : workflowEnvSchema;
  let cleanedEnv: StaticDecode<typeof schema> | undefined;
  try {
    cleanedEnv = Value.Clean(schema, env) as StaticDecode<typeof schema>;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error cleaning environment:", error.message);
      throw new Error(`Invalid environment variables: ${error.message}`);
    }
  }

  if (!Value.Check(schema, cleanedEnv)) {
    const errors = [...Value.Errors(schema, cleanedEnv)];
    console.error(errors);
    throw new Error(`Invalid environment variables: ${errors.map((error) => error.message).join(", ")}`);
  }

  return Value.Decode(schema, Value.Default(schema, cleanedEnv));
}

export async function setupEnvironment(request: Request, env: WorkerEnv, executionCtx?: ExecutionContext) {
  const logger = createLogger(env.LOG_LEVEL ?? LOG_LEVEL.INFO);
  const clonedRequest = request.clone();
  const validatedEnv = validateEnvironment(
    honoEnv({
      ...(executionCtx ?? {}),
      ...env,
    } as unknown as Parameters<typeof honoEnv>[0]),
    "worker"
  );
  return { logger, clonedRequest, validatedEnv };
}