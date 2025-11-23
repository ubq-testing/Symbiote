import { Value } from "@sinclair/typebox/value";
import { workerEnvSchema, workflowEnvSchema } from "../types/env";
import { SymbioteRuntime } from "../types/index";
import { StaticDecode } from "@sinclair/typebox";

export function validateEnvironment(env: Record<string, string>, runtime: SymbioteRuntime) {
  const schema = runtime === "worker" ? workerEnvSchema : workflowEnvSchema;
  let cleanedEnv: StaticDecode<typeof schema> | undefined;
  try {
    cleanedEnv = Value.Clean(schema, env) as StaticDecode<typeof schema>;
  }catch(error: unknown) {
    if(error instanceof Error) {
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
