import { createKvAdapter, KvAdapter } from "./kv";

export interface Adapters {
  kv: KvAdapter;
}

export async function createAdapters(): Promise<Adapters> {
  return {
    kv: await createKvAdapter(),
  }
}