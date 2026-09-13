# Three-minute demo script

## 0:00–0:25 — Problem

“When a production line stops, every extra navigation step becomes hidden downtime. AndonVoice AI lets an operator report the problem naturally while preserving factory controls.” Show the Judge Demo panel and safety gates.

## 0:25–1:10 — Alexa+ experience

Log in as operator, open **Alexa+ Experience**, and say: “Report machine breakdown on line HLA-A, line stop.” Point out that no incident is created yet. Click **Confirm call** and show the new call on the dashboard.

## 1:10–1:45 — Unified MCP workflow

Explain that Alexa+, REST, and MCP use one incident store. Run `list_active_calls`, then show that a duplicate machine call for HLA-A is blocked. Acknowledge the incident as leader and show the same status in the responder view.

## 1:45–2:20 — Amazon intelligence

Run `analyze_incident_4m1e` with “Robot clamp sensor alarm stopped the conveyor.” Show the Machine hypothesis, containment prompts, and questions. Explain the Bedrock path and reliable deterministic fallback.

## 2:20–2:50 — Safety and value

Show confirmation, role-controlled closure, auditability, fictional data, and the warning that this is decision support—not an emergency control.

## 2:50–3:00 — Close

“AndonVoice AI turns a spoken problem into one safe, visible, traceable response—so factories spend less time finding the problem and more time solving it.”
