/**
 * Documentation Tools
 *
 * MCP tools that give AI agents access to FeatureSignals documentation.
 * These tools search and retrieve structured doc pages, API references,
 * and code examples from the unified docs site.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../lib/api-client.js";
import type {
  DocSearchResult,
  DocPageResponse,
  ApiReferenceResponse,
} from "../lib/types.js";

// ---------------------------------------------------------------------------
// Static documentation index (fallback when unified app is unreachable)
// ---------------------------------------------------------------------------

interface StaticDocEntry {
  title: string;
  slug: string;
  category: string;
  snippet: string;
}

const STATIC_DOC_INDEX: StaticDocEntry[] = [
  {
    title: "Getting Started",
    slug: "getting-started",
    category: "Getting Started",
    snippet:
      "Install FeatureSignals in 5 minutes. Create your first feature flag, connect an SDK, and evaluate flags in your application.",
  },
  {
    title: "Quickstart Guide",
    slug: "getting-started/quickstart",
    category: "Getting Started",
    snippet:
      "Step-by-step guide to setting up FeatureSignals: sign up, create a flag, install an SDK, and evaluate your first flag.",
  },
  {
    title: "Core Concepts",
    slug: "core-concepts",
    category: "Core Concepts",
    snippet:
      "Understand the fundamental concepts: feature flags, environments, targeting rules, segments, and evaluation contexts.",
  },
  {
    title: "Feature Flag Types",
    slug: "core-concepts/flag-types",
    category: "Core Concepts",
    snippet:
      "Boolean, string, number, and JSON flags — when to use each type and how they behave in evaluation.",
  },
  {
    title: "Targeting Rules",
    slug: "core-concepts/targeting-rules",
    category: "Core Concepts",
    snippet:
      "Define who sees what with targeting rules: conditions, operators, match types, percentage rollouts, and rule ordering.",
  },
  {
    title: "SDK Overview",
    slug: "sdks",
    category: "SDKs",
    snippet:
      "FeatureSignals provides SDKs for Node.js, Python, Go, Java, .NET, Ruby, React, and Vue. All support OpenFeature.",
  },
  {
    title: "Node.js SDK",
    slug: "sdks/node",
    category: "SDKs",
    snippet:
      "Install and configure the Node.js/TypeScript SDK. Supports local evaluation, polling, SSE streaming, and OpenFeature provider.",
  },
  {
    title: "React SDK",
    slug: "sdks/react",
    category: "SDKs",
    snippet:
      "React hooks and provider for FeatureSignals. useFlag(), useFlags(), and OpenFeature React bindings.",
  },
  {
    title: "API Reference",
    slug: "api-reference",
    category: "API Reference",
    snippet:
      "Complete REST API reference: authentication, flag management, evaluation, environments, API keys, and webhooks.",
  },
  {
    title: "Evaluation API",
    slug: "api-reference/evaluation",
    category: "API Reference",
    snippet:
      "POST /v1/evaluate, bulk evaluation, client flags endpoint, and SSE streaming. Low-latency flag evaluation.",
  },
  {
    title: "Flag Management API",
    slug: "api-reference/flags",
    category: "API Reference",
    snippet:
      "Create, update, delete, and manage feature flags via the REST API. Full flag lifecycle management.",
  },
  {
    title: "Architecture Overview",
    slug: "architecture",
    category: "Architecture",
    snippet:
      "Hexagonal architecture, multi-tenancy model, evaluation hot path, cache invalidation with PG LISTEN/NOTIFY, and deployment topology.",
  },
  {
    title: "Deployment Guide",
    slug: "deployment",
    category: "Deployment",
    snippet:
      "Deploy FeatureSignals on a single VPS, on-premises, or air-gapped. Docker Compose, K3s, and environment configuration.",
  },
  {
    title: "Self-Hosting",
    slug: "self-hosting",
    category: "Self-Hosting",
    snippet:
      "Complete guide to self-hosting FeatureSignals. Hardware requirements, Docker setup, PostgreSQL configuration, and TLS.",
  },
  {
    title: "Enterprise Features",
    slug: "enterprise",
    category: "Enterprise",
    snippet:
      "SSO (SAML/OIDC), SCIM provisioning, custom roles, audit export, data export, IP allowlists, and MFA.",
  },
  {
    title: "Compliance",
    slug: "compliance",
    category: "Compliance",
    snippet:
      "SOC 2, ISO 27001, GDPR, HIPAA compliance posture. Data protection, encryption standards, and security architecture.",
  },
  {
    title: "Migration Guide",
    slug: "advanced/migration",
    category: "Advanced",
    snippet:
      "Migrate from LaunchDarkly, ConfigCat, Flagsmith, or Unleash. Automated import, pricing comparison, and migration checklist.",
  },
  {
    title: "Tutorials",
    slug: "tutorials",
    category: "Tutorials",
    snippet:
      "Practical tutorials: A/B testing, canary releases, kill switches, environment promotion workflows, and CI/CD integration.",
  },
];

// ---------------------------------------------------------------------------
// Documentation tool registration
// ---------------------------------------------------------------------------

export interface DocsToolOptions {
  /** Unified app base URL for doc JSON endpoints */
  docsBaseUrl: string;
  /** API client for OpenAPI spec retrieval */
  client: ApiClient;
}

/**
 * Register all documentation tools on the MCP server.
 */
export function registerDocsTools(
  server: McpServer,
  options: DocsToolOptions,
): void {
  const { docsBaseUrl } = options;

  // -- search_docs --------------------------------------------------

  server.tool(
    "search_docs",
    `Search FeatureSignals documentation.

Returns ranked documentation pages matching your query. Use this tool when you need to find:
- How to accomplish a specific task with feature flags
- Setup or configuration instructions
- API endpoint documentation
- SDK usage examples
- Architecture concepts or best practices

Each result includes a title, content snippet, URL, and relevance score.`,
    {
      query: z
        .string()
        .min(1)
        .max(200)
        .describe("Search query — natural language or keywords"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe("Maximum number of results to return"),
    },
    async ({ query, limit }) => {
      // Try the unified app's search endpoint first
      const url = `${docsBaseUrl}/docs/search?q=${encodeURIComponent(query)}&limit=${String(limit)}`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5_000);

        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          const data = (await response.json()) as {
            results: DocSearchResult[];
          };
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    query,
                    total: data.results.length,
                    results: data.results,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }
      } catch {
        // Fall through to static search
      }

      // Fallback: static index search
      const q = query.toLowerCase();
      const results = STATIC_DOC_INDEX.filter(
        (entry) =>
          entry.title.toLowerCase().includes(q) ||
          entry.snippet.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q),
      )
        .slice(0, limit)
        .map(
          (entry): DocSearchResult => ({
            title: entry.title,
            snippet: entry.snippet,
            url: `https://docs.featuresignals.com/docs/${entry.slug}`,
            relevance: entry.title.toLowerCase().includes(q) ? 0.9 : 0.6,
            category: entry.category,
          }),
        );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                query,
                total: results.length,
                source: "static_index",
                results,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // -- get_doc ------------------------------------------------------

  server.tool(
    "get_doc",
    `Retrieve a full FeatureSignals documentation page in structured JSON.

Returns the complete documentation page including:
- Title, description, and AI metadata (difficulty, estimated time, tags)
- All sections with headings and content
- Code blocks with language annotations
- Prerequisites and recommended next steps
- Previous/next navigation

Use this tool when an agent needs complete information about a specific topic.`,
    {
      path: z
        .string()
        .min(1)
        .max(100)
        .describe(
          "Documentation path slug, e.g. 'getting-started/quickstart' or 'sdks/node'",
        ),
    },
    async ({ path: docPath }) => {
      // Normalize the path
      const cleanPath = docPath.replace(/^\/+|\/+$/g, "");

      // Try the unified app's JSON endpoint
      const url = `${docsBaseUrl}/docs/${cleanPath}.json`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8_000);

        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          const data = (await response.json()) as DocPageResponse;
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        if (response.status === 404) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: `Documentation page not found: "${cleanPath}"`,
                    suggestion:
                      "Use search_docs to find available documentation pages.",
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      } catch {
        // Fall through to error
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: `Could not retrieve documentation page: "${cleanPath}"`,
                suggestion:
                  "The unified docs site may be unavailable. Try search_docs for offline documentation access.",
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    },
  );

  // -- get_api_reference --------------------------------------------

  server.tool(
    "get_api_reference",
    `Retrieve detailed API reference for a FeatureSignals API endpoint.

Returns:
- HTTP method and full path
- Parameter descriptions (path, query, header, body)
- Request body schema with examples
- Response schema with status codes
- Curl and code examples

Use this tool when an agent needs to know how to call a specific FeatureSignals API endpoint.`,
    {
      endpoint: z
        .string()
        .min(1)
        .max(100)
        .describe(
          "API endpoint path pattern, e.g. '/v1/evaluate', '/v1/flags', or '/v1/projects/{projectID}/flags'",
        ),
    },
    async ({ endpoint }) => {
      // Fetch the OpenAPI spec from the FeatureSignals API
      const result =
        await options.client.get<Record<string, unknown>>("/v1/openapi.json");

      if (!result.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: `Could not retrieve API specification: ${result.error}`,
                  suggestion:
                    "Ensure the FeatureSignals API is running and accessible.",
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      const spec = result.data;
      const paths = spec.paths as
        | Record<string, Record<string, unknown>>
        | undefined;

      if (!paths) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { error: "OpenAPI spec has no paths defined." },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      // Find the endpoint — exact match or pattern match
      let matchedPath = endpoint;
      let matchedMethod = "get";

      // If endpoint includes a method prefix like "POST /v1/evaluate"
      const methodPathMatch = endpoint.match(
        /^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/i,
      );
      if (methodPathMatch) {
        matchedMethod = methodPathMatch[1].toLowerCase();
        matchedPath = methodPathMatch[2];
      }

      // Try exact match first, then fuzzy
      let pathEntry = paths[matchedPath];
      let actualPath = matchedPath;

      if (!pathEntry) {
        // Try to find a matching path pattern
        for (const [pattern, methods] of Object.entries(paths)) {
          // Convert OpenAPI pattern to regex
          const regexPattern = pattern.replace(/\{[^}]+\}/g, "[^/]+");
          if (new RegExp(`^${regexPattern}$`).test(matchedPath)) {
            pathEntry = methods;
            actualPath = pattern;
            break;
          }
        }
      }

      if (!pathEntry) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: `API endpoint not found: "${endpoint}"`,
                  available_endpoints: Object.keys(paths),
                  suggestion:
                    "Check the endpoint path and try again. Use the exact OpenAPI path pattern.",
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      // Get the specific method
      const methodEntry = pathEntry[matchedMethod] as
        | Record<string, unknown>
        | undefined;
      if (!methodEntry) {
        const availableMethods = Object.keys(pathEntry);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: `Method ${matchedMethod.toUpperCase()} not available for ${actualPath}`,
                  available_methods: availableMethods,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      // Build the API reference response
      const parameters =
        (methodEntry.parameters as Array<Record<string, unknown>>) ?? [];
      const requestBody = methodEntry.requestBody as
        | Record<string, unknown>
        | undefined;
      const responses = methodEntry.responses as
        | Record<string, Record<string, unknown>>
        | undefined;

      const apiRef: ApiReferenceResponse = {
        method: matchedMethod.toUpperCase(),
        path: actualPath,
        description:
          (methodEntry.description as string) ??
          (methodEntry.summary as string) ??
          "",
        parameters: parameters.map((p) => ({
          name: p.name as string,
          in: (p.in as ApiReferenceResponse["parameters"][0]["in"]) ?? "query",
          required: (p.required as boolean) ?? false,
          type:
            ((p.schema as Record<string, unknown>)?.type as string) ?? "string",
          description: (p.description as string) ?? "",
          default: p.default as string | undefined,
        })),
        requestBody: requestBody
          ? {
              contentType: "application/json",
              schema:
                ((
                  requestBody.content as Record<string, Record<string, unknown>>
                )?.["application/json"]?.schema as Record<string, unknown>) ??
                {},
              example: (
                requestBody.content as Record<string, Record<string, unknown>>
              )?.["application/json"]?.example as
                | Record<string, unknown>
                | undefined,
            }
          : undefined,
        response: {
          status: 200,
          contentType: "application/json",
          schema:
            ((
              responses?.["200"]?.content as Record<
                string,
                Record<string, unknown>
              >
            )?.["application/json"]?.schema as Record<string, unknown>) ?? {},
          description: (responses?.["200"]?.description as string) ?? "Success",
        },
        examples: [],
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(apiRef, null, 2),
          },
        ],
      };
    },
  );
}
