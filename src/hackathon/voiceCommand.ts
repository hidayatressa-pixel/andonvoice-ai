import type { AndonCall, AndonLine, CallCategory, CallSeverity, UserRole } from "../types";

export type VoiceIntent = "create_call" | "list_active" | "downtime_summary" | "help" | "unknown";

export interface ParsedVoiceCommand {
  intent: VoiceIntent;
  transcript: string;
  lineId?: string;
  lineName?: string;
  workstation?: string;
  category?: CallCategory;
  severity?: CallSeverity;
  description?: string;
  requiresConfirmation: boolean;
  confidence: number;
  response: string;
}

const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: CallCategory; label: string }> = [
  { pattern: /machine|mesin|breakdown|sensor|robot/i, category: "machine_breakdown", label: "machine breakdown" },
  { pattern: /material|part|shortage|kekurangan/i, category: "material_shortage", label: "material shortage" },
  { pattern: /quality|defect|reject|ng|cacat/i, category: "quality_defect", label: "quality defect" },
  { pattern: /safety|unsafe|accident|keselamatan/i, category: "safety_alert", label: "safety alert" },
  { pattern: /leader|supervisor|support|bantuan/i, category: "leader_call", label: "leader support" }
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findLine(transcript: string, lines: AndonLine[]): AndonLine | undefined {
  const normalized = normalize(transcript);
  return lines.find((line) => {
    const candidates = [line.id, line.name, line.shortCode].map(normalize);
    return candidates.some((candidate) => candidate.length > 1 && normalized.includes(candidate));
  }) || lines.find((line, index) => new RegExp(`\\bline\\s*${index + 1}\\b`, "i").test(transcript));
}

export function parseVoiceCommand(transcript: string, lines: AndonLine[]): ParsedVoiceCommand {
  const clean = transcript.trim();
  if (!clean) return { intent: "unknown", transcript: clean, requiresConfirmation: false, confidence: 0, response: "I did not hear a command." };

  if (/help|what can|commands|bantuan/i.test(clean)) {
    return { intent: "help", transcript: clean, requiresConfirmation: false, confidence: 1, response: "You can report an incident, list active calls, or ask for a downtime summary." };
  }
  if (/downtime|longest stop|loss time/i.test(clean)) {
    return { intent: "downtime_summary", transcript: clean, requiresConfirmation: false, confidence: 0.96, response: "I will summarize current downtime." };
  }
  if (/(show|list|what|which).*(active|open|unresolved)|active calls|panggilan aktif/i.test(clean)) {
    return { intent: "list_active", transcript: clean, requiresConfirmation: false, confidence: 0.96, response: "I will list unresolved Andon calls." };
  }

  const matchedCategory = CATEGORY_PATTERNS.find(({ pattern }) => pattern.test(clean));
  const line = findLine(clean, lines);
  if (/report|create|call|issue|problem|stop|lapor|panggil/i.test(clean) && matchedCategory) {
    if (!line) {
      return { intent: "create_call", transcript: clean, category: matchedCategory.category, requiresConfirmation: false, confidence: 0.55, response: `I detected ${matchedCategory.label}, but I need a valid production line.` };
    }
    const isCritical = /line stop|stopped|critical|emergency|berhenti/i.test(clean) || matchedCategory.category === "safety_alert";
    return {
      intent: "create_call",
      transcript: clean,
      lineId: line.id,
      lineName: line.name,
      workstation: line.workstations[0] || "Operator Station",
      category: matchedCategory.category,
      severity: isCritical ? "critical_line_stop" : "major",
      description: clean,
      requiresConfirmation: true,
      confidence: 0.9,
      response: `Confirm ${matchedCategory.label} call for ${line.name}${isCritical ? " with line stop" : ""}.`
    };
  }

  return { intent: "unknown", transcript: clean, requiresConfirmation: false, confidence: 0.2, response: "I could not map that request to a safe Andon action. Say help to hear examples." };
}

export function canExecuteVoiceIntent(role: UserRole, intent: VoiceIntent): boolean {
  if (intent === "create_call") return ["operator", "leader", "supervisor", "manager", "admin"].includes(role);
  return true;
}

export function formatActiveCalls(calls: AndonCall[]): string {
  const active = calls.filter((call) => call.status !== "resolved");
  if (!active.length) return "There are no unresolved Andon calls.";
  return `${active.length} unresolved call${active.length === 1 ? "" : "s"}: ${active.slice(0, 3).map((call) => `${call.lineName}, ${call.category.replaceAll("_", " ")}`).join("; ")}.`;
}

export function formatDowntimeSummary(calls: AndonCall[], now = Date.now()): string {
  const activeStops = calls.filter((call) => call.status !== "resolved" && call.isLineStopped);
  if (!activeStops.length) return "No production line is currently stopped.";
  const longest = [...activeStops].sort((a, b) => a.timestamp - b.timestamp)[0];
  const minutes = Math.max(1, Math.floor((now - longest.timestamp) / 60_000));
  return `${activeStops.length} line stop${activeStops.length === 1 ? " is" : "s are"} active. The longest is ${longest.lineName} at ${minutes} minutes.`;
}
