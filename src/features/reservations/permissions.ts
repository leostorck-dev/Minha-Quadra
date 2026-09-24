import type { Role } from "@/lib/auth/context";

export const RESERVATION_READ_ROLES: readonly Role[] = [
  "OWNER",
  "MANAGER",
  "RECEPTIONIST",
  "COACH",
];
export const RESERVATION_WRITE_ROLES: readonly Role[] = [
  "OWNER",
  "MANAGER",
  "RECEPTIONIST",
];
