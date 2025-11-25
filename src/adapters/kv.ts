import { AtomicOperation, Kv, KvCommitResult, KvConsistencyLevel, KvEntryMaybe, KvKey, KvKeyPart} from "@deno/kv";
import { WorkerEnv, WorkflowEnv } from "../types/index";

function isLocalOrWorkflowEnv(env: WorkflowEnv | WorkerEnv): env is WorkflowEnv & { NODE_ENV: "local" } {
  return "GITHUB_RUN_ID" in env || env.NODE_ENV === "local" || env.NODE_ENV === "development";
}

export class KvAdapter {
  private _kv: Kv | Deno.Kv;
  constructor(kv: Kv | Deno.Kv) {
    this._kv = kv;
  }

  async get<T = unknown>(key: KvKey, options?: { consistency?: KvConsistencyLevel }){
    return await this._kv.get<T>(key, options);
  }

  async set(key: KvKey, value: unknown): Promise<KvCommitResult> {
    return await this._kv.set(key, value);
  }

  async delete(key: KvKey): Promise<void> {
    await this._kv.delete(key);
  }

  async close(): Promise<void> {
    return this._kv.close();
  }

  list<T = unknown>(options: { prefix: KvKeyPart[]; end: KvKey }) {
    return this._kv.list(options);
  }

  watch<T extends readonly unknown[]>(
    keys: readonly [...{ [K in keyof T]: KvKey }],
    options?: { raw?: boolean | undefined }
  ) {
    return this._kv.watch(keys, options);
  }

  getMany<T extends readonly unknown[]>(
    keys: readonly [...{ [K in keyof T]: KvKey }],
    options?: { consistency?: KvConsistencyLevel }
  ) {
    return this._kv.getMany(keys, options);
  }

  atomic(): AtomicOperation {
    return this._kv.atomic();
  }

  enqueue(value: unknown, options?: { delay?: number; keysIfUndelivered?: KvKey[] }) {
    return this._kv.enqueue(value, options);
  }

  listenQueue(handler: (value: unknown) => Promise<void> | void): Promise<void> {
    return this._kv.listenQueue(handler);
  }

  [Symbol.dispose](): void {
    this._kv.close();
  }
}

export async function createKvAdapter(env: WorkflowEnv | WorkerEnv): Promise<KvAdapter> {
  // First check if we're in Deno runtime - if so, use the built-in KV API
  if (typeof Deno !== "undefined" && Deno.openKv) {
    const kv = await Deno.openKv();
    if (!kv) {
      throw new Error("Failed to open Deno KV");
    }
    return new KvAdapter(kv);
  }

  /**
   * If we're not in Deno runtime (e.g., Node.js in local dev or GitHub Actions),
   * and the environment is a local or workflow environment, we can use the DENO_KV_UUID
   * to open the KV store remotely, this way all environments can use the same KV store.
   */
  if (isLocalOrWorkflowEnv(env)) {
    const { openKv } = await import("@deno/kv");
    const { DENO_KV_UUID } = env;
    return new KvAdapter(await openKv(`https://api.deno.com/databases/${DENO_KV_UUID}/connect`));
  }

  throw new Error("KV store is not available");
}
