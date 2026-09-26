import { groupStandings } from "./standings.ts";
import { categoryPodium } from "./podium.ts";
import type { TournamentDraw } from "./service";
export type ReportKind = "standings" | "matches" | "podium";
import { csv, type Cell } from "../../lib/export/csv.ts";
export { csv } from "../../lib/export/csv.ts";

export function tournamentReport(
  kind: ReportKind,
  tournamentName: string,
  categories: { id: string; name: string }[],
  data: TournamentDraw,
) {
  const category = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "Categoria";
  const team = (id: string | null) =>
    id
      ? (data.entries.find((e) => e.team_id === id)?.team_label ?? "Dupla")
      : "";
  const rows: Cell[][] = [];
  if (kind === "standings") {
    rows.push([
      "Torneio",
      "Categoria",
      "Grupo",
      "Situação",
      "Posição",
      "Dupla",
      "Jogos",
      "Vitórias",
      "Derrotas",
      "Pontos pró",
      "Pontos contra",
      "Saldo",
      "Desempate manual",
    ]);
    for (const group of data.groups) {
      const matches = data.matches.filter((m) => m.group_id === group.id);
      const decision = data.tiebreaks.find((t) => t.group_id === group.id);
      const status = matches.some((m) => m.score_a === null)
        ? "Parcial"
        : "Jogos concluídos";
      for (const row of groupStandings(
        data.entries.filter((e) => e.group_id === group.id),
        matches,
        decision?.team_ids,
      ))
        rows.push([
          tournamentName,
          category(group.category_id),
          group.number,
          status,
          row.rank,
          row.label,
          row.played,
          row.wins,
          row.losses,
          row.scored,
          row.conceded,
          row.difference,
          decision ? "Sim" : "Não",
        ]);
    }
  } else if (kind === "matches") {
    rows.push([
      "Torneio",
      "Categoria",
      "Fase",
      "Grupo / rodada",
      "Jogo",
      "Dupla A",
      "Dupla B",
      "Placar A",
      "Placar B",
      "Situação",
      "Vencedora",
    ]);
    for (const match of data.matches) {
      const group = data.groups.find((g) => g.id === match.group_id);
      rows.push([
        tournamentName,
        category(match.category_id),
        "Grupos",
        group?.number ?? null,
        match.number,
        team(match.team_a_id),
        team(match.team_b_id),
        match.score_a,
        match.score_b,
        match.score_a === null ? "Pendente" : "Concluído",
        match.score_a === null
          ? ""
          : team(
              match.score_a > match.score_b!
                ? match.team_a_id
                : match.team_b_id,
            ),
      ]);
    }
    for (const match of data.knockouts) {
      const bye =
        match.round === 1 &&
        match.winner_id !== null &&
        match.team_b_id === null;
      rows.push([
        tournamentName,
        category(match.category_id),
        match.stage === "bronze" ? "Terceiro lugar" : "Eliminatória",
        match.round,
        match.position,
        team(match.team_a_id),
        team(match.team_b_id),
        match.score_a,
        match.score_b,
        bye
          ? "Avanço sem adversário"
          : match.score_a !== null
            ? "Concluído"
            : !match.team_a_id || !match.team_b_id
              ? "Aguardando adversário"
              : "Pendente",
        team(match.winner_id),
      ]);
    }
  } else {
    rows.push(["Torneio", "Categoria", "Colocação", "Dupla", "Situação"]);
    for (const item of categories) {
      const matches = data.knockouts.filter((m) => m.category_id === item.id);
      const podium = categoryPodium(matches);
      for (const [position, id] of [
        [1, podium.champion],
        [2, podium.runnerUp],
        [3, podium.third],
      ] as const)
        rows.push([
          tournamentName,
          item.name,
          position,
          team(id),
          id
            ? "Definida"
            : position === 3 && !matches.some((m) => m.stage === "bronze")
              ? "Disputa não criada"
              : "Pendente",
        ]);
    }
  }
  return csv(rows);
}
