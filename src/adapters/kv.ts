import { AtomicOperation, Kv, KvCommitResult, KvConsistencyLevel, KvEntryMaybe, KvKey, KvKeyPart, KvListIterator } from "@deno/kv";

export class KvAdapter implements Kv {
  private _kv: Kv;
  constructor(kv: Kv) {
    this._kv = kv;
  }

  async get<T = unknown>(key: KvKey, options?: { consistency?: KvConsistencyLevel; }): Promise<KvEntryMaybe<T>> {
    return await this._kv.get(key, options);
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

  list<T = unknown>(options: { prefix: KvKeyPart[]; end: KvKey }): KvListIterator<T> {
    return this._kv.list(options)
  }

  watch<T extends readonly unknown[]>(keys: readonly [...{ [K in keyof T]: KvKey; }], options?: { raw?: boolean | undefined; }): ReadableStream<{ [K in keyof T]: KvEntryMaybe<T[K]>; }> {
    return this._kv.watch(keys, options);
  }

  getMany<T extends readonly unknown[]>(keys: readonly [...{ [K in keyof T]: KvKey; }], options?: { consistency?: KvConsistencyLevel; }): Promise<{ [K in keyof T]: KvEntryMaybe<T[K]>; }> {
      return this._kv.getMany(keys, options);
  }

  atomic(): AtomicOperation {
      return this._kv.atomic();
  }

  enqueue(value: unknown, options?: { delay?: number; keysIfUndelivered?: KvKey[]; }): Promise<KvCommitResult> {
      return this._kv.enqueue(value, options);
  }

  listenQueue(handler: (value: unknown) => Promise<void> | void): Promise<void> {
      return this._kv.listenQueue(handler);
  }

  [Symbol.dispose](): void {
    this._kv.close();
  }
}

export async function createKvAdapter(): Promise<KvAdapter> {
  // @ts-expect-error - Deno isn't defined without having the DenoLand extension installed or within the runtime
  if (typeof Deno !== "undefined" && Deno.openKv) {
    // @ts-expect-error - Deno isn't defined without having the DenoLand extension installed or within the runtime
    const kv = await Deno.openKv();
    if (!kv) {
      throw new Error("Failed to open Deno KV");
    }
    return new KvAdapter(kv);
  }

  throw new Error("KV store is not available");
}
