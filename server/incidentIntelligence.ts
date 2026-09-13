import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

export type CauseDimension = "man" | "machine" | "material" | "method" | "environment";
export interface IncidentAnalysis {
  provider: "deterministic" | "amazon-bedrock";
  primaryDimension: CauseDimension;
  confidence: number;
  hypotheses: Array<{ dimension: CauseDimension; evidence: string }>;
  containment: string[];
  questions: string[];
  safetyNotice: string;
}

const RULES: Array<{ dimension: CauseDimension; terms: RegExp; containment: string }> = [
  { dimension: "machine", terms: /sensor|robot|motor|jig|clamp|alarm|breakdown|mesin/i, containment: "Isolate the equipment and verify its safe state before inspection." },
  { dimension: "material", terms: /material|part|shortage|lot|fifo|component/i, containment: "Hold the affected lot and verify material identity and FIFO status." },
  { dimension: "man", terms: /operator|training|miss|forgot|manual|human/i, containment: "Confirm standard-work understanding without assigning blame." },
  { dimension: "method", terms: /method|parameter|standard|work instruction|sequence|process/i, containment: "Freeze the current process parameters and compare them with the approved standard." },
  { dimension: "environment", terms: /temperature|humidity|dust|lighting|environment|power/i, containment: "Record environmental conditions and protect the affected process area." }
];

export function analyzeIncidentDeterministically(description: string): IncidentAnalysis {
  const matches = RULES.filter((rule) => rule.terms.test(description));
  const selected = matches.length ? matches : [RULES[3]];
  return {
    provider: "deterministic", primaryDimension: selected[0].dimension,
    confidence: matches.length ? Math.min(0.9, 0.62 + matches.length * 0.08) : 0.45,
    hypotheses: selected.map((rule) => ({ dimension: rule.dimension, evidence: `Keywords and context indicate a possible ${rule.dimension} factor.` })),
    containment: [...new Set(selected.map((rule) => rule.containment)), "Keep the Andon active until an authorized responder verifies recovery."],
    questions: ["What changed immediately before the abnormality?", "Can the condition be reproduced safely?", "Which standard or parameter was last verified?"],
    safetyNotice: "Decision support only. Follow site safety procedures and authorized human judgment."
  };
}

export async function analyzeIncident(description: string): Promise<IncidentAnalysis> {
  const fallback = analyzeIncidentDeterministically(description);
  const modelId = process.env.BEDROCK_MODEL_ID?.trim();
  if (!modelId || process.env.BEDROCK_ENABLED !== "true") return fallback;
  try {
    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
    const command = new ConverseCommand({ modelId, inferenceConfig: { maxTokens: 700, temperature: 0.1 },
      system: [{ text: "You are a manufacturing incident assistant. Return only JSON with primaryDimension, confidence, hypotheses, containment, questions. Use 4M1E. Never claim certainty or replace safety procedures." }],
      messages: [{ role: "user", content: [{ text: description.slice(0, 2000) }] }] });
    const response = await client.send(command);
    const text = response.output?.message?.content?.find((item) => "text" in item)?.text;
    if (!text) return fallback;
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
    return { ...fallback, ...parsed, provider: "amazon-bedrock", safetyNotice: fallback.safetyNotice };
  } catch (error) {
    console.error("Bedrock analysis failed; deterministic fallback used.", error);
    return fallback;
  }
}
