import { describe, expect, it } from "vitest";
import { INITIAL_LINES } from "../utils/initialData";
import { canExecuteVoiceIntent, parseVoiceCommand } from "./voiceCommand";

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
});

describe("voice authorization", () => {
  it("allows operators to create calls but keeps policy explicit", () => {
    expect(canExecuteVoiceIntent("operator", "create_call")).toBe(true);
  });
});
