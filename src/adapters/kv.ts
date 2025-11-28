import { AtomicOperation, Kv} from "@deno/kv";
import { WorkerEnv, WorkflowEnv } from "../types/index";

export class KvAdapter {
  private _kv: Deno.Kv | Kv;
  constructor(kv: Deno.Kv | Kv) {
    this._kv = kv;
  }

  async get<T = unknown>(key: string[], options?: { consistency?: unknown }){
    return await this._kv.get<T>(key);
  } 

  async set(key: string[], value: unknown){
    return await this._kv.set(key, value);
  }

  async delete(key: string[]) {
    return await this._kv.delete(key);
  }

  async close(): Promise<void> {
    return this._kv.close();
  }

  list<T = unknown>(options: { prefix: string[]; end: string[] }) {
    return this._kv.list(options);  
  }

  watch<T extends readonly unknown[]>(
    keys: readonly [...{ [K in keyof T]: string[] }],
    options?: { raw?: boolean | undefined }
  ) {
    return this._kv.watch(keys, options);
  }

  getMany<T extends readonly unknown[]>(
    keys: readonly [...{ [K in keyof T]: string[] }],
    options?: { consistency?: unknown }
  ) {
    return this._kv.getMany(keys);
  }

  atomic(): AtomicOperation {
    return this._kv.atomic();
  }

  enqueue(value: unknown, options?: { delay?: number; keysIfUndelivered?: string[] }) {
    return this._kv.enqueue(value);
  }

  listenQueue(handler: (value: unknown) => Promise<void> | void) {
    return this._kv.listenQueue(handler);
  }

  [Symbol.dispose](): void {
    this._kv.close();
  }
}

export async function createKvAdapter(env: WorkflowEnv | WorkerEnv): Promise<KvAdapter> {
    const kv = await Deno.openKv(`https://api.deno.com/databases/${env.DENO_KV_UUID}/connect`);
    if (!kv) {
      throw new Error("Failed to open Deno KV");
    }
    return new KvAdapter(kv);
}
