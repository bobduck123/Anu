import type { SpatialComponentRef } from "./model.ts";
import { spatialComponentKey } from "./model.ts";

interface SpatialCacheEntry {
  promise: Promise<unknown>;
  value?: unknown;
  dispose?: (value: unknown) => void;
}

export class SpatialComponentCache {
  private readonly entries = new Map<string, SpatialCacheEntry>();

  get size(): number {
    return this.entries.size;
  }

  has(ref: SpatialComponentRef): boolean {
    return this.entries.has(spatialComponentKey(ref));
  }

  peek<T>(ref: SpatialComponentRef): T | undefined {
    return this.entries.get(spatialComponentKey(ref))?.value as T | undefined;
  }

  getOrLoad<T>(ref: SpatialComponentRef, loader: () => Promise<T>): Promise<T> {
    const key = spatialComponentKey(ref);
    const existing = this.entries.get(key);
    if (existing) return existing.promise as Promise<T>;
    const entry: SpatialCacheEntry = { promise: Promise.resolve(undefined) };
    entry.promise = Promise.resolve()
      .then(loader)
      .then((value) => {
        entry.value = value;
        return value;
      })
      .catch((error) => {
        if (this.entries.get(key) === entry) this.entries.delete(key);
        throw error;
      });
    this.entries.set(key, entry);
    return entry.promise as Promise<T>;
  }

  getOrCreate<T>(
    ref: SpatialComponentRef,
    factory: () => T,
    dispose?: (value: T) => void,
  ): T {
    const key = spatialComponentKey(ref);
    const existing = this.entries.get(key);
    if (existing) {
      if (!("value" in existing)) {
        throw new Error(`Spatial component ${key} is still loading asynchronously.`);
      }
      return existing.value as T;
    }

    const value = factory();
    this.entries.set(key, {
      promise: Promise.resolve(value),
      value,
      dispose: dispose as ((cachedValue: unknown) => void) | undefined,
    });
    return value;
  }

  delete<T>(ref: SpatialComponentRef, dispose?: (value: T) => void): boolean {
    const key = spatialComponentKey(ref);
    const entry = this.entries.get(key);
    if (!entry) return false;
    this.entries.delete(key);
    const disposeEntry = dispose
      ? (value: unknown) => dispose(value as T)
      : entry.dispose;
    if (disposeEntry) {
      if ("value" in entry) disposeEntry(entry.value);
      else schedulePendingDisposal(entry.promise, disposeEntry);
    }
    return true;
  }

  clear(dispose?: (value: unknown, key: string) => void): void {
    const entries = [...this.entries.entries()];
    this.entries.clear();
    const errors: unknown[] = [];
    for (const [key, entry] of entries) {
      const disposeEntry = dispose
        ? (value: unknown) => dispose(value, key)
        : entry.dispose;
      if (!disposeEntry) continue;
      if (!("value" in entry)) {
        schedulePendingDisposal(entry.promise, disposeEntry);
        continue;
      }
      try {
        disposeEntry(entry.value);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) throw new AggregateError(errors, "One or more spatial cache disposers failed.");
  }
}

function schedulePendingDisposal(
  promise: Promise<unknown>,
  dispose: (value: unknown) => void,
): void {
  void promise
    .then((value) => dispose(value))
    .catch(() => {
      // A failed load has no value to dispose; asynchronous disposer failures cannot be rethrown from a void eviction API.
    });
}

const GLOBAL_CACHE_SYMBOL: unique symbol = Symbol.for("presence.spatial.component-cache.v1") as never;
type SpatialGlobal = typeof globalThis & { [GLOBAL_CACHE_SYMBOL]?: SpatialComponentCache };
const spatialGlobal = globalThis as SpatialGlobal;

export const GLOBAL_SPATIAL_COMPONENT_CACHE = spatialGlobal[GLOBAL_CACHE_SYMBOL]
  ?? (spatialGlobal[GLOBAL_CACHE_SYMBOL] = new SpatialComponentCache());
