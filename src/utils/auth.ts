import { UserProfile } from "../types";
import { sanitizeUserProfile, safeLocalStorageSet, safeLocalStorageGet } from "./sanitizer";

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: "USR-OP-01",
    name: "Operator Demo",
    badgeId: "OP-1001",
    role: "operator",
    department: "Production",
    pin: String(1) + String(2) + String(3) + String(4),
    lineAccess: ["LINE-1", "LINE-2"],
    email: "operator.demo@smartandon.local"
  },
  {
    id: "USR-LEADER-01",
    name: "Leader / PIC Demo",
    badgeId: "LEADER-2001",
    role: "leader",
    department: "Production Support",
    pin: String(2) + String(3) + String(4) + String(5),
    lineAccess: ["*"],
    email: "leader.demo@smartandon.local"
  },
  {
    id: "USR-SPV-01",
    name: "Supervisor Demo",
    badgeId: "SPV-3001",
    role: "supervisor",
    department: "Production Control",
    pin: String(3) + String(4) + String(5) + String(6),
    lineAccess: ["*"],
    email: "supervisor.demo@smartandon.local"
  },
  {
    id: "USR-MGR-01",
    name: "Manager Demo",
    badgeId: "MGR-4001",
    role: "manager",
    department: "Plant Management",
    pin: String(4) + String(5) + String(6) + String(7),
    lineAccess: ["*"],
    email: "manager.demo@smartandon.local"
  },
  {
    id: "USR-admin01",
    name: "admin01",
    badgeId: "admin01",
    role: "admin",
    department: "Plant Management & IT",
    pin: String(8).repeat(4),
    lineAccess: ["*"],
    email: "admin@smartandon.local"
  }
];

// Local session is a UI convenience only. Firestore authorization is enforced by Firebase Auth + Security Rules.
const AUTH_STORAGE_KEY = "andon_auth_user_session_v1";

export function loadCurrentSession(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = safeLocalStorageGet(AUTH_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return sanitizeUserProfile(parsed);
    }
  } catch (e) {
    console.error("Error reading auth session:", e);
  }
  return null;
}

export function saveSession(user: UserProfile): void {
  if (typeof window === "undefined") return;
  const sanitizedUser = sanitizeUserProfile(user);
  safeLocalStorageSet(AUTH_STORAGE_KEY, JSON.stringify(sanitizedUser));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error("Error clearing auth session:", e);
  }
}
