import assert from "node:assert/strict";
import test from "node:test";
import {
  parseTeam,
  parseTournament,
  parseTournamentStatus,
  parseWithdraw,
  parseDraw,
  parseBracket,
} from "../src/features/tournaments/validation.ts";

const first = "a9393939-aaaa-4939-8939-393939393931";
const second = "b9393939-bbbb-4939-8939-393939393932";

test("eliminatória restringe classificadas e identidade", () => {
  assert.deepEqual(parseBracket({ categoryId: first, qualifiers: 2 }), {
    categoryId: first,
    qualifiers: 2,
  });
  for (const qualifiers of [0, 3, 1.5, "1", null])
    assert.throws(() => parseBracket({ categoryId: first, qualifiers }));
  assert.throws(() =>
    parseBracket({ categoryId: first, qualifiers: 1, tenantId: second }),
  );
});

test("sorteio aceita apenas categoria e tamanhos suportados", () => {
  assert.deepEqual(parseDraw({ categoryId: first, groupSize: 3 }), {
    categoryId: first,
    groupSize: 3,
  });
  assert.equal(parseDraw({ categoryId: first, groupSize: 4 }).groupSize, 4);
  for (const groupSize of [null, 0, 2, 5, 3.5, "3"]) {
    assert.throws(() => parseDraw({ categoryId: first, groupSize }));
  }
  assert.throws(() => parseDraw({ categoryId: "bad", groupSize: 3 }));
  assert.throws(() =>
    parseDraw({ categoryId: first, groupSize: 3, tenantId: second }),
  );
});

test("torneio valida datas e categorias", () => {
  const valid = parseTournament({
    name: " Torneio de duplas ",
    startsOn: "2026-10-10",
    endsOn: "2026-10-11",
    categories: ["Open", "Mista"],
  });
  assert.equal(valid.name, "Torneio de duplas");
  assert.throws(() =>
    parseTournament({
      name: "Torneio",
      startsOn: "2026-02-30",
      endsOn: "2026-03-01",
      categories: ["Open"],
    }),
  );
  assert.throws(() =>
    parseTournament({
      name: "Torneio",
      startsOn: "2026-10-11",
      endsOn: "2026-10-10",
      categories: ["Open"],
    }),
  );
  assert.throws(() =>
    parseTournament({
      name: "Torneio",
      startsOn: "2026-10-10",
      endsOn: "2026-10-11",
      categories: ["Open", "Open"],
    }),
  );
});

test("inscrição exige dois clientes diferentes e campos exatos", () => {
  assert.deepEqual(
    parseTeam({ categoryId: first, customerIds: [first, second] }),
    {
      categoryId: first,
      customerIds: [first, second],
    },
  );
  assert.throws(() =>
    parseTeam({ categoryId: first, customerIds: [first, first] }),
  );
  assert.throws(() => parseTeam({ categoryId: first, customerIds: [first] }));
  assert.throws(() =>
    parseTeam({
      categoryId: first,
      customerIds: [first, second],
      tenantId: second,
    }),
  );
  assert.equal(parseTournamentStatus({ status: "open" }), "open");
  assert.throws(() => parseTournamentStatus({ status: "cancelled" }));
  assert.throws(() => parseWithdraw({ status: "registered" }));
});
