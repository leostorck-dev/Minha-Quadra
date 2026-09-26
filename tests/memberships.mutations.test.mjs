import assert from "node:assert/strict";
import test from "node:test";
import { saveAndRefresh } from "../src/features/memberships/mutations.ts";

test("confirmed payment survives a subsequent refresh failure without resubmitting", async () => {
  let payments = 0;
  const result = await saveAndRefresh(
    async () => {
      payments++;
    },
    async () => {
      throw new Error("Read failed");
    },
  );
  assert.deepEqual(result, { refreshed: false });
  assert.equal(payments, 1);
});

test("rejected payment propagates its error and does not refresh", async () => {
  let reads = 0;
  await assert.rejects(
    () =>
      saveAndRefresh(
        async () => {
          throw new Error("Payment rejected");
        },
        async () => {
          reads++;
        },
      ),
    /Payment rejected/,
  );
  assert.equal(reads, 0);
});

test("successful mutation refreshes only after saving", async () => {
  const calls = [];
  assert.deepEqual(
    await saveAndRefresh(
      async () => {
        calls.push("save");
      },
      async () => {
        calls.push("refresh");
      },
    ),
    { refreshed: true },
  );
  assert.deepEqual(calls, ["save", "refresh"]);
});

import { saveAndRefresh as saveClassAndRefresh } from "../src/lib/api/save-and-refresh.ts";
test("recuperação de aula ou comissão repete apenas leitura após gravação confirmada", async () => {
  let writes = 0,
    reads = 0;
  const refresh = async () => {
    reads++;
    if (reads === 1) throw Error("Offline");
  };
  const result = await saveClassAndRefresh(async () => {
    writes++;
  }, refresh);
  assert.equal(result.refreshed, false);
  await refresh();
  assert.equal(writes, 1);
  assert.equal(reads, 2);
});
