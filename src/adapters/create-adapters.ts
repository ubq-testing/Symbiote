import { WorkerEnv, WorkflowEnv } from "../types/index";
import { PluginSettings } from "../types/plugin-input";
import { createKvAdapter, KvAdapter } from "./kv";
import { AiAdapter, createAiAdapter } from "./ai";

export interface Adapters {
  kv: KvAdapter;
  ai?: AiAdapter | null;
}

export async function createAdapters(env: WorkflowEnv | WorkerEnv, config: PluginSettings): Promise<Adapters> {
  const [kv, ai] = await Promise.all([createKvAdapter(env), createAiAdapter(env, config)]);

  return {
    kv,
    ai,
  };
}