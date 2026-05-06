/**
 * Product Tools
 *
 * MCP tools for managing feature flags — create, evaluate, list, and
 * preview migrations. These tools map directly to the FeatureSignals
 * management API and require an API key with appropriate permissions.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../lib/api-client.js";
import type {
  Flag,
  EvalResult,
  MigrationPreviewResponse,
  MigrationProvider,
} from "../lib/types.js";

// ---------------------------------------------------------------------------
// Validation constants
// ---------------------------------------------------------------------------

const FLAG_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_-]{0,99}$/;
const VALID_FLAG_TYPES = ["boolean", "string", "number", "json"] as const;
const VALID_MIGRATION_PROVIDERS = [
  "launchdarkly",
  "configcat",
  "flagsmith",
  "unleash",
] as const;

// ---------------------------------------------------------------------------
// Input validation helpers
// ---------------------------------------------------------------------------

function validateFlagKey(key: string): string | null {
  if (!key || key.length === 0) return "Flag key is required";
  if (!FLAG_KEY_RE.test(key))
    return "Flag key must start with a letter and contain only letters, numbers, hyphens, and underscores (max 100 chars)";
  return null;
}

function validateEnvKey(envKey: string): string | null {
  if (!envKey || envKey.length === 0) return "Environment key is required";
  if (envKey.length > 100)
    return "Environment key must be at most 100 characters";
  return null;
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export interface ProductToolOptions {
  client: ApiClient;
}

/**
 * Register all product management tools on the MCP server.
 */
export function registerProductTools(
  server: McpServer,
  options: ProductToolOptions,
): void {
  const { client } = options;

  // -- create_flag --------------------------------------------------

  server.tool(
    "create_flag",
    `Create a new feature flag in FeatureSignals.

Requires an API key with write access. The flag is created in the specified
environment and project.

Flag types:
- boolean: Simple on/off toggle (default)
- string: String value variations
- number: Numeric value variations
- json: Arbitrary JSON value variations

Returns the created flag with its ID, key, name, type, and default value.`,
    {
      key: z
        .string()
        .min(1)
        .max(100)
        .describe(
          "Flag key — unique identifier, e.g. 'new-checkout' or 'dark-mode-v2'",
        ),
      name: z
        .string()
        .min(1)
        .max(255)
        .describe("Human-readable flag name, e.g. 'New Checkout Flow'"),
      type: z
        .enum(VALID_FLAG_TYPES)
        .default("boolean")
        .describe("Flag value type: boolean, string, number, or json"),
      default_value: z
        .union([z.boolean(), z.string(), z.number(), z.record(z.unknown())])
        .default(false)
        .describe("Default value when no targeting rules match"),
      description: z
        .string()
        .max(1000)
        .optional()
        .describe("Optional description of what this flag controls"),
      tags: z
        .array(z.string().max(100))
        .max(20)
        .optional()
        .describe("Optional tags for organization and filtering"),
      project_id: z
        .string()
        .min(1)
        .describe("Project ID where the flag will be created"),
    },
    async ({
      key,
      name,
      type,
      default_value,
      description,
      tags,
      project_id,
    }) => {
      // Validate key format
      const keyError = validateFlagKey(key);
      if (keyError) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: keyError }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const payload = {
        key,
        name,
        flag_type: type,
        default_value,
        description: description ?? "",
        tags: tags ?? [],
        project_id,
      };

      const result = await client.post<Flag>("/v1/flags", payload);

      if (!result.ok) {
        const statusText =
          result.status === 409
            ? "A flag with this key already exists in this project"
            : result.status === 422
              ? "Validation failed — check your inputs"
              : result.status === 401
                ? "Authentication failed — check your API key"
                : result.status === 403
                  ? "Insufficient permissions — your API key lacks write access"
                  : result.error;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: statusText,
                  status: result.status,
                  request_id: result.requestId,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: true, flag: result.data }, null, 2),
          },
        ],
      };
    },
  );

  // -- evaluate_flag ------------------------------------------------

  server.tool(
    "evaluate_flag",
    `Evaluate a single feature flag for a given context.

Returns the flag's value and the reason for that value. The evaluation
is performed server-side against the current flag configuration.

Use this tool when an agent needs to check what value a flag resolves to
for a specific user, session, or context.

Requires an API key with evaluation access.`,
    {
      flag_key: z
        .string()
        .min(1)
        .max(100)
        .describe("Flag key to evaluate, e.g. 'new-checkout'"),
      env_key: z
        .string()
        .min(1)
        .max(100)
        .describe(
          "Environment key, e.g. 'development', 'staging', 'production'",
        ),
      context_key: z
        .string()
        .max(255)
        .optional()
        .describe("User/session key for targeting, e.g. 'user-123'"),
      attributes: z
        .record(z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe(
          "Context attributes for rule matching, e.g. { plan: 'enterprise', country: 'US' }",
        ),
    },
    async ({ flag_key, env_key, context_key, attributes }) => {
      // Validate inputs
      const keyError = validateFlagKey(flag_key);
      if (keyError) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: keyError }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const envError = validateEnvKey(env_key);
      if (envError) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: envError }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const payload = {
        flag_key,
        environment: env_key,
        key: context_key ?? "anonymous",
        attributes: attributes ?? {},
      };

      const result = await client.post<EvalResult>("/v1/evaluate", payload);

      if (!result.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: result.error,
                  status: result.status,
                  request_id: result.requestId,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { success: true, evaluation: result.data },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // -- list_flags ---------------------------------------------------

  server.tool(
    "list_flags",
    `List all feature flags in a project.

Returns an array of flags with their current configuration including
key, name, type, status, tags, default value, and timestamps.

Use this tool when an agent needs to discover available flags or
understand the current flag inventory.

Requires an API key with read access.`,
    {
      project_id: z.string().min(1).describe("Project ID to list flags from"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe("Maximum number of flags to return"),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe("Number of flags to skip (pagination)"),
    },
    async ({ project_id, limit, offset }) => {
      const result = await client.get<{
        data: Flag[];
        total: number;
      }>(`/v1/projects/${encodeURIComponent(project_id)}/flags`, {
        limit: String(limit),
        offset: String(offset),
      });

      if (!result.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: result.error,
                  status: result.status,
                  request_id: result.requestId,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                total: result.data.total,
                flags: result.data.data,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // -- get_migration_preview ----------------------------------------

  server.tool(
    "get_migration_preview",
    `Preview a migration from another feature flag provider to FeatureSignals.

Performs a dry-run analysis of your existing feature flags, showing:
- How many flags, environments, and segments will be migrated
- Estimated migration time
- Cost comparison between your current provider and FeatureSignals

Supported providers: LaunchDarkly, ConfigCat, Flagsmith, Unleash

Use this tool when an agent is helping a user evaluate switching to
FeatureSignals from another provider. This is a read-only analysis —
no data is modified.`,
    {
      provider: z
        .enum(VALID_MIGRATION_PROVIDERS as unknown as [string, ...string[]])
        .describe("Current feature flag provider to migrate from"),
      api_key: z
        .string()
        .min(1)
        .describe(
          "API key from your current provider (used for read-only analysis)",
        ),
    },
    async ({ provider, api_key }) => {
      const result = await client.post<MigrationPreviewResponse>(
        "/v1/public/migration/preview",
        {
          provider,
          api_key,
        },
      );

      if (!result.ok) {
        const statusText =
          result.status === 429
            ? "Rate limited — please wait before trying again"
            : result.status === 422
              ? "Could not connect to the provider with the provided API key"
              : result.error;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: statusText,
                  status: result.status,
                  request_id: result.requestId,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      const preview = result.data;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                preview: {
                  flags_count: preview.flags.length,
                  environments_count: preview.environments.length,
                  segments_count: preview.segments,
                  estimated_migration_time: preview.estimated_migration_time,
                  pricing: preview.pricing_comparison,
                  imported_flags: preview.flags.map((f) => ({
                    key: f.key,
                    name: f.name,
                    type: f.type,
                    environments: f.environments,
                    rules: f.rules,
                  })),
                  imported_environments: preview.environments.map((e) => ({
                    name: e.name,
                    key: e.key,
                  })),
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
