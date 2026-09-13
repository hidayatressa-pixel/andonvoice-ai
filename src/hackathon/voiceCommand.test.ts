import { describe, expect, it } from "vitest";
import { INITIAL_LINES } from "../utils/initialData";
import { canExecuteVoiceIntent, formatSituationSummary, parseVoiceCommand } from "./voiceCommand";

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
});

describe("voice authorization", () => {
  it("allows operators to create calls but keeps policy explicit", () => {
    expect(canExecuteVoiceIntent("operator", "create_call")).toBe(true);
  });
});
