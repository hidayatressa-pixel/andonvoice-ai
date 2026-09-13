import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

export type McpIncidentStatus = "calling" | "acknowledged" | "in_progress" | "resolved";
export interface McpIncident {
  id: string;
  ticketNo: string;
  line: string;
  category: "machine" | "material" | "quality" | "safety" | "leader";
  description: string;
  lineStopped: boolean;
  status: McpIncidentStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lineId?: string;
  workstation?: string;
  severity?: "minor" | "major" | "critical_line_stop";
  acknowledgedAt?: string;
  resolvedAt?: string;
}

const storeFile = process.env.INCIDENT_STORE_FILE?.trim();
const incidents: McpIncident[] = (() => {
  if (!storeFile || !existsSync(storeFile)) return [];
  try { const data = JSON.parse(readFileSync(storeFile, "utf8")); return Array.isArray(data) ? data : []; }
  catch { console.error("Incident store could not be read; starting empty."); return []; }
})();

function persist(): void {
  if (!storeFile) return;
  const temporary = `${storeFile}.tmp`;
  writeFileSync(temporary, JSON.stringify(incidents, null, 2), { mode: 0o600 });
  renameSync(temporary, storeFile);
}

export function listIncidents(): McpIncident[] {
  return [...incidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createIncident(input: Omit<McpIncident, "id" | "ticketNo" | "status" | "createdAt" | "updatedAt">): { incident?: McpIncident; duplicate?: McpIncident } {
  const duplicate = incidents.find((item) => item.status !== "resolved" && item.line.toLowerCase() === input.line.toLowerCase() && item.category === input.category);
  if (duplicate) return { duplicate };
  const now = new Date().toISOString();
  const incident: McpIncident = {
    ...input,
    id: randomUUID(),
    ticketNo: `AV-${now.slice(0, 10).replaceAll("-", "")}-${String(incidents.length + 1).padStart(3, "0")}`,
    status: "calling",
    createdAt: now,
    updatedAt: now
  };
  incidents.push(incident);
  persist();
  return { incident };
}

export function updateIncident(id: string, status: McpIncidentStatus): McpIncident | undefined {
  const incident = incidents.find((item) => item.id === id || item.ticketNo === id);
  if (!incident) return undefined;
  incident.status = status;
  incident.updatedAt = new Date().toISOString();
  if (status === "acknowledged") incident.acknowledgedAt = incident.updatedAt;
  if (status === "resolved") incident.resolvedAt = incident.updatedAt;
  persist();
  return incident;
}

export function deleteIncident(id: string): boolean {
  const index = incidents.findIndex((item) => item.id === id || item.ticketNo === id);
  if (index < 0) return false;
  incidents.splice(index, 1);
  persist();
  return true;
}

export function resetIncidentsForTests(): void {
  incidents.splice(0, incidents.length);
}
