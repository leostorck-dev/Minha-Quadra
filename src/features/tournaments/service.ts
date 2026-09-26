import type { AuthContext } from "@/lib/auth/context";
import { ForbiddenError } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { TournamentCategoryName } from "./validation";

export type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
export type TournamentCategory =
  Database["public"]["Tables"]["tournament_categories"]["Row"];
export type TournamentTeam =
  Database["public"]["Tables"]["tournament_teams"]["Row"];
export type TournamentTeamMember =
  Database["public"]["Tables"]["tournament_team_members"]["Row"];
export type TournamentOverview = {
  tournaments: Tournament[];
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
): Promise<TournamentOverview> {
  const supabase = await createClient();
  const [tournaments, customers] = await Promise.all([
    supabase
      .from("tournaments")
      .select("*")
      .eq("tenant_id", context.tenantId)
      .order("starts_on", { ascending: false })
      .limit(100),
    supabase
      .from("customers")
      .select("id, name, status")
      .eq("tenant_id", context.tenantId)
      .order("name")
      .limit(1000),
  ]);
  if (tournaments.error || customers.error)
    throw new Error("Não foi possível carregar os torneios.");
  const tournamentIds = (tournaments.data ?? []).map((item) => item.id);
  const [categories, teams] = await Promise.all([
    tournamentIds.length
      ? supabase
          .from("tournament_categories")
          .select("*")
          .eq("tenant_id", context.tenantId)
          .in("tournament_id", tournamentIds)
      : Promise.resolve({ data: [], error: null }),
    tournamentIds.length
      ? supabase
          .from("tournament_teams")
          .select("*")
          .eq("tenant_id", context.tenantId)
          .in("tournament_id", tournamentIds)
          .order("created_at", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (categories.error || teams.error)
    throw new Error("Não foi possível carregar inscrições.");
  const teamIds = (teams.data ?? []).map((item) => item.id);
  const members = teamIds.length
    ? await supabase
        .from("tournament_team_members")
        .select("*")
        .eq("tenant_id", context.tenantId)
        .in("team_id", teamIds)
        .limit(1000)
    : { data: [], error: null };
  if (members.error)
    throw new Error("Não foi possível carregar os atletas inscritos.");
  return {
    tournaments: tournaments.data ?? [],
    categories: categories.data ?? [],
    teams: teams.data ?? [],
    members: members.data ?? [],
    customers: customers.data ?? [],
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
  const [groups, entries, matches] = await Promise.all([
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
  ]);
  if (groups.error || entries.error || matches.error)
    throw new Error("Não foi possível carregar grupos e confrontos.");
  return {
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
