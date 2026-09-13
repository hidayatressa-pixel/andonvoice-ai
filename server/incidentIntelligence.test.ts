import { describe, expect, it } from "vitest";
import { analyzeIncidentDeterministically } from "./incidentIntelligence";

describe("4M1E incident intelligence", () => {
  it("classifies machine evidence and keeps a safety boundary", () => {
    const result = analyzeIncidentDeterministically("Robot clamp sensor alarm stopped the line");
    expect(result.primaryDimension).toBe("machine");
    expect(result.containment.length).toBeGreaterThan(0);
    expect(result.safetyNotice).toContain("Decision support");
  });
  it("falls back to method when evidence is ambiguous", () => {
    expect(analyzeIncidentDeterministically("Unexpected issue").primaryDimension).toBe("method");
  });
});
