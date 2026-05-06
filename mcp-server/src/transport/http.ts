/**
 * HTTP Transport
 *
 * Runs the MCP server over HTTP — designed for remote or cloud-hosted
 * AI agents that cannot use STDIO (e.g., browser-based agents, CI/CD
 * pipelines, or agents running in separate containers).
 *
 * Architecture:
 *   - POST /mcp — JSON-RPC endpoint (standard MCP protocol)
 *   - GET /health — Health check endpoint
 *   - GET /tools — List available tools (convenience endpoint for debugging)
 *
 * Usage:
 *   npx @featuresignals/mcp-server --transport http --port 3456
 *
 * Environment variables:
 *   - FS_API_URL — FeatureSignals API base URL
 *   - FS_API_KEY — FeatureSignals API key
 *   - MCP_PORT — HTTP server port (default: 3456)
 *   - MCP_HOST — HTTP server host (default: 127.0.0.1)
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HttpTransportConfig {
  host: string;
  port: number;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Logger — stderr only, never stdout (which is reserved for MCP protocol)
// ---------------------------------------------------------------------------

function log(msg: string): void {
  process.stderr.write(`[featuresignals-mcp:http] ${msg}\n`);
}

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

// ---------------------------------------------------------------------------
// JSON-RPC handler
// ---------------------------------------------------------------------------

/**
 * Creates an HTTP request handler that routes:
 *  - POST /mcp → MCP JSON-RPC endpoint
 *  - GET /health → health check
 *  - GET /tools → tool listing (debugging)
 *  - OPTIONS → CORS preflight
 */
function createRequestHandler(
  server: McpServer,
): (req: IncomingMessage, res: ServerResponse) => void {
  return async (req: IncomingMessage, res: ServerResponse) => {
    setCorsHeaders(res);

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    // Health check
    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "featuresignals-mcp" }));
      return;
    }

    // Tool listing (convenience/debugging)
    if (req.method === "GET" && url.pathname === "/tools") {
      try {
        const tools = listTools(server);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ tools }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    // MCP JSON-RPC endpoint
    if (req.method === "POST" && url.pathname === "/mcp") {
      // Read body
      const body = await readBody(req);

      if (!body) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32700, message: "Parse error: empty body" },
          } as JsonRpcResponse),
        );
        return;
      }

      let request: JsonRpcRequest;
      try {
        request = JSON.parse(body) as JsonRpcRequest;
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32700, message: "Parse error: invalid JSON" },
          } as JsonRpcResponse),
        );
        return;
      }

      if (request.jsonrpc !== "2.0") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32600,
              message: "Invalid Request: jsonrpc must be '2.0'",
            },
          } as JsonRpcResponse),
        );
        return;
      }

      // Handle the request through the MCP server
      try {
        const result = await handleMcpRequest(server, request);
        const response: JsonRpcResponse = {
          jsonrpc: "2.0",
          id: request.id,
          result,
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const response: JsonRpcResponse = {
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32603, message: `Internal error: ${message}` },
        };

        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));
      }
      return;
    }

    // 404 for everything else
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  };
}

// ---------------------------------------------------------------------------
// Body reader helper
// ---------------------------------------------------------------------------

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// MCP request handling
// ---------------------------------------------------------------------------

/**
 * Route a JSON-RPC request to the MCP server.
 *
 * Since the McpServer from the SDK is designed for transport-based
 * communication (STDIO or Streamable HTTP), we use a direct approach
 * for the HTTP transport: parse known methods and handle tool calls.
 */
async function handleMcpRequest(
  server: McpServer,
  request: JsonRpcRequest,
): Promise<unknown> {
  switch (request.method) {
    case "initialize":
      return {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "featuresignals-mcp",
          version: "0.1.0",
        },
      };

    case "notifications/initialized":
      return {};

    case "tools/list": {
      const tools = listTools(server);
      return { tools };
    }

    case "tools/call": {
      const toolName = request.params?.name as string | undefined;
      const toolArgs = (request.params?.arguments ?? {}) as Record<
        string,
        unknown
      >;

      if (!toolName) {
        throw new Error("Missing tool name");
      }

      // Invoke the tool through the MCP server's internal handler
      // The MCP SDK stores tool registrations internally
      const result = await invokeTool(server, toolName, toolArgs);
      return result;
    }

    case "ping":
      return {};

    default:
      throw new Error(`Unknown method: ${request.method}`);
  }
}

// ---------------------------------------------------------------------------
// Tool listing — introspect registered tools
// ---------------------------------------------------------------------------

interface ToolInfo {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

function listTools(server: McpServer): ToolInfo[] {
  // The MCP SDK v1 stores tools internally. We access them via a
  // private property. This is a pragmatic approach until the SDK
  // exposes a public method for tool introspection.
  const serverAny = server as unknown as {
    _registeredTools?: Map<
      string,
      {
        description: string;
        inputSchema: {
          _def: unknown;
          shape: Record<string, { _def: { description?: string; typeName: string; values?: string[]; checks?: Array<{ kind: string; value?: unknown }> } }>;
        };
      }
    >;
  };

  const tools: ToolInfo[] = [];

  if (serverAny._registeredTools) {
    for (const [name, registration] of serverAny._registeredTools) {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      // Introspect Zod schema to build JSON Schema
      if (registration.inputSchema?.shape) {
        for (const [key, field] of Object.entries(
          registration.inputSchema.shape,
        )) {
          const fieldDef = field._def;

          const prop: Record<string, unknown> = {
            type: zodTypeToJsonType(fieldDef.typeName),
          };

          if (fieldDef.description) {
            prop.description = fieldDef.description;
          }

          if (fieldDef.values) {
            prop.enum = fieldDef.values;
          }

          // Check for optionality via ZodOptional or ZodDefault
          const isOptional = fieldDef.typeName === "ZodOptional" || fieldDef.typeName === "ZodDefault";
          if (!isOptional) {
            // Check if there's a .optional() or .default() wrapper
            let isRequired = true;
            if (fieldDef.checks) {
              for (const check of fieldDef.checks) {
                if (check.kind === "optional" || check.kind === "default") {
                  isRequired = false;
                  break;
                }
              }
            }
            if (isRequired) {
              required.push(key);
            }
          }

          if (fieldDef.typeName === "ZodRecord" || fieldDef.typeName === "ZodObject") {
            prop.type = "object";
            prop.additionalProperties = true;
          }

          properties[key] = prop;
        }
      }

      tools.push({
        name,
        description: registration.description ?? "",
        inputSchema: {
          type: "object",
          properties,
          ...(required.length > 0 ? { required } : {}),
        },
      });
    }
  }

  return tools;
}

/**
 * Map Zod type names to JSON Schema type names.
 */
function zodTypeToJsonType(zodType: string): string {
  switch (zodType) {
    case "ZodString":
      return "string";
    case "ZodNumber":
      return "number";
    case "ZodBoolean":
      return "boolean";
    case "ZodArray":
      return "array";
    case "ZodObject":
    case "ZodRecord":
      return "object";
    case "ZodEnum":
    case "ZodUnion":
      return "string";
    case "ZodOptional":
    case "ZodDefault":
      return "string";
    default:
      return "string";
  }
}

// ---------------------------------------------------------------------------
// Tool invocation
// ---------------------------------------------------------------------------

async function invokeTool(
  server: McpServer,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  // Access the registered tool handler via internal property
  const serverAny = server as unknown as {
    _registeredTools?: Map<
      string,
      {
        handler: (args: Record<string, unknown>) => Promise<{
          content: Array<{ type: string; text: string }>;
          isError?: boolean;
        }>;
      }
    >;
  };

  const registration = serverAny._registeredTools?.get(toolName);
  if (!registration) {
    throw new Error(`Tool not found: ${toolName}`);
  }

  const result = await registration.handler(args);

  return {
    content: result.content,
    isError: result.isError ?? false,
  };
}

// ---------------------------------------------------------------------------
// Public API — start HTTP server
// ---------------------------------------------------------------------------

/**
 * Start the MCP server over HTTP transport.
 *
 * Creates an HTTP server that routes requests to the MCP server.
 * The server listens on the configured host:port and handles
 * JSON-RPC requests at POST /mcp.
 */
export async function startHttpTransport(
  server: McpServer,
  config?: Partial<HttpTransportConfig>,
): Promise<void> {
  const host = config?.host ?? process.env.MCP_HOST ?? "127.0.0.1";
  const port =
    config?.port ??
    (process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3456);

  const handler = createRequestHandler(server);
  const httpServer = createServer(handler);

  return new Promise((resolve) => {
    httpServer.listen(port, host, () => {
      log(`HTTP transport listening on http://${host}:${port}`);
      log(`MCP endpoint: POST http://${host}:${port}/mcp`);
      log(`Health check: GET http://${host}:${port}/health`);
      log(`API URL: ${process.env.FS_API_URL ?? "http://localhost:8080"}`);
      log(
        `API Key: ${process.env.FS_API_KEY ? "***configured***" : "not configured"}`,
      );

      // Graceful shutdown
      process.on("SIGTERM", () => {
        log("SIGTERM received — shutting down");
        httpServer.close(() => {
          log("HTTP server closed");
          process.exit(0);
        });
      });

      process.on("SIGINT", () => {
        log("SIGINT received — shutting down");
        httpServer.close(() => {
          log("HTTP server closed");
          process.exit(0);
        });
      });

      resolve();
    });
  });
}
