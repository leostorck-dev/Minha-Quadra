import { requireRole } from "@/lib/auth/context";
import { apiError } from "@/lib/api/errors";
import { ValidationError } from "@/lib/api/validation-error";
import { uuid } from "@/features/tournaments/validation";
import {
  getDraw,
  TournamentNotFoundError,
} from "@/features/tournaments/service";
import { tournamentReport } from "@/features/tournaments/reports";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
    const id = uuid((await params).id);
    const kind = new URL(request.url).searchParams.get("kind");
    if (kind !== "standings" && kind !== "matches" && kind !== "podium")
      throw new ValidationError("Escolha um relatório válido.");
    const supabase = await createClient();
    const [tournament, categories, draw] = await Promise.all([
      supabase
        .from("tournaments")
        .select("name")
        .eq("tenant_id", context.tenantId)
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("tournament_categories")
        .select("id,name")
        .eq("tenant_id", context.tenantId)
        .eq("tournament_id", id)
        .order("name"),
      getDraw(context, id),
    ]);
    if (tournament.error || categories.error)
      throw new Error("Falha ao exportar.");
    if (!tournament.data)
      throw new TournamentNotFoundError("Torneio não encontrado.");
    return new Response(
      tournamentReport(kind, tournament.data.name, categories.data ?? [], draw),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="torneio-${id}-${kind}.csv"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
