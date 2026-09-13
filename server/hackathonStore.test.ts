import { beforeEach, describe, expect, it } from "vitest";
import { createIncident, listIncidents, resetIncidentsForTests, updateIncident } from "./hackathonStore";

describe("hackathon MCP incident store", () => {
  beforeEach(resetIncidentsForTests);

  it("creates a traceable incident", () => {
    const result = createIncident({ line: "HLA-A", category: "machine", description: "Clamp sensor fault", lineStopped: true, createdBy: "OP-1001" });
    expect(result.incident?.ticketNo).toMatch(/^AV-/);
    expect(listIncidents()).toHaveLength(1);
  });

  it("blocks a duplicate active call", () => {
    createIncident({ line: "HLA-A", category: "machine", description: "First", lineStopped: true, createdBy: "OP-1001" });
    const duplicate = createIncident({ line: "hla-a", category: "machine", description: "Second", lineStopped: true, createdBy: "OP-1002" });
    expect(duplicate.duplicate).toBeDefined();
    expect(listIncidents()).toHaveLength(1);
  });

  it("updates workflow status", () => {
    const incident = createIncident({ line: "RCL-B", category: "quality", description: "Leak test NG", lineStopped: false, createdBy: "OP-1001" }).incident!;
    expect(updateIncident(incident.id, "acknowledged")?.status).toBe("acknowledged");
  });
});
