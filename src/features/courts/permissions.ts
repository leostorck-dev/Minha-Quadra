import type { Role } from "@/lib/auth/context";

export const COURT_READ_ROLES: readonly Role[] = [
  "OWNER",
  "MANAGER",
  "RECEPTIONIST",
  "COACH",
];
export const COURT_WRITE_ROLES: readonly Role[] = ["OWNER", "MANAGER"];
