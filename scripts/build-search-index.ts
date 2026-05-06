#!/usr/bin/env npx tsx
// =============================================================================
// Build-time Search Index Generator
//
// Walks content directories, reads the glossary, and produces a unified
// search index as public/search-index.json consumed by the ⌘K palette.
//
// Usage:
//   npx tsx scripts/build-search-index.ts         (standalone)
//   npm run build:search                          (via package.json)
//
// No external dependencies beyond Node.js stdlib and the glossary module.
// =============================================================================

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAllGlossaryEntries,
  type GlossaryEntry,
} from "../src/content/glossary/glossary.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchIndexEntry {
  id: string;
  category: "action" | "documentation" | "api" | "product" | "glossary";
  title: string;
  description: string;
  url: string;
  fragment?: string;
  headings?: string[];
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "src", "content", "docs");
const BLOG_DIR = path.join(ROOT, "src", "content", "blog");
const OUTPUT_PATH = path.join(ROOT, "public", "search-index.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively walk a directory, returning paths to all .mdx files. */
function walkMdxFiles(dir: string): string[] {
  const result: string[] = [];

  if (!fs.existsSync(dir)) {
    return result;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkMdxFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      result.push(full);
    }
  }

  return result;
}

/** Parse YAML-style frontmatter between --- delimiters. */
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const result: Record<string, string> = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    // Match: key: "value"  or  key: 'value'  or  key: value
    const kv = line.match(/^(\w[\w-]*):\s*(.+?)\s*$/);
    if (kv) {
      const key = kv[1];
      let value = kv[2].trim();
      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
  }
  return result;
}

/** Extract ## headings from MDX content. */
function extractHeadings(content: string): string[] {
  const headings: string[] = [];
  const regex = /^##\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    headings.push(match[1]);
  }
  return headings;
}

/** Generate a URL-safe slug from heading text. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Convert a filesystem path (relative to the content root) into a URL path.
 * e.g.  getting-started/quickstart.mdx  →  /docs/getting-started/quickstart
 */
function filePathToUrl(
  filePath: string,
  contentRoot: string,
  urlPrefix: string,
): string {
  const relative = path.relative(contentRoot, filePath);
  const withoutExt = relative.replace(/\.mdx$/, "");
  // Normalize to forward-slashed URL path
  const urlPath = withoutExt.split(path.sep).join("/");
  return `${urlPrefix}/${urlPath}`;
}

// ---------------------------------------------------------------------------
// Static / Hardcoded Entries
// ---------------------------------------------------------------------------

function buildStaticActions(): SearchIndexEntry[] {
  return [
    {
      id: "action-create-flag",
      category: "action",
      title: "Create a flag",
      description: "Create a new feature flag",
      url: "/flags/new",
    },
    {
      id: "action-create-segment",
      category: "action",
      title: "Create a segment",
      description: "Create a reusable user segment",
      url: "/segments/new",
    },
    {
      id: "action-create-environment",
      category: "action",
      title: "Add an environment",
      description: "Add a new environment to a project",
      url: "/projects",
    },
    {
      id: "action-create-targeting-rule",
      category: "action",
      title: "Add a targeting rule",
      description: "Add a targeting rule to a flag",
      url: "/flags",
    },
    {
      id: "action-view-audit-log",
      category: "action",
      title: "View audit log",
      description: "Inspect flag and segment change history",
      url: "/audit-log",
    },
  ];
}

function buildStaticApiEndpoints(): SearchIndexEntry[] {
  return [
    {
      id: "api-list-flags",
      category: "api",
      title: "GET /v1/flags",
      description: "List all feature flags in a project",
      url: "/docs/api-reference/v1/flags",
    },
    {
      id: "api-get-flag",
      category: "api",
      title: "GET /v1/flags/{key}",
      description: "Get a single flag by key",
      url: "/docs/api-reference/v1/flags",
    },
    {
      id: "api-create-flag",
      category: "api",
      title: "POST /v1/flags",
      description: "Create a new feature flag",
      url: "/docs/api-reference/v1/flags",
    },
    {
      id: "api-evaluate",
      category: "api",
      title: "POST /v1/evaluate",
      description: "Evaluate flags for a user context",
      url: "/docs/api-reference/v1/evaluate",
    },
    {
      id: "api-bulk-evaluate",
      category: "api",
      title: "POST /v1/evaluate/bulk",
      description: "Evaluate all flags for a user context at once",
      url: "/docs/api-reference/v1/evaluate",
    },
    {
      id: "api-list-segments",
      category: "api",
      title: "GET /v1/segments",
      description: "List all segments in a project",
      url: "/docs/api-reference/v1/segments",
    },
    {
      id: "api-create-segment",
      category: "api",
      title: "POST /v1/segments",
      description: "Create a reusable user segment",
      url: "/docs/api-reference/v1/segments",
    },
    {
      id: "api-targeting-rules",
      category: "api",
      title: "POST /v1/targeting-rules",
      description: "Create or update targeting rules for a flag",
      url: "/docs/api-reference/v1/targeting-rules",
    },
    {
      id: "api-audit-log",
      category: "api",
      title: "GET /v1/audit-log",
      description: "Query the audit log for change history",
      url: "/docs/api-reference/v1/audit-log",
    },
  ];
}

function buildStaticProductPages(): SearchIndexEntry[] {
  return [
    {
      id: "product-flags",
      category: "product",
      title: "Feature Flags",
      description: "Manage your feature flags",
      url: "/flags",
    },
    {
      id: "product-segments",
      category: "product",
      title: "Segments",
      description: "Reusable user segments for targeting",
      url: "/segments",
    },
    {
      id: "product-analytics",
      category: "product",
      title: "Analytics",
      description: "Flag evaluation metrics and insights",
      url: "/analytics",
    },
    {
      id: "product-pricing",
      category: "product",
      title: "Pricing",
      description: "Free, Pro, and Enterprise plans",
      url: "/pricing",
    },
    {
      id: "product-dashboard",
      category: "product",
      title: "Dashboard",
      description: "Your feature flag dashboard",
      url: "/projects",
    },
    {
      id: "product-audit-log",
      category: "product",
      title: "Audit Log",
      description: "Full change history for compliance",
      url: "/audit-log",
    },
    {
      id: "product-settings",
      category: "product",
      title: "Settings",
      description: "Organization and project settings",
      url: "/settings",
    },
  ];
}

function buildStaticDocs(): SearchIndexEntry[] {
  return [
    {
      id: "doc-quickstart",
      category: "documentation",
      title: "Quickstart Guide",
      description: "Get started with FeatureSignals in 5 minutes",
      url: "/docs/getting-started/quickstart",
    },
    {
      id: "doc-migration",
      category: "documentation",
      title: "Migrating from LaunchDarkly",
      description: "Import flags, segments, and environments",
      url: "/docs/getting-started/migrate-from-launchdarkly",
    },
    {
      id: "doc-targeting",
      category: "documentation",
      title: "Targeting & Segments",
      description: "Define which users see which flag values",
      url: "/docs/core-concepts/targeting-and-segments",
    },
    {
      id: "doc-rollouts",
      category: "documentation",
      title: "Percentage Rollouts",
      description: "Gradual releases to a percentage of users",
      url: "/docs/core-concepts/percentage-rollouts",
    },
    {
      id: "doc-flags",
      category: "documentation",
      title: "Feature Flags",
      description: "Understanding feature flags and toggle categories",
      url: "/docs/core-concepts/feature-flags",
    },
  ];
}

// ---------------------------------------------------------------------------
// Content walkers
// ---------------------------------------------------------------------------

function buildEntriesFromDocs(): SearchIndexEntry[] {
  const entries: SearchIndexEntry[] = [];
  const files = walkMdxFiles(DOCS_DIR);

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const fm = parseFrontmatter(content);
      const headings = extractHeadings(content);

      // Derive a stable id from the relative path
      const relative = path.relative(DOCS_DIR, filePath);
      const id =
        "doc-" +
        relative
          .replace(/\.mdx$/, "")
          .split(path.sep)
          .join("-");

      // Title from frontmatter, fallback to filename
      const title =
        fm.title ??
        path
          .basename(filePath, ".mdx")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

      const url = filePathToUrl(filePath, DOCS_DIR, "/docs");

      entries.push({
        id,
        category: "documentation",
        title,
        description: fm.description ?? "",
        url,
        headings: headings.length > 0 ? headings : undefined,
      });
    } catch (err) {
      // Skip files that can't be read — don't break the build
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Warning: could not read ${filePath}: ${message}`);
    }
  }

  return entries;
}

function buildEntriesFromBlog(): SearchIndexEntry[] {
  const entries: SearchIndexEntry[] = [];
  const files = walkMdxFiles(BLOG_DIR);

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const fm = parseFrontmatter(content);

      const relative = path.relative(BLOG_DIR, filePath);
      const id =
        "blog-" +
        relative
          .replace(/\.mdx$/, "")
          .split(path.sep)
          .join("-");

      const title =
        fm.title ??
        path
          .basename(filePath, ".mdx")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

      const url = filePathToUrl(filePath, BLOG_DIR, "/blog");

      entries.push({
        id,
        category: "documentation",
        title,
        description: fm.description ?? fm.excerpt ?? "",
        url,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Warning: could not read ${filePath}: ${message}`);
    }
  }

  return entries;
}

function buildEntriesFromGlossary(): SearchIndexEntry[] {
  const entries: SearchIndexEntry[] = [];
  let glossaryEntries: GlossaryEntry[];

  try {
    glossaryEntries = getAllGlossaryEntries();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Warning: could not load glossary: ${message}`);
    return entries;
  }

  for (const entry of glossaryEntries) {
    const slug = slugify(entry.term);
    entries.push({
      id: `glossary-${slug}`,
      category: "glossary",
      title: entry.term,
      description: entry.shortDef,
      url: `/docs/glossary#${slug}`,
      fragment: slug,
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const entries: SearchIndexEntry[] = [
    ...buildStaticActions(),
    ...buildStaticDocs(),
    ...buildEntriesFromDocs(),
    ...buildStaticApiEndpoints(),
    ...buildStaticProductPages(),
    ...buildEntriesFromBlog(),
    ...buildEntriesFromGlossary(),
  ];

  // Deduplicate by id — first entry wins (hardcoded > file-derived)
  const seen = new Set<string>();
  const deduped: SearchIndexEntry[] = [];
  for (const entry of entries) {
    if (!seen.has(entry.id)) {
      seen.add(entry.id);
      deduped.push(entry);
    }
  }

  // Ensure the public directory exists
  const publicDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(deduped, null, 2), "utf-8");

  const counts: Record<string, number> = {};
  for (const entry of deduped) {
    counts[entry.category] = (counts[entry.category] ?? 0) + 1;
  }

  const summary = Object.entries(counts)
    .map(([cat, n]) => `  ${cat}: ${n}`)
    .join("\n");

  // Write summary to stderr so it doesn't contaminate stdout
  process.stderr.write(
    `search-index: wrote ${deduped.length} entries to ${path.relative(ROOT, OUTPUT_PATH)}\n${summary}\n`,
  );
}

main();
