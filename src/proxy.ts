import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agenda/:path*",
    "/customers/:path*",
    "/courts/:path*",
    "/api/:path*",
    "/auth/confirm",
    "/forgot-password",
    "/login",
    "/reset-password",
    "/signup",
    "/onboarding/:path*",
  ],
};
