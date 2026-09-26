import assert from "node:assert/strict";
import test from "node:test";
import { groupStandings } from "../src/features/tournaments/standings.ts";
import { parseResult } from "../src/features/tournaments/validation.ts";
const entries = ["a", "b", "c"].map((team_id) => ({
  team_id,
  team_label: team_id,
}));
const match = (a, b, score_a, score_b) => ({
  team_a_id: a,
  team_b_id: b,
  score_a,
  score_b,
});
test("resultados exigem placar inteiro sem empate, versão e justificativa", () => {
  const input = {
    scoreA: 6,
    scoreB: 4,
    expectedVersion: 0,
    reason: " Placar conferido ",
  };
  assert.equal(parseResult(input).reason, "Placar conferido");
  assert.equal(
    parseResult({ ...input, scoreA: null, scoreB: null }).scoreA,
    null,
  );
  for (const bad of [
    { scoreA: 4 },
    { scoreA: -1 },
    { scoreB: 100 },
    { scoreA: 2.5 },
    { scoreA: "6" },
    { scoreA: null },
    { expectedVersion: -1 },
    { expectedVersion: 0.5 },
    { reason: "" },
    { tenantId: "forged" },
  ])
    assert.throws(() => parseResult({ ...input, ...bad }));
});
test("classificação considera somente jogos concluídos e ordena por vitórias", () => {
  const rows = groupStandings(entries, [
    match("a", "b", 6, 4),
    match("a", "c", null, null),
    match("b", "c", 6, 0),
  ]);
  assert.deepEqual(
    rows.map((r) => r.teamId),
    ["b", "a", "c"],
  );
  assert.deepEqual(
    rows.map((r) => [r.played, r.wins, r.losses, r.difference]),
    [
      [2, 1, 1, 4],
      [1, 1, 0, 2],
      [1, 0, 1, -6],
    ],
  );
  const corrected = groupStandings(entries, [
    match("a", "b", 4, 6),
    match("b", "c", null, null),
  ]);
  assert.equal(corrected[0].teamId, "b");
  assert.equal(corrected[0].played, 1);
});
test("empate completo compartilha posição sem desempate arbitrário", () => {
  const rows = groupStandings(entries, [
    match("a", "b", 6, 4),
    match("b", "c", 6, 4),
    match("c", "a", 6, 4),
  ]);
  assert.deepEqual(
    rows.map((r) => r.rank),
    [1, 1, 1],
  );
  assert.deepEqual(
    groupStandings(entries, []).map((r) => r.played),
    [0, 0, 0],
  );
});
test("pontos marcados desempata saldo igual", () => {
  const rows = groupStandings(entries, [
    match("a", "b", 7, 5),
    match("b", "c", 6, 4),
    match("c", "a", 5, 3),
  ]);
  assert.deepEqual(
    rows.map((r) => r.teamId),
    ["b", "a", "c"],
  );
  assert.deepEqual(
    rows.map((r) => r.rank),
    [1, 2, 3],
  );
});
