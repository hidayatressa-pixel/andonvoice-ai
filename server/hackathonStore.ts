import { randomUUID } from "node:crypto";

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
}

const incidents: McpIncident[] = [];

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
  return { incident };
}

export function updateIncident(id: string, status: McpIncidentStatus): McpIncident | undefined {
  const incident = incidents.find((item) => item.id === id || item.ticketNo === id);
  if (!incident) return undefined;
  incident.status = status;
  incident.updatedAt = new Date().toISOString();
  return incident;
}

export function resetIncidentsForTests(): void {
  incidents.splice(0, incidents.length);
}
