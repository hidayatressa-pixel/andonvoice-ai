import { describe, expect, it } from "vitest";
import { INITIAL_LINES } from "../utils/initialData";
import { canExecuteVoiceIntent, formatIncidentDetail, formatLineInventory, formatSituationSummary, formatStoppedLines, parseVoiceCommand } from "./voiceCommand";

describe("parseVoiceCommand", () => {
  it("requires confirmation before creating a critical call", () => {
    const result = parseVoiceCommand("Report machine breakdown line HLA-A, line stop", INITIAL_LINES);
    expect(result.intent).toBe("create_call");
    expect(result.lineId).toBe("line-a");
    expect(result.severity).toBe("critical_line_stop");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("does not create an incident when the line is missing", () => {
    const result = parseVoiceCommand("Report a material shortage", INITIAL_LINES);
    expect(result.intent).toBe("create_call");
    expect(result.requiresConfirmation).toBe(false);
    expect(result.lineId).toBeUndefined();
  });

  it("recognizes read-only commands", () => {
    expect(parseVoiceCommand("Show unresolved incidents", INITIAL_LINES).intent).toBe("list_active");
    expect(parseVoiceCommand("Which line has the longest downtime?", INITIAL_LINES).intent).toBe("downtime_summary");
  });

  it("understands conversational help in Indonesian", () => {
    const result = parseVoiceCommand("Oke, apa yang bisa kamu lakukan?", INITIAL_LINES);
    expect(result.intent).toBe("help");
    expect(result.response).toContain("Saya bisa");
  });

  it("switches the conversation language", () => {
    const result = parseVoiceCommand("Gunakan bahasa Indonesia", INITIAL_LINES);
    expect(result.intent).toBe("set_language");
    expect(result.targetLanguage).toBe("id");
  });

  it("uses the application active line when the command omits a line", () => {
    const result = parseVoiceCommand("Laporkan kerusakan mesin, line stop", INITIAL_LINES, { language: "id", activeLine: INITIAL_LINES[1] });
    expect(result.lineId).toBe(INITIAL_LINES[1].id);
    expect(result.requiresConfirmation).toBe(true);
  });

  it("changes the shared active line through conversation", () => {
    const result = parseVoiceCommand("Pilih line SLC-C", INITIAL_LINES, { language: "id" });
    expect(result.intent).toBe("select_line");
    expect(result.lineId).toBe("line-c");
  });

  it("recognizes a request to read the current situation", () => {
    expect(parseVoiceCommand("Apa yang terjadi?", INITIAL_LINES, { language: "id", activeLine: INITIAL_LINES[0] }).intent).toBe("situation_summary");
  });

  it("summarizes plant and selected-line situation from live calls", () => {
    const now = Date.now();
    const calls = [{ id: "1", ticketNo: "AV-1", lineId: "line-a", lineName: "Headlamp Assembly A", workstation: "Loading", category: "machine_breakdown" as const, severity: "critical_line_stop" as const, isLineStopped: true, operatorName: "Operator", operatorId: "OP-1", description: "Sensor fault", timestamp: now - 180_000, status: "calling" as const }];
    const summary = formatSituationSummary(calls, INITIAL_LINES[0], "id", now);
    expect(summary).toContain("1 panggilan aktif");
    expect(summary).toContain("Headlamp Assembly A");
    expect(summary).toContain("3 menit");
  });

  it("does not mistake the Indonesian word yang for an NG quality category", () => {
    const result = parseVoiceCommand("Line mana saja yang mengalami stop?", INITIAL_LINES, { language: "id" });
    expect(result.intent).toBe("list_stopped_lines");
    expect(result.requiresConfirmation).toBe(false);
    expect(result.category).toBeUndefined();
  });

  it("keeps context for a follow-up asking for other stopped lines", () => {
    const result = parseVoiceCommand("Lalu line mana lagi?", INITIAL_LINES, { language: "id", lastIntent: "list_stopped_lines" });
    expect(result.intent).toBe("list_stopped_lines");
  });

  it("lists each stopped production line once", () => {
    const now = Date.now();
    const base = { ticketNo: "AV", workstation: "Loading", category: "machine_breakdown" as const, severity: "critical_line_stop" as const, isLineStopped: true, operatorName: "OP", operatorId: "OP", description: "Fault", timestamp: now - 60_000, status: "calling" as const };
    const text = formatStoppedLines([{ ...base, id: "1", lineId: "line-a", lineName: "Line A" }, { ...base, id: "2", lineId: "line-a", lineName: "Line A" }, { ...base, id: "3", lineId: "line-b", lineName: "Line B" }], "id", now);
    expect(text).toContain("2 line sedang stop");
  });

  it("understands detail and cause questions for the incident open on screen", () => {
    const focusedIncident = { id: "1", ticketNo: "AND-1", lineId: "line-a", lineName: "Headlamp Assembly A", workstation: "Loading", category: "machine_breakdown" as const, severity: "critical_line_stop" as const, isLineStopped: true, operatorName: "OP", operatorId: "OP-1", description: "Optical sensor detects clamping deviation", timestamp: Date.now(), status: "calling" as const };
    expect(parseVoiceCommand("Penyebabnya apa?", INITIAL_LINES, { language: "id", focusedIncident }).incidentField).toBe("cause");
    expect(parseVoiceCommand("Detail deskripsinya apa?", INITIAL_LINES, { language: "id", focusedIncident }).incidentField).toBe("description");
    expect(formatIncidentDetail(focusedIncident, "description", "id")).toContain("Optical sensor");
    expect(formatIncidentDetail(focusedIncident, "cause", "id")).toContain("belum dikonfirmasi");
  });

  it("answers line inventory questions from application master data", () => {
    const result = parseVoiceCommand("Ada berapa line di departement Assembly?", INITIAL_LINES, { language: "id" });
    expect(result.intent).toBe("line_inventory");
    expect(result.department).toBe("Assembly");
    const response = formatLineInventory(INITIAL_LINES, result.department, "id");
    expect(response).toContain("Departemen Assembly memiliki");
    expect(response).toContain(INITIAL_LINES[0].shortCode);
  });
});

describe("voice authorization", () => {
  it("allows operators to create calls but keeps policy explicit", () => {
    expect(canExecuteVoiceIntent("operator", "create_call")).toBe(true);
  });
});
