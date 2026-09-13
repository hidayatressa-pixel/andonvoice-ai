# Devpost submission draft

## Project name

AndonVoice AI

## Tagline

Voice-to-action manufacturing incident response powered by Alexa+, MCP, and human-centered safety controls.

## Inspiration

Factory line stops are often made worse by fragmented communication. Operators know what happened first, but reporting, escalation, and response tracking may live in different screens or informal channels.

## What it does

AndonVoice AI translates a natural voice or text report into a structured Andon incident. It identifies the production line and problem category, previews the action, asks for explicit confirmation, blocks duplicates, and shares the result with operational dashboards and MCP clients. Read-only tools answer active-call and downtime questions. A 4M1E assistant provides evidence-based hypotheses and containment questions through Amazon Bedrock when configured, with a deterministic fallback for reliable judging.

## How we built it

React, TypeScript, Vite, Express, the official Model Context Protocol SDK, Streamable HTTP protocol `2025-11-25`, Zod, Amazon Bedrock Runtime SDK, Firebase as an optional adapter, Vitest, Docker, and Render Blueprint infrastructure.

## Challenges

The central challenge was balancing conversational speed with operational safety. The system separates reads from writes, requires human confirmation, validates role authority, and prevents duplicate active calls.

## Accomplishments

- One incident workflow shared by Alexa+, web dashboards, REST, and MCP
- Five MCP tools, including read-only 4M1E decision support
- Duplicate interlock and role-controlled closure
- Reproducible containerized deployment and resilient static fallback

## What we learned

Conversational interfaces are most useful on the shop floor when they reduce friction without hiding responsibility. AI should structure context and accelerate response; people must retain operational authority.

## What's next

Validated Alexa+ device integration, signed identity federation, event streaming, durable multi-tenant storage, and evaluation with anonymized manufacturing scenarios.

## Links to add before submission

- Public demo URL
- Public video URL (under three minutes)
- Repository: https://github.com/hidayatressa-pixel/andonvoice-ai
