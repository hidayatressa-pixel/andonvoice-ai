import type { Express, Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import * as z from "zod/v4";
import { createIncident, listIncidents, updateIncident, type McpIncidentStatus } from "./hackathonStore";
import { analyzeIncident } from "./incidentIntelligence";
import { apiAuthentication, apiRateLimit } from "./security";

const textResult = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });

export function createAndonMcpServer(): McpServer {
  const server = new McpServer({ name: "andonvoice-ai", version: "1.0.0" });

  server.registerTool("create_andon_call", {
    title: "Create Andon call",
    description: "Creates a traceable manufacturing incident. The assistant must obtain explicit human confirmation before calling this tool.",
    inputSchema: {
      line: z.string().min(2).max(80),
      category: z.enum(["machine", "material", "quality", "safety", "leader"]),
      description: z.string().min(3).max(500),
      lineStopped: z.boolean().default(false),
      operatorId: z.string().min(2).max(80),
      confirmed: z.literal(true).describe("Proof that the operator explicitly confirmed the write action")
    }
  }, async ({ line, category, description, lineStopped, operatorId, confirmed }) => {
    if (!confirmed) return { isError: true, ...textResult({ error: "HUMAN_CONFIRMATION_REQUIRED" }) };
    const result = createIncident({ line, category, description, lineStopped, createdBy: operatorId });
    if (result.duplicate) return { isError: true, ...textResult({ error: "DUPLICATE_ACTIVE_CALL", existing: result.duplicate }) };
    return textResult({ ok: true, incident: result.incident });
  });

  server.registerTool("list_active_calls", {
    title: "List active Andon calls",
    description: "Lists unresolved manufacturing incidents. This is a read-only operation.",
    inputSchema: { line: z.string().max(80).optional() }
  }, async ({ line }) => {
    const active = listIncidents().filter((item) => item.status !== "resolved" && (!line || item.line.toLowerCase().includes(line.toLowerCase())));
    return textResult({ count: active.length, incidents: active });
  });

  server.registerTool("get_downtime_summary", {
    title: "Get downtime summary",
    description: "Returns current line-stop duration and the longest active stop.",
    inputSchema: {}
  }, async () => {
    const now = Date.now();
    const stops = listIncidents().filter((item) => item.status !== "resolved" && item.lineStopped).map((item) => ({ ...item, durationMinutes: Math.max(1, Math.floor((now - Date.parse(item.createdAt)) / 60_000)) }));
    return textResult({ activeLineStops: stops.length, longestStop: [...stops].sort((a, b) => b.durationMinutes - a.durationMinutes)[0] || null, incidents: stops });
  });

  server.registerTool("update_incident_status", {
    title: "Update incident status",
    description: "Updates workflow status. Resolve is limited to authorized leadership roles and always requires confirmation.",
    inputSchema: {
      incidentId: z.string().min(2),
      status: z.enum(["acknowledged", "in_progress", "resolved"]),
      actorRole: z.enum(["leader", "supervisor", "manager", "admin"]),
      confirmed: z.literal(true)
    }
  }, async ({ incidentId, status, actorRole, confirmed }) => {
    if (!confirmed) return { isError: true, ...textResult({ error: "HUMAN_CONFIRMATION_REQUIRED" }) };
    if (status === "resolved" && !["supervisor", "manager", "admin"].includes(actorRole)) return { isError: true, ...textResult({ error: "ROLE_NOT_AUTHORIZED_TO_CLOSE" }) };
    const incident = updateIncident(incidentId, status as McpIncidentStatus);
    return incident ? textResult({ ok: true, incident }) : { isError: true, ...textResult({ error: "INCIDENT_NOT_FOUND" }) };
  });

  server.registerTool("analyze_incident_4m1e", {
    title: "Analyze incident with 4M1E",
    description: "Returns decision support, containment prompts, and evidence-based 4M1E hypotheses. It never changes incident state.",
    inputSchema: { description: z.string().min(5).max(2000) }
  }, async ({ description }) => textResult(await analyzeIncident(description)));

  return server;
}

export function mountMcpEndpoint(app: Express): void {
  app.use("/mcp", apiRateLimit, apiAuthentication);
  app.post("/mcp", async (req: Request, res: Response) => {
    const server = createAndonMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP request failed", error);
      if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  });
  app.get("/mcp", (_req, res) => res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Use POST for stateless Streamable HTTP." }, id: null }));
  app.delete("/mcp", (_req, res) => res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Stateless sessions cannot be deleted." }, id: null }));
}
