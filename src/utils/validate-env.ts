import { Value } from "@sinclair/typebox/value";
import { WorkerEnv, workerEnvSchema, WorkflowEnv, workflowEnvSchema } from "../types/env";
import { SymbioteRuntime } from "../types";
import { env as honoEnv } from "hono/adapter";

export function validateEnvironment(env: Parameters<typeof honoEnv>[0], runtime: SymbioteRuntime) {
    const schema = runtime === "worker" ? workerEnvSchema : workflowEnvSchema;
    const cleanedEnv = Value.Clean(schema, env);
    if (!Value.Check(schema, cleanedEnv)) {
      const errors = [...Value.Errors(schema, cleanedEnv)];
      console.error(errors);
      throw new Error(`Invalid environment variables: ${errors.map((error) => error.message).join(", ")}`);
    }
  
    return Value.Decode(schema, Value.Default(schema, cleanedEnv));
  }
  