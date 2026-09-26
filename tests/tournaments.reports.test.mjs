import assert from "node:assert/strict";
import test from "node:test";
import { csv, tournamentReport } from "../src/features/tournaments/reports.ts";
test("CSV preserva acentos, separadores e quebras sem executar fórmulas", () => {
  const output = csv([
    [
      "São João; Quadra",
      'Nome "duplo"',
      "linha\nnova",
      " =1+1",
      "@SUM(A1)",
      "\tcomando",
      -4,
      null,
    ],
  ]);
  assert.ok(output.startsWith("\ufeff"));
  assert.ok(
    output.includes('"São João; Quadra";"Nome ""duplo""";"linha\nnova"'),
  );
  assert.ok(output.includes('"\' =1+1"'));
  assert.ok(output.includes('"\'@SUM(A1)"'));
  assert.ok(output.endsWith(';−4;""\r\n'.replace("−", "-")));
});
const data = {
  groups: [{ id: "g", category_id: "c", number: 1 }],
  entries: [
    { team_id: "a", group_id: "g", team_label: "Ana + Bia" },
    { team_id: "b", group_id: "g", team_label: "Caio + Davi" },
  ],
  matches: [
    {
      id: "m",
      category_id: "c",
      group_id: "g",
      number: 1,
      team_a_id: "a",
      team_b_id: "b",
      score_a: 6,
      score_b: 4,
    },
  ],
  brackets: [],
  knockouts: [],
  tiebreaks: [],
};
const categories = [{ id: "c", name: "Open" }];
test("exporta classificação com estatísticas e estado parcial", () => {
  const output = tournamentReport("standings", "Copa", categories, data);
  assert.ok(
    output.includes('"Jogos concluídos";1;"Ana + Bia";1;1;0;6;4;2;"Não"'),
  );
  const partial = tournamentReport("standings", "Copa", categories, {
    ...data,
    matches: [{ ...data.matches[0], score_a: null, score_b: null }],
  });
  assert.ok(partial.includes('"Parcial"'));
  assert.ok(!partial.includes('"Jogos concluídos"'));
});
test("pódio pendente não inventa colocações e partidas distinguem avanços", () => {
  assert.ok(
    tournamentReport("podium", "Copa", categories, data).includes(
      '3;"";"Disputa não criada"',
    ),
  );
  const knockout = {
    id: "k",
    category_id: "c",
    round: 1,
    position: 1,
    stage: "bracket",
    team_a_id: "a",
    team_b_id: null,
    winner_id: "a",
    score_a: null,
    score_b: null,
  };
  assert.ok(
    tournamentReport("matches", "Copa", categories, {
      ...data,
      knockouts: [knockout],
    }).includes('"Avanço sem adversário";"Ana + Bia"'),
  );
});
