type Match = {
  round: number;
  position: number;
  stage: string;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_id: string | null;
  score_a: number | null;
};
export function categoryPodium(matches: Match[]) {
  const bracket = matches.filter((m) => m.stage === "bracket");
  const finalRound = Math.max(0, ...bracket.map((m) => m.round));
  const final = bracket.find((m) => m.round === finalRound && m.position === 1);
  const bronze = matches.find((m) => m.stage === "bronze");
  return {
    champion: final?.score_a != null ? final.winner_id : null,
    runnerUp:
      final?.score_a != null && final.winner_id
        ? final.winner_id === final.team_a_id
          ? final.team_b_id
          : final.team_a_id
        : null,
    third: bronze?.score_a != null ? bronze.winner_id : null,
  };
}
