import assert from "node:assert/strict";
import test from "node:test";
import {
  collectById,
  literalSearch,
  parseTournamentSearch,
} from "../src/features/tournaments/pagination.ts";

test("tournament search validates pages, filters and selected tournament", () => {
  assert.deepEqual(parseTournamentSearch(new URLSearchParams()), {
    query: "",
    page: 1,
    status: "all",
    selectedId: null,
  });
  const selectedId = "a9393939-aaaa-4939-8939-393939393931";
  assert.deepEqual(
    parseTournamentSearch(
      new URLSearchParams({
        q: "  Open  ",
        page: "6",
        status: "closed",
        selectedId,
      }),
    ),
    {
      query: "Open",
      page: 6,
      status: "closed",
      selectedId,
    },
  );
  for (const page of ["0", "-1", "1.5", "abc", "10001", ""]) {
    assert.throws(() => parseTournamentSearch(new URLSearchParams({ page })));
  }
  for (const params of [
    { q: "x".repeat(81) },
    { status: "unknown" },
    { selectedId: "invalid" },
  ]) {
    assert.throws(() => parseTournamentSearch(new URLSearchParams(params)));
  }
  assert.equal(literalSearch("50%_Open\\A"), "50\\%\\_Open\\\\A");
});

test("keyset loading retains all 1105 registrations even if server pages are smaller than requested", async () => {
  const source = Array.from({ length: 1105 }, (_, i) => ({
    id: String(i).padStart(6, "0"),
  }));
  let calls = 0;
  const actual = await collectById(async (after) => {
    calls++;
    return {
      data: source
        .filter((row) => after === null || row.id > after)
        .slice(0, 73),
      error: null,
    };
  }, "failed");
  assert.deepEqual(actual, source);
  assert.equal(calls, 17);
});

test("keyset loading fails as a whole on later page errors and refuses a stuck cursor", async () => {
  await assert.rejects(
    () =>
      collectById(
        async (after) =>
          after === null
            ? { data: [{ id: "a" }], error: null }
            : { data: null, error: { message: "network" } },
        "Incomplete results",
      ),
    /Incomplete results/,
  );
  await assert.rejects(
    () =>
      collectById(async () => ({ data: [{ id: "a" }], error: null }), "Stuck"),
    /Stuck/,
  );
  assert.deepEqual(
    await collectById(async () => ({ data: [], error: null }), "failed"),
    [],
  );
});
