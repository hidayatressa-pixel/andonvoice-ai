import { UserProfile } from "../types";

/**
 * Central permission engine.
 * System administration/configuration is strictly Admin-only.
 * Manager is the highest operational role and is not a system administrator.
 */
export function canManageMasterData(user: UserProfile | null | undefined): boolean {
  return user?.role === "admin";
}

export function canManageUsers(user: UserProfile | null | undefined): boolean {
  return user?.role === "admin";
}

export function canManageSettings(user: UserProfile | null | undefined): boolean {
  return user?.role === "admin";
}

export function canResetDemoData(user: UserProfile | null | undefined): boolean {
  return user?.role === "admin";
}

export function canClearLogs(user: UserProfile | null | undefined): boolean {
  return user?.role === "admin";
}

export function canResolveAndon(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return ["leader", "supervisor", "manager", "admin"].includes(user.role);
}

export function canViewReports(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return ["supervisor", "manager", "admin"].includes(user.role);
}

export function canRaiseAndon(user: UserProfile | null | undefined): boolean {
  return Boolean(user);
}
