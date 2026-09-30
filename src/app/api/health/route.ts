import { privateJson } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export function GET() {
  return privateJson({ status: "ok", timestamp: new Date().toISOString() });
}
