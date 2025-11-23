import { Value } from "@sinclair/typebox/value";
import { workerEnvSchema, workflowEnvSchema } from "../types/env";
import { SymbioteRuntime } from "../types";
import { env as honoEnv } from "hono/adapter";

export function validateEnvironment(env: Parameters<typeof honoEnv>[0], runtime: SymbioteRuntime) {
  const schema = runtime === "worker" ? workerEnvSchema : workflowEnvSchema;
  const cleanedEnv = Value.Clean(schema, env);
  console.log("Cleaned environment:", cleanedEnv);

  if(runtime === "action") {
    try {
      console.log("Process environment:", Deno.env.toObject());
    }catch(error) {
      console.error("Error getting process environment:", error);
    }
  }


  if (!Value.Check(schema, cleanedEnv)) {
    const errors = [...Value.Errors(schema, cleanedEnv)];
    console.error(errors);
    throw new Error(`Invalid environment variables: ${errors.map((error) => error.message).join(", ")}`);
  }

  return Value.Decode(schema, Value.Default(schema, cleanedEnv));
}
