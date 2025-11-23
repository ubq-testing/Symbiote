import { Value } from "@sinclair/typebox/value";
import { workerEnvSchema, workflowEnvSchema } from "../types/env";
import { SymbioteRuntime } from "../types";
import { env as honoEnv } from "hono/adapter";
import { StaticDecode } from "@sinclair/typebox";

export function validateEnvironment(env: Parameters<typeof honoEnv>[0], runtime: SymbioteRuntime) {
  const schema = runtime === "worker" ? workerEnvSchema : workflowEnvSchema;
  let cleanedEnv: StaticDecode<typeof schema> | undefined;
  try {
    cleanedEnv = Value.Clean(schema, env) as StaticDecode<typeof schema>;
  }catch(error: unknown) {
    if(error instanceof Error) {
      console.error("Error cleaning environment:", error.message);
      throw new Error(`Invalid environment variables: ${error.message}`);
    }
    console.error("Error cleaning environment:", error);
  }
  console.log("Cleaned environment:", cleanedEnv);

  if (!Value.Check(schema, cleanedEnv)) {
    const errors = [...Value.Errors(schema, cleanedEnv)];
    console.error(errors);
    throw new Error(`Invalid environment variables: ${errors.map((error) => error.message).join(", ")}`);
  }

  return Value.Decode(schema, Value.Default(schema, cleanedEnv));
}
