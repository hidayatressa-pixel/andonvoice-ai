import type { AndonCall, AndonLine, CallCategory, CallSeverity, UserRole } from "../types";

export type VoiceIntent = "create_call" | "list_active" | "list_stopped_lines" | "downtime_summary" | "situation_summary" | "incident_detail" | "help" | "set_language" | "select_line" | "unknown";

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
  incidentField?: "description" | "cause" | "status" | "full";
}

export interface VoiceContext { language?: "id" | "en"; activeLine?: AndonLine; workstation?: string; lastIntent?: VoiceIntent; focusedIncident?: AndonCall | null; }

const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: CallCategory; label: string }> = [
  { pattern: /\b(machine|mesin|breakdown|sensor|robot)\b/i, category: "machine_breakdown", label: "machine breakdown" },
  { pattern: /\b(material|part|shortage|kekurangan)\b/i, category: "material_shortage", label: "material shortage" },
  { pattern: /\b(quality|defect|reject|ng|cacat)\b/i, category: "quality_defect", label: "quality defect" },
  { pattern: /\b(safety|unsafe|accident|keselamatan)\b/i, category: "safety_alert", label: "safety alert" },
  { pattern: /\b(leader|supervisor|support|bantuan)\b/i, category: "leader_call", label: "leader support" }
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
  if (/(penyebab|akar masalah|root cause|what caused|cause of|kenapa ini)/i.test(clean)) {
    return { intent: "incident_detail", incidentField: "cause", transcript: clean, requiresConfirmation: false, confidence: context.focusedIncident ? 0.99 : 0.65, response: isId ? "Saya akan membaca penyebab insiden yang sedang dipilih." : "I will read the cause of the selected incident." };
  }
  if (/(detail|deskripsi|description|jelaskan).*(apa|insiden|masalah|panggilan)?|(?:apa|what).*(detail|deskripsi|description)/i.test(clean)) {
    return { intent: "incident_detail", incidentField: "description", transcript: clean, requiresConfirmation: false, confidence: context.focusedIncident ? 0.99 : 0.65, response: isId ? "Saya akan membaca deskripsi insiden yang sedang dipilih." : "I will read the selected incident description." };
  }
  if (/(statusnya|status insiden|incident status|what.*status)/i.test(clean)) {
    return { intent: "incident_detail", incidentField: "status", transcript: clean, requiresConfirmation: false, confidence: context.focusedIncident ? 0.99 : 0.65, response: isId ? "Saya akan membaca status insiden yang sedang dipilih." : "I will read the selected incident status." };
  }
  if (/downtime|longest stop|loss time/i.test(clean)) {
    return { intent: "downtime_summary", transcript: clean, requiresConfirmation: false, confidence: 0.96, response: isId ? "Saya akan merangkum downtime saat ini." : "I will summarize current downtime." };
  }
  if (/(line|lini)\s+mana\s*(saja|lagi)?.*(stop|berhenti)|(?:mana|daftar).*(line|lini).*(stop|berhenti)|which lines?.*(stopped|down)/i.test(clean)
      || (/^(lalu|terus|kemudian)?\s*(line|lini)\s+mana\s+lagi/i.test(clean) && ["list_stopped_lines", "situation_summary", "downtime_summary"].includes(context.lastIntent || "unknown"))) {
    return { intent: "list_stopped_lines", transcript: clean, requiresConfirmation: false, confidence: 0.98, response: isId ? "Saya akan menyebutkan line yang sedang berhenti." : "I will list the stopped production lines." };
  }
  if (/apa\s*(yang|yg)?\s*terjadi|situasi|kondisi sekarang|what(?:'s| is) happening|current situation|kenapa.*(?:line|lini).*(?:stop|berhenti)/i.test(clean)) {
    return { intent: "situation_summary", transcript: clean, requiresConfirmation: false, confidence: 0.97, response: isId ? "Saya akan membaca situasi Andon saat ini." : "I will read the current Andon situation." };
  }
  if (/(show|list|what|which).*(active|open|unresolved)|active calls|panggilan aktif/i.test(clean)) {
    return { intent: "list_active", transcript: clean, requiresConfirmation: false, confidence: 0.96, response: isId ? "Saya akan menampilkan panggilan Andon yang belum selesai." : "I will list unresolved Andon calls." };
  }

  const matchedCategory = CATEGORY_PATTERNS.find(({ pattern }) => pattern.test(clean));
  const line = findLine(clean, lines) || context.activeLine;
  if (/\b(report|create|call|issue|problem|lapor|laporkan|panggil|panggilan)\b/i.test(clean) && matchedCategory) {
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

export function formatIncidentDetail(call: AndonCall | undefined | null, field: ParsedVoiceCommand["incidentField"] = "full", language: "id" | "en" = "en"): string {
  if (!call) return language === "id"
    ? "Belum ada insiden yang dipilih. Buka detail panggilan atau sebutkan nama line terlebih dahulu."
    : "No incident is selected. Open a call detail or name a production line first.";
  const status = statusLabel(call.status, language);
  if (field === "description") return language === "id"
    ? `Deskripsi insiden ${call.ticketNo} pada ${call.lineName}: ${call.description}`
    : `Incident ${call.ticketNo} on ${call.lineName}: ${call.description}`;
  if (field === "cause") {
    if (call.rootCause) return language === "id" ? `Akar masalah yang tercatat: ${call.rootCause}` : `Recorded root cause: ${call.rootCause}`;
    return language === "id"
      ? `Penyebab insiden ${call.ticketNo} belum dikonfirmasi. Fakta yang tercatat saat ini: ${call.description}`
      : `The cause of incident ${call.ticketNo} has not been confirmed. The currently recorded fact is: ${call.description}`;
  }
  if (field === "status") return language === "id"
    ? `Status insiden ${call.ticketNo} pada ${call.lineName} adalah ${status}.`
    : `Incident ${call.ticketNo} on ${call.lineName} is ${status}.`;
  return language === "id"
    ? `${call.ticketNo}, ${call.lineName}, ${call.workstation}. ${call.description}. Status ${status}.`
    : `${call.ticketNo}, ${call.lineName}, ${call.workstation}. ${call.description}. Status: ${status}.`;
}

export function formatDowntimeSummary(calls: AndonCall[], now = Date.now(), language: "id" | "en" = "en"): string {
  const activeStops = calls.filter((call) => call.status !== "resolved" && call.isLineStopped);
  if (!activeStops.length) return language === "id" ? "Saat ini tidak ada line produksi yang berhenti." : "No production line is currently stopped.";
  const longest = [...activeStops].sort((a, b) => a.timestamp - b.timestamp)[0];
  const minutes = Math.max(1, Math.floor((now - longest.timestamp) / 60_000));
  return language === "id" ? `${activeStops.length} line stop sedang aktif. Downtime terlama adalah ${longest.lineName}, selama ${minutes} menit.` : `${activeStops.length} line stop${activeStops.length === 1 ? " is" : "s are"} active. The longest is ${longest.lineName} at ${minutes} minutes.`;
}

function statusLabel(status: AndonCall["status"], language: "id" | "en"): string {
  if (language === "en") return status.replaceAll("_", " ");
  return { calling: "panggilan baru", acknowledged: "sudah diterima", in_progress: "sedang ditangani", resolved: "selesai" }[status];
}

export function formatSituationSummary(calls: AndonCall[], activeLine: AndonLine | undefined, language: "id" | "en" = "en", now = Date.now()): string {
  const active = calls.filter((call) => call.status !== "resolved");
  if (!active.length) return language === "id" ? "Situasi plant normal. Tidak ada panggilan Andon aktif atau line stop." : "The plant is normal. There are no active Andon calls or line stops.";
  const stops = active.filter((call) => call.isLineStopped);
  const selected = activeLine ? active.filter((call) => call.lineId === activeLine.id || call.lineName === activeLine.name) : [];
  const oldest = [...active].sort((a, b) => a.timestamp - b.timestamp)[0];
  const oldestMinutes = Math.max(1, Math.floor((now - oldest.timestamp) / 60_000));
  const focus = selected[0];
  const focusText = focus
    ? language === "id"
      ? ` Pada ${activeLine!.name} ada ${selected.length} insiden aktif. Masalah terbaru ${focus.category.replaceAll("_", " ")} di ${focus.workstation}, status ${statusLabel(focus.status, language)}.`
      : ` ${activeLine!.name} has ${selected.length} active incident${selected.length === 1 ? "" : "s"}. The latest is ${focus.category.replaceAll("_", " ")} at ${focus.workstation}, status ${statusLabel(focus.status, language)}.`
    : language === "id" ? ` Tidak ada insiden aktif pada ${activeLine?.name || "line yang dipilih"}.` : ` There is no active incident on ${activeLine?.name || "the selected line"}.`;
  const priority = language === "id"
    ? ` Prioritas durasi terlama adalah ${oldest.lineName} di ${oldest.workstation}, ${oldestMinutes} menit, status ${statusLabel(oldest.status, language)}.`
    : ` The longest-duration priority is ${oldest.lineName} at ${oldest.workstation}, ${oldestMinutes} minutes, status ${statusLabel(oldest.status, language)}.`;
  return language === "id"
    ? `Saat ini ada ${active.length} panggilan aktif dan ${stops.length} kondisi line stop.${focusText}${priority}`
    : `There are ${active.length} active calls and ${stops.length} line stops.${focusText}${priority}`;
}

export function formatStoppedLines(calls: AndonCall[], language: "id" | "en" = "en", now = Date.now()): string {
  const stopped = calls.filter((call) => call.status !== "resolved" && call.isLineStopped);
  if (!stopped.length) return language === "id" ? "Tidak ada line yang sedang mengalami stop." : "No production line is currently stopped.";
  const byLine = new Map<string, AndonCall>();
  for (const call of [...stopped].sort((a, b) => a.timestamp - b.timestamp)) if (!byLine.has(call.lineId)) byLine.set(call.lineId, call);
  const details = [...byLine.values()].map((call) => {
    const minutes = Math.max(1, Math.floor((now - call.timestamp) / 60_000));
    return language === "id"
      ? `${call.lineName} di ${call.workstation}, ${minutes} menit, ${statusLabel(call.status, language)}`
      : `${call.lineName} at ${call.workstation}, ${minutes} minutes, ${statusLabel(call.status, language)}`;
  });
  return language === "id" ? `${details.length} line sedang stop: ${details.join("; ")}.` : `${details.length} lines are stopped: ${details.join("; ")}.`;
}
