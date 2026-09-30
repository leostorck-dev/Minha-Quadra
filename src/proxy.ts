import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agenda/:path*",
    "/classes/:path*",
    "/tournaments/:path*",
    "/customers/:path*",
    "/courts/:path*",
    "/finance/:path*",
    "/memberships/:path*",
    "/audit/:path*",
    "/settings/:path*",
    "/api/:path*",
    "/auth/confirm",
    "/forgot-password",
    "/join",
    "/login",
    "/reset-password",
    "/signup",
    "/onboarding/:path*",
  ],
};
