# FeatureSignals MCP Server

> Give AI agents direct, typed access to feature flag management.

The **FeatureSignals MCP Server** is a [Model Context Protocol](https://modelcontextprotocol.io/) server that enables AI agents (Claude, Cursor, Zed, Cody, etc.) to interact with FeatureSignals — searching documentation, creating feature flags, evaluating flags, managing sandboxes, and previewing migrations — all through structured, typed tool calls.

---

## Quick Start

```bash
npm install -g @featuresignals/mcp-server
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "featuresignals": {
      "command": "npx",
      "args": ["-y", "@featuresignals/mcp-server"],
      "env": {
        "FS_API_URL": "http://localhost:8080",
        "FS_API_KEY": "fs_key_your_api_key_here"
      }
    }
  }
}
```

### Cursor

Add to Cursor's MCP config (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "featuresignals": {
      "command": "npx",
      "args": ["-y", "@featuresignals/mcp-server"],
      "env": {
        "FS_API_URL": "http://localhost:8080",
        "FS_API_KEY": "fs_key_your_api_key_here"
      }
    }
  }
}
```

### HTTP Mode (for remote agents)

```bash
featuresignals-mcp --transport http --port 3456
```

The server exposes:
- `POST /mcp` — JSON-RPC endpoint
- `GET /health` — Health check
- `GET /tools` — Tool listing (debugging)

---

## Tools Reference

### Documentation Tools

These tools are always available — no API key required.

#### `search_docs`

Search all FeatureSignals documentation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query — natural language or keywords |
| `limit` | number | No | Max results (1-20, default 10) |

**Returns:** `{ query, total, results: [{ title, snippet, url, relevance, category }] }`

Falls back to a built-in static index if the unified docs site is unreachable.

#### `get_doc`

Retrieve a full documentation page in structured JSON.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Doc path slug, e.g. `getting-started/quickstart` |

**Returns:** `{ title, description, sections, code_blocks, prerequisites, next_steps, ai_metadata }`

#### `get_api_reference`

Retrieve detailed API reference for a FeatureSignals API endpoint.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `endpoint` | string | Yes | API path, e.g. `POST /v1/evaluate` or `/v1/flags` |

**Returns:** `{ method, path, description, parameters, requestBody, response, examples }`

---

### Product Tools

These tools require an API key (`FS_API_KEY`).

#### `create_flag`

Create a new feature flag.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | Yes | Flag key — unique identifier, e.g. `new-checkout` |
| `name` | string | Yes | Human-readable name, e.g. `New Checkout Flow` |
| `type` | enum | No | `boolean`, `string`, `number`, or `json` (default: `boolean`) |
| `default_value` | any | No | Default value when no rules match (default: `false`) |
| `description` | string | No | Optional description |
| `tags` | string[] | No | Optional tags |
| `project_id` | string | Yes | Project ID to create the flag in |

**Returns:** `{ success, flag: { id, key, name, type, default_value, ... } }`

#### `evaluate_flag`

Evaluate a single feature flag for a given context.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `flag_key` | string | Yes | Flag key to evaluate |
| `env_key` | string | Yes | Environment key (e.g. `development`, `production`) |
| `context_key` | string | No | User/session key for targeting |
| `attributes` | object | No | Context attributes for rule matching |

**Returns:** `{ success, evaluation: { flag_key, value, reason, variant_key, eval_time_ms } }`

#### `list_flags`

List all feature flags in a project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | Yes | Project ID |
| `limit` | number | No | Max flags to return (1-100, default 50) |
| `offset` | number | No | Pagination offset (default 0) |

**Returns:** `{ success, total, flags: [...] }`

#### `get_migration_preview`

Preview a migration from another feature flag provider.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum | Yes | `launchdarkly`, `configcat`, `flagsmith`, or `unleash` |
| `api_key` | string | Yes | API key from your current provider |

**Returns:** `{ success, preview: { flags_count, environments_count, pricing, ... } }`

---

### Sandbox Tools

The sandbox workflow enables agents to give users a hands-on demo with zero friction.

#### `create_sandbox`

Create an ephemeral demo environment with pre-seeded feature flags.

No parameters required. No authentication required.

**Returns:** `{ success, sandbox: { sandbox_id, env_key, org_id, project_id, expires_at } }`

The sandbox includes:
- Sample flags: `new-checkout`, `dark-mode`, `button-color`, `premium-feature`
- Development and Production environments
- An evaluation API key
- 24-hour expiry

#### `get_sandbox_code`

Get ready-to-paste integration code for any SDK language.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `language` | enum | Yes | `node`, `python`, `react`, `go`, `java`, `dotnet`, `ruby`, or `vue` |
| `sandbox_id` | string | Yes | Sandbox ID from `create_sandbox` |

**Returns:** `{ success, language, install_cmd, init_cmd, code_snippet, env_key }`

#### `claim_sandbox`

Convert an ephemeral sandbox to a permanent account.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sandbox_id` | string | Yes | Sandbox ID from `create_sandbox` |
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's chosen password (min 8 chars) |
| `name` | string | No | Display name (optional) |

**Returns:** `{ success, claimed, message, user, organization }`

---

## Example Agent Workflow

The canonical agent workflow follows the "sandbox-first" product philosophy:

```
Agent: "I'll help you set up feature flags. Let me create a demo environment."

  → create_sandbox()
  ← { sandbox_id: "sbx_a1b2c3", env_key: "demo_a1b2c3", ... }

Agent: "Your sandbox is ready. I'll generate integration code for Node.js."

  → get_sandbox_code({ language: "node", sandbox_id: "sbx_a1b2c3" })
  ← { install_cmd: "npm install @featuresignals/node", code_snippet: "..." }

Agent: "Paste this code into your app. It initializes the client and evaluates flags."

  [User integrates the code, sees flags working]

Agent: "Ready to make this permanent?"

  → claim_sandbox({ sandbox_id: "sbx_a1b2c3", email: "dev@example.com", password: "..." })
  ← { claimed: true, user: { email: "dev@example.com" } }

Agent: "Your account is now permanent. You can manage flags at https://app.featuresignals.com"
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FS_API_URL` | `http://localhost:8080` | FeatureSignals API base URL |
| `FS_API_KEY` | — | API key for product/sandbox tools |
| `FS_DOCS_URL` | `https://docs.featuresignals.com` | Documentation site base URL |
| `MCP_PORT` | `3456` | HTTP server port (HTTP mode only) |
| `MCP_HOST` | `127.0.0.1` | HTTP server host (HTTP mode only) |
| `FS_API_TIMEOUT_MS` | `10000` | API request timeout in milliseconds |

---

## Architecture

```
┌──────────────────────────────────────────────┐
│              AI Agent (Claude, Cursor, etc.)  │
└──────────────────┬───────────────────────────┘
                   │ MCP Protocol (JSON-RPC)
                   │ over STDIO or HTTP
┌──────────────────▼───────────────────────────┐
│            MCP Server (this package)          │
│                                               │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  docs   │  │ product  │  │   sandbox   │  │
│  │  tools  │  │  tools   │  │    tools    │  │
│  └────┬────┘  └────┬─────┘  └──────┬──────┘  │
│       │            │               │          │
│  ┌────┴────────────┴───────────────┴──────┐   │
│  │          API Client (HTTP)             │   │
│  └────────────────────┬───────────────────┘   │
└───────────────────────┼───────────────────────┘
                        │ HTTP
┌───────────────────────▼───────────────────────┐
│          FeatureSignals API Server             │
│          (localhost:8080 or cloud)             │
└───────────────────────────────────────────────┘
```

---

## Development

```bash
# Clone and install
git clone https://github.com/featuresignals/featuresignals
cd featuresignals/mcp-server
npm install

# Development mode (STDIO)
npm run dev

# Development mode (HTTP)
npx tsx src/index.ts --transport http --port 3456

# Build
npm run build

# Type check
npm run typecheck
```

---

## Requirements

- **Node.js** >= 20.0.0
- **FeatureSignals API** running at `FS_API_URL` (default: `http://localhost:8080`)
- **API Key** (`FS_API_KEY`) for product and sandbox tools (docs tools work without it)

---

## License

Apache 2.0 — see [LICENSE](../../LICENSE) for details.
