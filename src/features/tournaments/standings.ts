type Entry = { team_id: string; team_label: string };
type Match = {
  team_a_id: string;
  team_b_id: string;
  score_a: number | null;
  score_b: number | null;
};

export function groupStandings(
  entries: Entry[],
  matches: Match[],
  tiebreakOrder?: string[],
) {
  const resolved =
    !!tiebreakOrder &&
    tiebreakOrder.length === entries.length &&
    new Set(tiebreakOrder).size === entries.length &&
    entries.every((e) => tiebreakOrder.includes(e.team_id)) &&
    matches.every((m) => m.score_a !== null && m.score_b !== null);
  const rows = entries.map((entry) => ({
    teamId: entry.team_id,
    label: entry.team_label,
    played: 0,
    wins: 0,
    losses: 0,
    scored: 0,
    conceded: 0,
    difference: 0,
    rank: 0,
  }));
  for (const match of matches) {
    if (match.score_a === null || match.score_b === null) continue;
    const a = rows.find((row) => row.teamId === match.team_a_id);
    const b = rows.find((row) => row.teamId === match.team_b_id);
    if (!a || !b) continue;
    a.played++;
    b.played++;
    a.scored += match.score_a;
    a.conceded += match.score_b;
    b.scored += match.score_b;
    b.conceded += match.score_a;
    if (match.score_a > match.score_b) {
      a.wins++;
      b.losses++;
    } else {
      b.wins++;
      a.losses++;
    }
  }
  for (const row of rows) row.difference = row.scored - row.conceded;
  rows.sort(
    (a, b) =>
      b.wins - a.wins ||
      b.difference - a.difference ||
      b.scored - a.scored ||
      (resolved
        ? tiebreakOrder!.indexOf(a.teamId) - tiebreakOrder!.indexOf(b.teamId)
        : 0) ||
      a.teamId.localeCompare(b.teamId),
  );
  for (let i = 0; i < rows.length; i++) {
    const previous = rows[i - 1],
      row = rows[i];
    row.rank =
      !resolved &&
      previous &&
      row.wins === previous.wins &&
      row.difference === previous.difference &&
      row.scored === previous.scored
        ? previous.rank
        : i + 1;
  }
  return rows;
}
