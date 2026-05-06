/**
 * STDIO Transport
 *
 * Runs the MCP server over standard input/output — the default transport
 * for local AI agents like Claude Desktop, Cursor, and Zed.
 *
 * This is the simplest deployment model:
 *   1. Install the package globally: npm install -g @featuresignals/mcp-server
 *   2. Configure your AI agent to launch the server
 *   3. The agent communicates via JSON-RPC over stdin/stdout
 *
 * Claude Desktop config example (claude_desktop_config.json):
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

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Start the MCP server over STDIO transport.
 *
 * This function connects the McpServer to stdin/stdout and begins
 * listening for JSON-RPC requests. It blocks until the connection
 * is closed (when the parent process terminates).
 */
export async function startStdioTransport(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();

  // Log to stderr to avoid interfering with the MCP protocol on stdout
  const log = (msg: string): void => {
    process.stderr.write(`[featuresignals-mcp] ${msg}\n`);
  };

  log(`STDIO transport starting`);
  log(`API URL: ${process.env.FS_API_URL ?? "http://localhost:8080"}`);
  log(`API Key: ${process.env.FS_API_KEY ? "***configured***" : "not configured"}`);

  try {
    await server.connect(transport);
    log("STDIO transport connected — ready for requests");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log(`FATAL: Failed to start STDIO transport: ${message}`);
    process.exit(1);
  }
}
