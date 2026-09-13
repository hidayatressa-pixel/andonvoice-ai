import type { AndonCall, AndonLine, CallCategory, CallSeverity, UserRole } from "../types";

export type VoiceIntent = "create_call" | "list_active" | "downtime_summary" | "help" | "set_language" | "select_line" | "unknown";

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
  targetLanguage?: "id" | "en";
}

export interface VoiceContext { language?: "id" | "en"; activeLine?: AndonLine; workstation?: string; }

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

export function parseVoiceCommand(transcript: string, lines: AndonLine[], context: VoiceContext = {}): ParsedVoiceCommand {
  const clean = transcript.trim();
  const isId = context.language === "id" || /\b(gunakan|bahasa|lapor|panggil|mesin|material|bantuan|tampilkan|mana|terlama)\b/i.test(clean);
  if (!clean) return { intent: "unknown", transcript: clean, requiresConfirmation: false, confidence: 0, response: isId ? "Saya tidak mendengar perintah." : "I did not hear a command." };

  if (/(gunakan|pakai|ubah|ganti|make|switch|change).*(bahasa indonesia|indonesian|indonesia language)/i.test(clean)) {
    return { intent: "set_language", transcript: clean, targetLanguage: "id", requiresConfirmation: false, confidence: 1, response: "Baik, sekarang saya menggunakan Bahasa Indonesia. Kamu dapat melaporkan masalah, melihat panggilan aktif, atau meminta ringkasan downtime." };
  }
  if (/(use|switch|change|gunakan|pakai|ubah|ganti).*(english|bahasa inggris)/i.test(clean)) {
    return { intent: "set_language", transcript: clean, targetLanguage: "en", requiresConfirmation: false, confidence: 1, response: "Okay, I will use English. You can report an incident, list active calls, or request a downtime summary." };
  }
  if (/(pilih|gunakan|ganti|switch|select|change).*(line|lini)/i.test(clean)) {
    const selected = findLine(clean, lines);
    if (selected) return { intent: "select_line", transcript: clean, lineId: selected.id, lineName: selected.name, requiresConfirmation: false, confidence: 0.98, response: isId ? `Line aktif diubah ke ${selected.name}.` : `Active line changed to ${selected.name}.` };
    return { intent: "select_line", transcript: clean, requiresConfirmation: false, confidence: 0.5, response: isId ? "Sebutkan kode line yang valid, misalnya HLA-A." : "Say a valid line code, for example HLA-A." };
  }
  if (/help|what can|commands|bantuan|apa.*(bisa|dapat).*(lakukan|kerjakan)|bisa apa|fitur apa/i.test(clean)) {
    const indonesian = /bantuan|apa|bisa|dapat|lakukan|kerjakan|fitur/i.test(clean);
    return { intent: "help", transcript: clean, requiresConfirmation: false, confidence: 1, response: indonesian || isId ? "Saya bisa membuat panggilan Andon dengan konfirmasi, memilih line aktif, menampilkan panggilan aktif, merangkum downtime, dan membantu analisis masalah 4M1E." : "I can create a confirmed Andon call, select the active line, list active incidents, summarize downtime, and support 4M1E problem analysis." };
  }
  if (/downtime|longest stop|loss time/i.test(clean)) {
    return { intent: "downtime_summary", transcript: clean, requiresConfirmation: false, confidence: 0.96, response: isId ? "Saya akan merangkum downtime saat ini." : "I will summarize current downtime." };
  }
  if (/(show|list|what|which).*(active|open|unresolved)|active calls|panggilan aktif/i.test(clean)) {
    return { intent: "list_active", transcript: clean, requiresConfirmation: false, confidence: 0.96, response: isId ? "Saya akan menampilkan panggilan Andon yang belum selesai." : "I will list unresolved Andon calls." };
  }

  const matchedCategory = CATEGORY_PATTERNS.find(({ pattern }) => pattern.test(clean));
  const line = findLine(clean, lines) || context.activeLine;
  if (/report|create|call|issue|problem|stop|lapor|panggil/i.test(clean) && matchedCategory) {
    if (!line) {
      return { intent: "create_call", transcript: clean, category: matchedCategory.category, requiresConfirmation: false, confidence: 0.55, response: isId ? `Masalah ${matchedCategory.label} terdeteksi, tetapi pilih line produksi terlebih dahulu.` : `I detected ${matchedCategory.label}, but I need a valid production line.` };
    }
    const isCritical = /line stop|stopped|critical|emergency|berhenti/i.test(clean) || matchedCategory.category === "safety_alert";
    return {
      intent: "create_call",
      transcript: clean,
      lineId: line.id,
      lineName: line.name,
      workstation: context.workstation || line.workstations[0] || "Operator Station",
      category: matchedCategory.category,
      severity: isCritical ? "critical_line_stop" : "major",
      description: clean,
      requiresConfirmation: true,
      confidence: 0.9,
      response: isId ? `Konfirmasi panggilan ${matchedCategory.label} untuk ${line.name}${isCritical ? " dengan kondisi line stop" : ""}.` : `Confirm ${matchedCategory.label} call for ${line.name}${isCritical ? " with line stop" : ""}.`
    };
  }

  return { intent: "unknown", transcript: clean, requiresConfirmation: false, confidence: 0.2, response: isId ? "Perintah belum dapat dipetakan menjadi tindakan Andon yang aman. Katakan bantuan untuk melihat contoh." : "I could not map that request to a safe Andon action. Say help to hear examples." };
}

export function canExecuteVoiceIntent(role: UserRole, intent: VoiceIntent): boolean {
  if (intent === "create_call") return ["operator", "leader", "supervisor", "manager", "admin"].includes(role);
  return true;
}

export function formatActiveCalls(calls: AndonCall[], language: "id" | "en" = "en"): string {
  const active = calls.filter((call) => call.status !== "resolved");
  if (!active.length) return language === "id" ? "Tidak ada panggilan Andon yang belum selesai." : "There are no unresolved Andon calls.";
  const list = active.slice(0, 3).map((call) => `${call.lineName}, ${call.category.replaceAll("_", " ")}`).join("; ");
  return language === "id" ? `${active.length} panggilan belum selesai: ${list}.` : `${active.length} unresolved call${active.length === 1 ? "" : "s"}: ${list}.`;
}

export function formatDowntimeSummary(calls: AndonCall[], now = Date.now(), language: "id" | "en" = "en"): string {
  const activeStops = calls.filter((call) => call.status !== "resolved" && call.isLineStopped);
  if (!activeStops.length) return language === "id" ? "Saat ini tidak ada line produksi yang berhenti." : "No production line is currently stopped.";
  const longest = [...activeStops].sort((a, b) => a.timestamp - b.timestamp)[0];
  const minutes = Math.max(1, Math.floor((now - longest.timestamp) / 60_000));
  return language === "id" ? `${activeStops.length} line stop sedang aktif. Downtime terlama adalah ${longest.lineName}, selama ${minutes} menit.` : `${activeStops.length} line stop${activeStops.length === 1 ? " is" : "s are"} active. The longest is ${longest.lineName} at ${minutes} minutes.`;
}
