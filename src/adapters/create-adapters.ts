import { WorkerEnv, WorkflowEnv } from "../types/index";
import { PluginSettings } from "../types/plugin-input";
import { createKvAdapter, KvAdapter } from "./kv";
import { AiAdapter, createAiAdapter } from "./ai/adapter";
import { TelegramAdapter, createTelegramAdapter } from "./telegram/adapter";

export interface Adapters {
  kv: KvAdapter;
  ai?: AiAdapter | null;
  telegram?: TelegramAdapter | null;
}

export async function createAdapters(env: WorkflowEnv | WorkerEnv, config: PluginSettings): Promise<Adapters> {
  const kv = await createKvAdapter(env);
  const telegram = await createTelegramAdapter(env, kv);
  const ai = await createAiAdapter(env, config, kv, telegram);

  return {
    kv,
    ai,
    telegram,
  };
}