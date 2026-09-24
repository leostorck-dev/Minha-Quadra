import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import {
  COURT_READ_ROLES,
  COURT_WRITE_ROLES,
} from "@/features/courts/permissions";
import { createCourt, listCourts } from "@/features/courts/service";
import {
  parseCourtCreate,
  parseCourtSearch,
} from "@/features/courts/validation";

export async function GET(request: Request) {
  try {
    const context = await requireRole(COURT_READ_ROLES);
    const params = new URL(request.url).searchParams;
    return privateJson(
      await listCourts(
        context,
        parseCourtSearch(params.get("q"), params.get("status")),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireRole(COURT_WRITE_ROLES);
    const court = await createCourt(
      context,
      parseCourtCreate(await request.json()),
    );
    return privateJson({ court }, 201);
  } catch (error) {
    return apiError(error);
  }
}
