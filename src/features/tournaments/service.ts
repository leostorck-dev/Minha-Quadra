import {
  collectById,
  literalSearch,
  type parseTournamentSearch,
} from "./pagination";
import type { AuthContext } from "@/lib/auth/context";
import { ForbiddenError } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  TournamentCategoryName,
  parseResult,
  parseTiebreak,
} from "./validation";

export type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
export type TournamentCategory =
  Database["public"]["Tables"]["tournament_categories"]["Row"];
export type TournamentTeam =
  Database["public"]["Tables"]["tournament_teams"]["Row"];
export type TournamentTeamMember =
  Database["public"]["Tables"]["tournament_team_members"]["Row"];
export type TournamentOverview = {
  tournaments: Tournament[];
  selected: Tournament | null;
  count: number;
  page: number;
  pageSize: number;
  categories: TournamentCategory[];
  teams: TournamentTeam[];
  members: TournamentTeamMember[];
  customers: { id: string; name: string; status: string }[];
};

export class TournamentConflictError extends Error {}
export class TournamentNotFoundError extends Error {}

function check(
  error: { code?: string; message?: string } | null,
  fallback: string,
) {
  if (!error) return;
  if (error.code === "P0002") throw new TournamentNotFoundError(error.message);
  if (error.code === "42501") throw new ForbiddenError();
  if (["22023", "23503", "23505", "23514"].includes(error.code ?? ""))
    throw new TournamentConflictError(
      error.code === "23505"
        ? "Um dos atletas já está inscrito nesta categoria."
        : (error.message ?? fallback),
    );
  throw new Error(fallback);
}

export async function overview(
  context: AuthContext,
  options: ReturnType<typeof parseTournamentSearch>,
): Promise<TournamentOverview> {
  const supabase = await createClient();
  const pageSize = 20;
  const from = (options.page - 1) * pageSize;
  let query = supabase
    .from("tournaments")
    .select("*", { count: "exact" })
    .eq("tenant_id", context.tenantId);
  if (options.query)
    query = query.ilike("name", "%" + literalSearch(options.query) + "%");
  if (options.status !== "all") query = query.eq("status", options.status);
  const tournaments = await query
    .order("starts_on", { ascending: false })
    .order("id")
    .range(from, from + pageSize - 1);
  if (tournaments.error)
    throw new Error("Não foi possível carregar os torneios.");
  let selected = tournaments.data?.[0] ?? null;
  if (options.selectedId) {
    const result = await supabase
      .from("tournaments")
      .select("*")
      .eq("tenant_id", context.tenantId)
      .eq("id", options.selectedId)
      .maybeSingle();
    if (result.error) throw new Error("Não foi possível carregar o torneio.");
    if (!result.data)
      throw new TournamentNotFoundError("Torneio não encontrado.");
    selected = result.data;
  }
  const base = {
    tournaments: tournaments.data ?? [],
    selected,
    count: tournaments.count ?? 0,
    page: options.page,
    pageSize,
  };
  if (!selected)
    return { ...base, categories: [], teams: [], members: [], customers: [] };
  const tournamentId = selected.id;
  const [categories, teams] = await Promise.all([
    supabase
      .from("tournament_categories")
      .select("*")
      .eq("tenant_id", context.tenantId)
      .eq("tournament_id", tournamentId)
      .order("name"),
    collectById<TournamentTeam>((after) => {
      let page = supabase
        .from("tournament_teams")
        .select("*")
        .eq("tenant_id", context.tenantId)
        .eq("tournament_id", tournamentId)
        .order("id")
        .limit(200);
      if (after) page = page.gt("id", after);
      return page;
    }, "Não foi possível carregar inscrições."),
  ]);
  if (categories.error)
    throw new Error("Não foi possível carregar categorias.");
  const members: TournamentTeamMember[] = [];
  for (let offset = 0; offset < teams.length; offset += 100) {
    const result = await supabase
      .from("tournament_team_members")
      .select("*")
      .eq("tenant_id", context.tenantId)
      .eq("tournament_id", tournamentId)
      .in(
        "team_id",
        teams.slice(offset, offset + 100).map((team) => team.id),
      );
    if (result.error)
      throw new Error("Não foi possível carregar os atletas inscritos.");
    members.push(...result.data);
  }
  const customerIds = [...new Set(members.map((member) => member.customer_id))];
  const customers: TournamentOverview["customers"] = [];
  for (let offset = 0; offset < customerIds.length; offset += 100) {
    const result = await supabase
      .from("customers")
      .select("id, name, status")
      .eq("tenant_id", context.tenantId)
      .in("id", customerIds.slice(offset, offset + 100));
    if (result.error)
      throw new Error("Não foi possível carregar os nomes dos atletas.");
    customers.push(...result.data);
  }
  return {
    ...base,
    categories: categories.data,
    teams: teams.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    members,
    customers,
  };
}

export async function searchAthletes(
  context: AuthContext,
  options: ReturnType<typeof parseTournamentSearch>,
) {
  const supabase = await createClient();
  const pageSize = 20;
  const from = (options.page - 1) * pageSize;
  let query = supabase
    .from("customers")
    .select("id, name", { count: "exact" })
    .eq("tenant_id", context.tenantId)
    .eq("status", "active");
  if (options.query)
    query = query.ilike("name", "%" + literalSearch(options.query) + "%");
  const result = await query
    .order("name")
    .order("id")
    .range(from, from + pageSize - 1);
  if (result.error) throw new Error("Não foi possível buscar atletas.");
  return {
    athletes: result.data,
    count: result.count ?? 0,
    page: options.page,
    pageSize,
  };
}

export async function createTournament(input: {
  name: string;
  startsOn: string;
  endsOn: string;
  categories: TournamentCategoryName[];
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_tournament", {
    p_name: input.name,
    p_starts_on: input.startsOn,
    p_ends_on: input.endsOn,
    p_categories: input.categories,
  });
  check(error, "Não foi possível criar o torneio.");
  return data;
}

export async function setTournamentStatus(
  id: string,
  status: "open" | "closed",
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_tournament_status", {
    p_id: id,
    p_status: status,
  });
  check(error, "Não foi possível alterar as inscrições.");
  return data;
}

export async function registerTeam(
  tournamentId: string,
  categoryId: string,
  customerIds: string[],
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_tournament_team", {
    p_tournament_id: tournamentId,
    p_category_id: categoryId,
    p_customer_ids: customerIds,
  });
  check(error, "Não foi possível inscrever a dupla.");
  return data;
}

export async function withdrawTeam(tournamentId: string, teamId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("withdraw_tournament_team", {
    p_tournament_id: tournamentId,
    p_team_id: teamId,
  });
  check(error, "Não foi possível retirar a dupla.");
  return data;
}

export type TournamentDraw = {
  tiebreaks: Database["public"]["Tables"]["tournament_tiebreaks"]["Row"][];
  brackets: Database["public"]["Tables"]["tournament_brackets"]["Row"][];
  knockouts: Database["public"]["Tables"]["tournament_knockout_matches"]["Row"][];
  groups: Database["public"]["Tables"]["tournament_groups"]["Row"][];
  entries: Database["public"]["Tables"]["tournament_group_teams"]["Row"][];
  matches: Database["public"]["Tables"]["tournament_matches"]["Row"][];
};

export async function getDraw(
  context: AuthContext,
  tournamentId: string,
): Promise<TournamentDraw> {
  const supabase = await createClient();
  const tournament = await supabase
    .from("tournaments")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("id", tournamentId)
    .maybeSingle();
  check(tournament.error, "Não foi possível carregar o torneio.");
  if (!tournament.data)
    throw new TournamentNotFoundError("Torneio não encontrado.");
  // Per-tournament limits cover six categories of up to 64 teams each.
  const [groups, entries, matches, brackets, knockouts, tiebreaks] =
    await Promise.all([
      supabase
        .from("tournament_groups")
        .select("*")
        .eq("tenant_id", context.tenantId)
        .eq("tournament_id", tournamentId)
        .order("number")
        .limit(192),
      supabase
        .from("tournament_group_teams")
        .select("*")
        .eq("tenant_id", context.tenantId)
        .eq("tournament_id", tournamentId)
        .order("position")
        .limit(384),
      supabase
        .from("tournament_matches")
        .select("*")
        .eq("tenant_id", context.tenantId)
        .eq("tournament_id", tournamentId)
        .order("number")
        .limit(576),
      supabase
        .from("tournament_brackets")
        .select("*")
        .eq("tenant_id", context.tenantId)
        .eq("tournament_id", tournamentId)
        .limit(6),
      supabase
        .from("tournament_knockout_matches")
        .select("*")
        .eq("tenant_id", context.tenantId)
        .eq("tournament_id", tournamentId)
        .order("round")
        .order("position")
        .limit(384),
      supabase
        .from("tournament_tiebreaks")
        .select("*")
        .eq("tenant_id", context.tenantId)
        .eq("tournament_id", tournamentId)
        .eq("status", "active")
        .limit(192),
    ]);
  if (
    groups.error ||
    entries.error ||
    matches.error ||
    brackets.error ||
    knockouts.error ||
    tiebreaks.error
  )
    throw new Error("Não foi possível carregar grupos e confrontos.");
  return {
    tiebreaks: tiebreaks.data ?? [],
    brackets: brackets.data ?? [],
    knockouts: knockouts.data ?? [],
    groups: groups.data ?? [],
    entries: entries.data ?? [],
    matches: matches.data ?? [],
  };
}

export async function drawCategory(
  tournamentId: string,
  categoryId: string,
  groupSize: number,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("draw_tournament_category", {
    p_tournament_id: tournamentId,
    p_category_id: categoryId,
    p_group_size: groupSize,
  });
  check(error, "Não foi possível sortear a categoria.");
  return data;
}

export async function recordResult(
  tournamentId: string,
  matchId: string,
  input: ReturnType<typeof parseResult>,
  knockout = false,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    knockout ? "record_knockout_result" : "record_tournament_result",
    {
      p_tournament_id: tournamentId,
      p_match_id: matchId,
      // Supabase's generated RPC types omit nullable parameters; null clears a result.
      p_score_a: input.scoreA!,
      p_score_b: input.scoreB!,
      p_expected_version: input.expectedVersion,
      p_reason: input.reason,
    },
  );
  check(error, "Não foi possível salvar o resultado.");
  return data;
}

export async function resultHistory(
  context: AuthContext,
  tournamentId: string,
  matchId: string,
  knockout = false,
) {
  const supabase = await createClient();
  const match = await supabase
    .from(knockout ? "tournament_knockout_matches" : "tournament_matches")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("tournament_id", tournamentId)
    .eq("id", matchId)
    .maybeSingle();
  check(match.error, "Não foi possível consultar o confronto.");
  if (!match.data)
    throw new TournamentNotFoundError("Confronto não encontrado.");
  const { data, error } = await supabase
    .from(
      knockout ? "tournament_knockout_history" : "tournament_result_history",
    )
    .select("version,score_a,score_b,reason,recorded_at")
    .eq("tenant_id", context.tenantId)
    .eq("tournament_id", tournamentId)
    .eq("match_id", matchId)
    .order("version", { ascending: false })
    .limit(50);
  check(error, "Não foi possível consultar o histórico.");
  return data;
}

export async function createBracket(
  tournamentId: string,
  categoryId: string,
  qualifiers: number,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_tournament_bracket", {
    p_tournament_id: tournamentId,
    p_category_id: categoryId,
    p_qualifiers: qualifiers,
  });
  check(error, "Não foi possível gerar a chave.");
  return data;
}

export async function resolveTie(
  tournamentId: string,
  groupId: string,
  input: ReturnType<typeof parseTiebreak>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_tournament_tie", {
    p_tournament_id: tournamentId,
    p_group_id: groupId,
    p_team_ids: input.teamIds,
    p_expected_version: input.expectedVersion,
    p_reason: input.reason,
  });
  check(error, "Não foi possível registrar o desempate.");
  return data;
}

export async function createBronze(tournamentId: string, categoryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_tournament_bronze", {
    p_tournament_id: tournamentId,
    p_category_id: categoryId,
  });
  check(error, "Não foi possível criar a disputa de terceiro lugar.");
  return data;
}

export async function tiebreakHistory(
  context: AuthContext,
  tournamentId: string,
  groupId: string,
) {
  const supabase = await createClient();
  const group = await supabase
    .from("tournament_groups")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("tournament_id", tournamentId)
    .eq("id", groupId)
    .maybeSingle();
  check(group.error, "Não foi possível consultar o grupo.");
  if (!group.data) throw new TournamentNotFoundError("Grupo não encontrado.");
  const { data, error } = await supabase
    .from("tournament_tiebreaks")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("tournament_id", tournamentId)
    .eq("group_id", groupId)
    .order("version", { ascending: false })
    .limit(50);
  check(error, "Não foi possível consultar o histórico.");
  return data;
}
