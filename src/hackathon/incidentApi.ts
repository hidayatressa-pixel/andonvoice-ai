import type { AndonCall, CallCategory, CallStatus } from "../types";

export interface UnifiedIncident {
  id: string;
  ticketNo: string;
  line: string;
  lineId?: string;
  workstation?: string;
  category: "machine" | "material" | "quality" | "safety" | "leader";
  description: string;
  lineStopped: boolean;
  status: CallStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  severity?: "minor" | "major" | "critical_line_stop";
  acknowledgedAt?: string;
  resolvedAt?: string;
}

const categoryToApi = (category: CallCategory): UnifiedIncident["category"] => {
  if (category.includes("material")) return "material";
  if (category.includes("quality")) return "quality";
  if (category.includes("safety")) return "safety";
  if (category.includes("leader") || category.includes("supervisor")) return "leader";
  return "machine";
};

const categoryFromApi = (category: UnifiedIncident["category"]): CallCategory => ({
  machine: "machine_breakdown", material: "material_shortage", quality: "quality_defect",
  safety: "safety_alert", leader: "leader_call"
}[category] as CallCategory);

export function unifiedIncidentToAndonCall(item: UnifiedIncident): AndonCall {
  return {
    id: item.id, ticketNo: item.ticketNo, lineId: item.lineId || item.line,
    lineName: item.line, workstation: item.workstation || "Operator Station",
    category: categoryFromApi(item.category), severity: item.severity || (item.lineStopped ? "critical_line_stop" : "major"),
    isLineStopped: item.lineStopped, operatorName: item.createdBy, operatorId: item.createdBy,
    description: item.description, timestamp: Date.parse(item.createdAt), status: item.status,
    acknowledgedAt: item.acknowledgedAt ? Date.parse(item.acknowledgedAt) : undefined,
    resolvedAt: item.resolvedAt ? Date.parse(item.resolvedAt) : undefined
  };
}

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (!response.ok) throw new Error(`Andon API returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchUnifiedCalls(): Promise<AndonCall[]> {
  const result = await jsonRequest<{ incidents: UnifiedIncident[] }>("/api/hackathon/incidents");
  return result.incidents.map(unifiedIncidentToAndonCall);
}

export async function createUnifiedCall(call: Omit<AndonCall, "id" | "ticketNo" | "timestamp" | "status">): Promise<AndonCall> {
  const result = await jsonRequest<{ incident: UnifiedIncident }>("/api/hackathon/incidents", {
    method: "POST", body: JSON.stringify({ line: call.lineName, lineId: call.lineId, workstation: call.workstation,
      category: categoryToApi(call.category), description: call.description, lineStopped: call.isLineStopped,
      severity: call.severity, createdBy: call.operatorId })
  });
  return unifiedIncidentToAndonCall(result.incident);
}

export async function updateUnifiedCall(id: string, status: CallStatus): Promise<AndonCall> {
  const result = await jsonRequest<{ incident: UnifiedIncident }>(`/api/hackathon/incidents/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify({ status })
  });
  return unifiedIncidentToAndonCall(result.incident);
}

export async function deleteUnifiedCall(id: string): Promise<void> {
  await jsonRequest(`/api/hackathon/incidents/${encodeURIComponent(id)}`, { method: "DELETE" });
}
