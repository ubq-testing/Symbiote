import { WorkerEnv, WorkflowEnv } from "../types/index";
import { createKvAdapter, KvAdapter } from "./kv";

export interface Adapters {
  kv: KvAdapter;
}

export async function createAdapters(env: WorkflowEnv | WorkerEnv): Promise<Adapters> {
  return {
    kv: await createKvAdapter(env),
  }
}