#!/usr/bin/env node

/**
 * FeatureSignals MCP Server
 *
 * Model Context Protocol server that gives AI agents direct, typed access
 * to FeatureSignals documentation, API, and sandbox management.
 *
 * Usage:
 *   # STDIO transport (default — for Claude Desktop, Cursor, local agents)
 *   npx @featuresignals/mcp-server
 *
 *   # HTTP transport (for remote/cloud-hosted agents)
 *   npx @featuresignals/mcp-server --transport http --port 3456
 *
 * Environment variables:
 *   FS_API_URL    — FeatureSignals API base URL (default: http://localhost:8080)
 *   FS_API_KEY    — FeatureSignals API key for authentication
 *   FS_DOCS_URL   — Documentation site base URL (default: https://docs.featuresignals.com)
 *   MCP_PORT      — HTTP server port (default: 3456)
 *   MCP_HOST      — HTTP server host (default: 127.0.0.1)
 *   FS_API_TIMEOUT_MS — API request timeout in ms (default: 10000)
 *
 * Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "featuresignals": {
 *         "command": "npx",
 *         "args": ["-y", "@featuresignals/mcp-server"],
 *         "env": {
 *           "FS_API_URL": "http://localhost:8080",
 *           "FS_API_KEY": "fs_key_your_api_key_here"
 *         }
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createApiClient } from "./lib/api-client.js";
import { registerDocsTools } from "./tools/docs.js";
import { registerProductTools } from "./tools/product.js";
import { registerSandboxTools } from "./tools/sandbox.js";
import { startStdioTransport } from "./transport/stdio.js";
import { startHttpTransport } from "./transport/http.js";

// ---------------------------------------------------------------------------
// Logger — stderr only, never stdout
// ---------------------------------------------------------------------------

function log(msg: string): void {
  process.stderr.write(`[featuresignals-mcp] ${msg}\n`);
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface ServerConfig {
  transport: "stdio" | "http";
  httpPort: number;
  httpHost: string;
  apiUrl: string;
  apiKey?: string;
  docsUrl: string;
}

function loadConfig(): ServerConfig {
  // Parse CLI args for transport mode
  const args = process.argv.slice(2);
  let transport: "stdio" | "http" = "stdio";
  let httpPort = 3456;
  let httpHost = "127.0.0.1";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--transport" && i + 1 < args.length) {
      const mode = args[i + 1];
      if (mode === "http" || mode === "stdio") {
        transport = mode;
      }
      i++;
    } else if (args[i] === "--port" && i + 1 < args.length) {
      const port = parseInt(args[i + 1], 10);
      if (!isNaN(port) && port > 0 && port < 65536) {
        httpPort = port;
      }
      i++;
    } else if (args[i] === "--host" && i + 1 < args.length) {
      httpHost = args[i + 1];
      i++;
    } else if (args[i] === "--help" || args[i] === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return {
    transport,
    httpPort,
    httpHost,
    apiUrl: process.env.FS_API_URL ?? "http://localhost:8080",
    apiKey: process.env.FS_API_KEY,
    docsUrl: process.env.FS_DOCS_URL ?? "https://docs.featuresignals.com",
  };
}

function printHelp(): void {
  // Using process.stdout.write for help text is acceptable since --help
  // is an explicit user command, not MCP protocol communication.
  process.stdout.write(`FeatureSignals MCP Server v0.1.0

Usage: featuresignals-mcp [options]

Options:
  --transport <mode>  Transport mode: stdio (default) or http
  --port <number>     HTTP server port (default: 3456)
  --host <string>     HTTP server host (default: 127.0.0.1)
  --help, -h          Show this help message

Environment variables:
  FS_API_URL          FeatureSignals API base URL (default: http://localhost:8080)
  FS_API_KEY          FeatureSignals API key for authentication
  FS_DOCS_URL         Documentation site base URL (default: https://docs.featuresignals.com)
  MCP_PORT            HTTP server port (default: 3456)
  MCP_HOST            HTTP server host (default: 127.0.0.1)
  FS_API_TIMEOUT_MS   API request timeout in milliseconds (default: 10000)

Examples:
  featuresignals-mcp                              # STDIO transport (default)
  featuresignals-mcp --transport http             # HTTP transport on port 3456
  featuresignals-mcp --transport http --port 9000 # HTTP transport on port 9000
`);
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const config = loadConfig();

  log(`FeatureSignals MCP Server v0.1.0`);
  log(`Transport: ${config.transport}`);
  log(`API URL: ${config.apiUrl}`);
  log(`Docs URL: ${config.docsUrl}`);
  log(
    `API Key: ${config.apiKey ? "***configured***" : "not configured (sandbox + docs tools only)"}`,
  );

  // Create the API client
  const client = createApiClient({
    baseUrl: config.apiUrl,
    apiKey: config.apiKey,
  });

  // Create the MCP server
  const server = new McpServer({
    name: "featuresignals-mcp",
    version: "0.1.0",
  });

  // Register all tool groups
  log("Registering documentation tools...");
  registerDocsTools(server, {
    docsBaseUrl: config.docsUrl,
    client,
  });

  if (config.apiKey) {
    log("Registering product management tools (API key configured)...");
    registerProductTools(server, { client });

    log("Registering sandbox management tools (API key configured)...");
    registerSandboxTools(server, { client });
  } else {
    log(
      "Skipping product + sandbox tools (no FS_API_KEY configured). Set FS_API_KEY to enable flag management and sandbox creation.",
    );
  }

  // Start the appropriate transport
  if (config.transport === "http") {
    await startHttpTransport(server, {
      port: config.httpPort,
      host: config.httpHost,
    });
  } else {
    await startStdioTransport(server);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[featuresignals-mcp] FATAL: ${message}\n`);
  process.exit(1);
});
