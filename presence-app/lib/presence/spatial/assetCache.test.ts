import test from "node:test";
import assert from "node:assert/strict";
import { SpatialComponentCache } from "./assetCache.ts";

const componentRef = { componentId: "presence.piece-plane", version: "1.0.0" } as const;

test("synchronous component templates are created once and own their cache disposer", () => {
  const cache = new SpatialComponentCache();
  let factoryCalls = 0;
  let disposeCalls = 0;
  const factory = () => {
    factoryCalls += 1;
    return { template: "piece-plane" };
  };

  const first = cache.getOrCreate(componentRef, factory, () => {
    disposeCalls += 1;
  });
  const second = cache.getOrCreate(componentRef, factory, () => {
    disposeCalls += 1;
  });

  assert.equal(factoryCalls, 1);
  assert.equal(first, second);
  assert.equal(cache.peek(componentRef), first);
  assert.equal(cache.delete(componentRef), true);
  assert.equal(disposeCalls, 1);
});

test("failed asynchronous loads and synchronous factories can be retried", async () => {
  const cache = new SpatialComponentCache();
  let asyncAttempts = 0;
  await assert.rejects(
    cache.getOrLoad(componentRef, async () => {
      asyncAttempts += 1;
      throw new Error("first load failed");
    }),
    /first load failed/,
  );
  assert.equal(cache.has(componentRef), false);
  const loaded = await cache.getOrLoad(componentRef, async () => {
    asyncAttempts += 1;
    return { loaded: true };
  });
  assert.equal(asyncAttempts, 2);
  assert.deepEqual(loaded, { loaded: true });

  cache.delete(componentRef);
  let syncAttempts = 0;
  assert.throws(
    () => cache.getOrCreate(componentRef, () => {
      syncAttempts += 1;
      throw new Error("first factory failed");
    }),
    /first factory failed/,
  );
  assert.equal(cache.has(componentRef), false);
  assert.deepEqual(
    cache.getOrCreate(componentRef, () => {
      syncAttempts += 1;
      return { created: true };
    }),
    { created: true },
  );
  assert.equal(syncAttempts, 2);
});

test("deleting or clearing a pending load disposes its value when the load settles", async () => {
  const deletedCache = new SpatialComponentCache();
  let resolveDeleted!: (value: { id: string }) => void;
  const deletedLoad = deletedCache.getOrLoad(componentRef, () => new Promise((resolve) => {
    resolveDeleted = resolve;
  }));
  await Promise.resolve();
  const deletedValues: unknown[] = [];
  assert.equal(deletedCache.delete(componentRef, (value) => deletedValues.push(value)), true);
  assert.equal(deletedCache.size, 0);
  resolveDeleted({ id: "deleted-pending" });
  await deletedLoad;
  await Promise.resolve();
  assert.deepEqual(deletedValues, [{ id: "deleted-pending" }]);

  const clearedCache = new SpatialComponentCache();
  let resolveCleared!: (value: { id: string }) => void;
  const clearedLoad = clearedCache.getOrLoad(componentRef, () => new Promise((resolve) => {
    resolveCleared = resolve;
  }));
  await Promise.resolve();
  const clearedValues: Array<{ value: unknown; key: string }> = [];
  clearedCache.clear((value, key) => clearedValues.push({ value, key }));
  assert.equal(clearedCache.size, 0);
  resolveCleared({ id: "cleared-pending" });
  await clearedLoad;
  await Promise.resolve();
  assert.deepEqual(clearedValues, [{ value: { id: "cleared-pending" }, key: "presence.piece-plane@1.0.0" }]);
});

test("clear removes every entry and runs every disposer even when one throws", () => {
  const cache = new SpatialComponentCache();
  const disposed: string[] = [];
  cache.getOrCreate(componentRef, () => ({ id: "first" }), (value) => {
    disposed.push(value.id);
    throw new Error("first disposer failed");
  });
  cache.getOrCreate({ ...componentRef, version: "2.0.0" }, () => ({ id: "second" }), (value) => {
    disposed.push(value.id);
  });

  assert.throws(() => cache.clear(), AggregateError);
  assert.equal(cache.size, 0);
  assert.deepEqual(disposed, ["first", "second"]);
});
