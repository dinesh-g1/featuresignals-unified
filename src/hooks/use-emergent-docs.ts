"use client";

import { useMemo } from "react";
import { getGlossaryEntry } from "@/content/glossary";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmergentDocContext {
  entityType: "flag" | "segment" | "environment" | "webhook" | "project";
  entityKey?: string;
  entityId?: string;
  action?: "viewing" | "creating" | "editing";
}

export interface DocSection {
  title: string;
  content: string;
}

export interface QuickCopySnippet {
  language: string;
  code: string;
}

export interface ApiEndpoint {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  description: string;
}

export interface NextStep {
  label: string;
  href: string;
}

export interface EmergentDocs {
  whatIsThis: DocSection;
  quickCopy: QuickCopySnippet[] | null;
  apiEndpoints: ApiEndpoint[];
  nextSteps: NextStep[];
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// SDK Code Snippets (static — will move to content/snippets/ in Phase 4)
// ---------------------------------------------------------------------------

interface SdkSnippet {
  language: string;
  template: (key: string) => string;
}

const BOOLEAN_FLAG_SNIPPETS: SdkSnippet[] = [
  {
    language: "Node.js",
    template: (key) =>
      `const ${toCamelCase(key)} = await client.flag("${key}", false);\n\nif (${toCamelCase(key)}) {\n  // Feature is enabled for this user\n}`,
  },
  {
    language: "Python",
    template: (key) =>
      `${toSnakeCase(key)} = client.flag("${key}", False)\n\nif ${toSnakeCase(key)}:\n    # Feature is enabled for this user`,
  },
  {
    language: "Go",
    template: (key) =>
      `${toCamelCase(key)}, err := client.Flag(ctx, "${key}", false)\nif err != nil {\n    // handle error\n}\nif ${toCamelCase(key)} {\n    // Feature is enabled for this user\n}`,
  },
  {
    language: "React",
    template: (key) =>
      `const { enabled: ${toCamelCase(key)} } = useFlag("${key}", false);\n\nif (${toCamelCase(key)}) {\n  return <NewFeature />;\n}`,
  },
  {
    language: "Java",
    template: (key) =>
      `boolean ${toCamelCase(key)} = client.flag("${key}", false);\n\nif (${toCamelCase(key)}) {\n    // Feature is enabled for this user\n}`,
  },
  {
    language: ".NET",
    template: (key) =>
      `var ${toCamelCase(key)} = await client.FlagAsync("${key}", false);\n\nif (${toCamelCase(key)}) {\n    // Feature is enabled for this user\n}`,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toCamelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/-/g, "_").toLowerCase();
}

// ---------------------------------------------------------------------------
// Entity-specific data
// ---------------------------------------------------------------------------

function getWhatIsThis(
  entityType: EmergentDocContext["entityType"],
): DocSection {
  const entry = getGlossaryEntry(entityType);

  switch (entityType) {
    case "flag": {
      const releaseEntry = getGlossaryEntry("Release Toggle");
      const experimentEntry = getGlossaryEntry("Experiment Toggle");
      const opsEntry = getGlossaryEntry("Ops Toggle");
      const permissionEntry = getGlossaryEntry("Permission Toggle");

      return {
        title: "What is a Feature Flag?",
        content: [
          entry?.shortDef ?? "",
          "",
          "**Toggle Categories:**",
          `- **Release** — ${releaseEntry?.shortDef ?? ""}`,
          `- **Experiment** — ${experimentEntry?.shortDef ?? ""}`,
          `- **Ops** — ${opsEntry?.shortDef ?? ""}`,
          `- **Permission** — ${permissionEntry?.shortDef ?? ""}`,
          "",
          "Flags evaluate in under 1ms by caching rulesets in memory. No database calls on the hot path.",
        ].join("\n"),
      };
    }
    case "segment":
      return {
        title: "What is a Segment?",
        content: entry?.shortDef ?? "",
      };
    case "environment":
      return {
        title: "What is an Environment?",
        content: entry?.shortDef ?? "",
      };
    case "webhook":
      return {
        title: "What is a Webhook?",
        content: entry?.shortDef ?? "",
      };
    case "project":
      return {
        title: "What is a Project?",
        content: entry?.shortDef ?? "",
      };
  }
}

function getQuickCopy(
  entityType: EmergentDocContext["entityType"],
  entityKey?: string,
): QuickCopySnippet[] | null {
  if (!entityKey) return null;

  switch (entityType) {
    case "flag":
      return BOOLEAN_FLAG_SNIPPETS.map((snippet) => ({
        language: snippet.language,
        code: snippet.template(entityKey),
      }));
    case "segment":
      // Segments don't have a direct SDK call — they're used within flag rules
      return null;
    default:
      return null;
  }
}

function getApiEndpoints(
  entityType: EmergentDocContext["entityType"],
  entityKey?: string,
): ApiEndpoint[] {
  const key = entityKey ?? "{key}";

  switch (entityType) {
    case "flag":
      return [
        {
          method: "GET",
          path: `/v1/flags/${key}`,
          description: "Retrieve a flag by key",
        },
        {
          method: "POST",
          path: "/v1/flags",
          description: "Create a new flag",
        },
        {
          method: "PATCH",
          path: `/v1/flags/${key}`,
          description: "Update flag metadata",
        },
        {
          method: "GET",
          path: `/v1/flags/${key}/state/{envId}`,
          description: "Get flag state for a specific environment",
        },
        {
          method: "PATCH",
          path: `/v1/flags/${key}/state/{envId}`,
          description: "Update targeting rules and rollout",
        },
      ];
    case "segment":
      return [
        {
          method: "GET",
          path: `/v1/segments/${key}`,
          description: "Retrieve a segment by key",
        },
        {
          method: "POST",
          path: "/v1/segments",
          description: "Create a new segment",
        },
        {
          method: "PATCH",
          path: `/v1/segments/${key}`,
          description: "Update segment rules",
        },
      ];
    case "environment":
      return [
        {
          method: "GET",
          path: "/v1/environments",
          description: "List all environments in a project",
        },
        {
          method: "POST",
          path: "/v1/environments",
          description: "Create a new environment",
        },
      ];
    case "webhook":
      return [
        {
          method: "GET",
          path: "/v1/webhooks",
          description: "List all webhooks",
        },
        {
          method: "POST",
          path: "/v1/webhooks",
          description: "Create a new webhook",
        },
        {
          method: "POST",
          path: `/v1/webhooks/{id}/test`,
          description: "Send a test webhook delivery",
        },
      ];
    case "project":
      return [
        {
          method: "GET",
          path: "/v1/projects",
          description: "List all projects",
        },
        {
          method: "POST",
          path: "/v1/projects",
          description: "Create a new project",
        },
        {
          method: "GET",
          path: `/v1/projects/{id}`,
          description: "Get project details",
        },
      ];
  }
}

function getNextSteps(
  entityType: EmergentDocContext["entityType"],
  action?: EmergentDocContext["action"],
): NextStep[] {
  switch (entityType) {
    case "flag":
      if (action === "creating") {
        return [
          { label: "Connect your SDK", href: "/docs/sdk/quickstart" },
          { label: "Add targeting rules", href: "#" },
          { label: "Set up a webhook", href: "/webhooks" },
        ];
      }
      return [
        { label: "Add targeting rules", href: "#" },
        { label: "Create a percentage rollout", href: "#" },
        { label: "Set up a webhook", href: "/webhooks" },
        { label: "View evaluation metrics", href: "/analytics" },
      ];
    case "segment":
      return [
        { label: "Add conditions to this segment", href: "#" },
        { label: "Use this segment in a flag rule", href: "/flags" },
        { label: "Create another segment", href: "/segments" },
      ];
    case "environment":
      return [
        { label: "Compare environments", href: "/env-comparison" },
        { label: "Promote flags between environments", href: "#" },
        { label: "Create API keys for this environment", href: "/api-keys" },
      ];
    case "webhook":
      return [
        { label: "Test this webhook", href: "#" },
        { label: "View delivery history", href: "#" },
        { label: "Configure retry policy", href: "#" },
      ];
    case "project":
      return [
        { label: "Create your first flag", href: "/flags" },
        { label: "Set up environments", href: "#" },
        { label: "Invite team members", href: "/team" },
      ];
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useEmergentDocs — returns contextual documentation data for rendering
 * inline on product pages. Currently hardcoded (Phase 4: CMS-backed).
 *
 * The hook is synchronous (all data is static) but exposes `isLoading` for
 * forward compatibility with async content fetching.
 */
export function useEmergentDocs(context: EmergentDocContext): EmergentDocs {
  const { entityType, entityKey, entityId: _entityId, action } = context;

  return useMemo<EmergentDocs>(() => {
    return {
      whatIsThis: getWhatIsThis(entityType),
      quickCopy: getQuickCopy(entityType, entityKey),
      apiEndpoints: getApiEndpoints(entityType, entityKey),
      nextSteps: getNextSteps(entityType, action),
      isLoading: false,
    };
  }, [entityType, entityKey, action]);
}
