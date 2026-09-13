# Deployment

AndonVoice AI runs as one Node/Express web service. The same origin serves the React experience, REST endpoints, and MCP Streamable HTTP endpoint.

## Render Blueprint

1. Open `https://dashboard.render.com/blueprint/new?repo=https://github.com/hidayatressa-pixel/andonvoice-ai`.
2. Approve repository access and apply the Blueprint.
3. Optionally set `MCP_API_KEY` and change `API_AUTH_MODE` to `required` after judging connectivity is verified.
4. Set Bedrock credentials and `BEDROCK_ENABLED=true` only when Amazon Bedrock is available.

Verify `/api/health`, `/api/ready`, and then initialize `POST /mcp` using the request in the main README.

The free plan uses in-memory incidents unless `INCIDENT_STORE_FILE` points to durable storage. Use an attached disk or an external persistence adapter for production use.
