# Security and responsible use

AndonVoice AI is a hackathon prototype and not a certified emergency or machine-safety system.

Controls include explicit write confirmation, schema validation, duplicate incident interlocks, role restrictions, bounded request bodies, optional bearer authentication, timing-safe secret comparison, request rate limiting, security headers, fictional demo data, and server-side secret handling.

For production set `API_AUTH_MODE=required`, configure `MCP_API_KEY`, use TLS, attach durable storage, rotate credentials, restrict network access, replace demo identity with enterprise SSO, and connect changes to the site's formal authorization process.

Report security issues privately to the repository owner. Do not put credentials or real factory data in a public issue.
