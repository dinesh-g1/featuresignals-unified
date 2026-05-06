import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import type { MDXModule } from "mdx/types";
import { getAdjacentDocs } from "@/content/docs/nav-tree";
import type { DocNavItem } from "@/content/docs/nav-tree";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocFrontmatter {
  title: string;
  description: string;
  /** AI-readable difficulty level */
  ai_difficulty?: "beginner" | "intermediate" | "advanced";
  /** Estimated reading/completion time in minutes */
  ai_estimated_minutes?: number;
  /** Tags for AI content categorization */
  ai_tags?: string[];
  /** Relevant API endpoints */
  api_endpoints?: string[];
  /** SDKs this doc is relevant to */
  sdks_relevant?: string[];
  /** Prerequisite doc paths */
  prerequisites?: string[];
  /** Recommended next doc paths */
  next_steps?: string[];
  /** Arbitrary additional metadata */
  [key: string]: unknown;
}

export interface DocPage {
  /** The URL path slug array, e.g. ["getting-started", "quickstart"] */
  slug: string[];
  /** Parsed frontmatter */
  frontmatter: DocFrontmatter;
  /** Raw markdown/MDX content (without frontmatter) */
  rawContent: string;
  /** The full raw file contents (including frontmatter) */
  rawSource: string;
  /** Absolute file path */
  filePath: string;
}

export interface DocPageRender extends DocPage {
  /** The compiled MDX default export as a React component */
  Content: MDXModule["default"];
  /** Table of contents extracted from headings */
  toc: TocEntry[];
  /** Previous doc in navigation order */
  prev: DocNavItem | null;
  /** Next doc in navigation order */
  next: DocNavItem | null;
}

export interface TocEntry {
  depth: number;
  value: string;
  id: string;
}

export interface DocJsonResponse {
  title: string;
  description: string;
  slug: string;
  path: string;
  sections: DocJsonSection[];
  code_blocks: DocJsonCodeBlock[];
  prerequisites: string[];
  next_steps: string[];
  ai_metadata: {
    difficulty?: string;
    estimated_minutes?: number;
    tags?: string[];
  };
  api_endpoints?: string[];
  sdks_relevant?: string[];
  prev?: { label: string; href: string } | null;
  next?: { label: string; href: string } | null;
}

export interface DocJsonSection {
  heading: string;
  content: string;
}

export interface DocJsonCodeBlock {
  language: string;
  code: string;
  heading?: string;
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

const CONTENT_DOCS_DIR = path.resolve(process.cwd(), "src/content/docs");

/** Resolve a slug array to an absolute file path (tries .mdx then .md) */
function resolveDocPath(slug: string[]): string | null {
  const slugPath = slug.join("/");
  const mdxPath = path.join(CONTENT_DOCS_DIR, `${slugPath}.mdx`);
  if (existsSync(mdxPath)) return mdxPath;
  const mdPath = path.join(CONTENT_DOCS_DIR, `${slugPath}.md`);
  if (existsSync(mdPath)) return mdPath;
  return null;
}

// ---------------------------------------------------------------------------
// Frontmatter parsing — simple YAML subset (no extra dependency)
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseFrontmatter(raw: string): {
  frontmatter: DocFrontmatter;
  content: string;
} {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: { title: "", description: "" }, content: raw };
  }

  const yamlBlock = match[1];
  const content = raw.slice(match[0].length);
  const frontmatter: DocFrontmatter = { title: "", description: "" };

  // Simple YAML key: value parser (handles arrays and nested, but not complex YAML)
  const lines = yamlBlock.split("\n");
  let currentKey: string | null = null;
  let currentArray: string[] = [];

  function flushArray() {
    if (currentKey && currentArray.length > 0) {
      (frontmatter as Record<string, unknown>)[currentKey] = [...currentArray];
      currentArray = [];
      currentKey = null;
    }
  }

  for (const line of lines) {
    // Array item: `  - value`
    const arrayMatch = line.match(/^\s+-\s+(.+)$/);
    if (arrayMatch && currentKey) {
      currentArray.push(arrayMatch[1].trim().replace(/^["']|["']$/g, ""));
      continue;
    }

    // Flush previous array
    flushArray();

    // Key: value
    const kvMatch = line.match(/^(\w[\w_-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let value: string = kvMatch[2].trim();

      // Remove surrounding quotes
      value = value.replace(/^["']|["']$/g, "");

      // Handle quoted strings that may be empty
      if (value === "") {
        currentKey = key;
        continue; // Might be an array indicator
      }

      // Parse numbers
      if (/^-?\d+(\.\d+)?$/.test(value)) {
        (frontmatter as Record<string, unknown>)[key] = Number(value);
      } else if (value === "true" || value === "false") {
        (frontmatter as Record<string, unknown>)[key] = value === "true";
      } else {
        (frontmatter as Record<string, unknown>)[key] = value;
      }
      currentKey = key;
    } else {
      // Empty line or comment — flush
      flushArray();
      currentKey = null;
    }
  }

  flushArray();

  return { frontmatter, content };
}

// ---------------------------------------------------------------------------
// Table of contents extraction
// ---------------------------------------------------------------------------

function extractToc(rawContent: string): TocEntry[] {
  const headingRe = /^(#{2,4})\s+(.+)$/gm;
  const toc: TocEntry[] = [];
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(rawContent)) !== null) {
    const depth = match[1].length;
    const value = match[2].trim();
    const id = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    toc.push({ depth, value, id });
  }
  return toc;
}

// ---------------------------------------------------------------------------
// Code block extraction (for .json response)
// ---------------------------------------------------------------------------

function extractCodeBlocks(rawContent: string): DocJsonCodeBlock[] {
  const codeBlockRe = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: DocJsonCodeBlock[] = [];
  let match: RegExpExecArray | null;

  // Find preceding headings for context
  const lines = rawContent.split("\n");
  const headingMap = new Map<number, string>();
  let lastHeading = "";
  for (let i = 0; i < lines.length; i++) {
    const hMatch = lines[i].match(/^#{2,4}\s+(.+)$/);
    if (hMatch) {
      lastHeading = hMatch[1].trim();
    }
    headingMap.set(i, lastHeading);
  }

  while ((match = codeBlockRe.exec(rawContent)) !== null) {
    const language = match[1] || "text";
    const code = match[2].trim();
    // Find which line this block starts on
    const beforeBlock = rawContent.slice(0, match.index);
    const lineIdx = beforeBlock.split("\n").length - 1;
    blocks.push({
      language,
      code,
      heading: headingMap.get(lineIdx) || undefined,
    });
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Section extraction (for .json response)
// ---------------------------------------------------------------------------

function extractSections(rawContent: string): DocJsonSection[] {
  const sections: DocJsonSection[] = [];
  const headingRe = /^(#{2,3})\s+(.+)$/gm;
  const splits: { index: number; heading: string; level: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRe.exec(rawContent)) !== null) {
    splits.push({
      index: match.index,
      heading: match[1] + " " + match[2],
      level: match[1].length,
    });
  }

  for (let i = 0; i < splits.length; i++) {
    const start = splits[i].index;
    const end = i + 1 < splits.length ? splits[i + 1].index : rawContent.length;
    const content = rawContent.slice(start, end).trim();
    // Extract just the content after the heading
    const headingLineEnd = content.indexOf("\n");
    const body =
      headingLineEnd >= 0 ? content.slice(headingLineEnd + 1).trim() : "";

    sections.push({
      heading: splits[i].heading.replace(/^#+\s*/, ""),
      content: body,
    });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load a doc by slug. Returns null if the file doesn't exist.
 * Does NOT compile MDX — use `renderDoc` for that.
 */
export async function getDoc(slug: string[]): Promise<DocPage | null> {
  const filePath = resolveDocPath(slug);
  if (!filePath) return null;

  const rawSource = await readFile(filePath, "utf-8");
  const { frontmatter, content } = parseFrontmatter(rawSource);

  // Derive title from first heading if not in frontmatter
  if (!frontmatter.title) {
    const h1Match = content.match(/^#\s+(.+)$/m);
    frontmatter.title = h1Match ? h1Match[1].trim() : slug[slug.length - 1];
  }

  return { slug, frontmatter, rawContent: content, rawSource, filePath };
}

/**
 * Load and compile a doc for rendering. Returns null if file doesn't exist.
 */
export async function renderDoc(slug: string[]): Promise<DocPageRender | null> {
  const doc = await getDoc(slug);
  if (!doc) return null;

  // Compile MDX — strip frontmatter since it's already parsed
  const mdxSource = doc.rawSource;
  // We re-add frontmatter body via the content field for compilation
  // Actually, evaluate the full source so MDX can use frontmatter exports
  const compiled = await evaluate(mdxSource, {
    ...runtime,
    development: false,
    // baseUrl is not needed since we resolve imports relative to the file
  });

  const Content = compiled.default;
  const toc = extractToc(doc.rawContent);
  const href = `/docs/${slug.join("/")}`;
  const { prev, next } = getAdjacentDocs(href);

  return {
    ...doc,
    Content,
    toc,
    prev,
    next,
  };
}

/**
 * Build the structured JSON response for a doc page.
 */
export async function getDocJson(
  slug: string[],
): Promise<DocJsonResponse | null> {
  const doc = await getDoc(slug);
  if (!doc) return null;

  const path = `/docs/${slug.join("/")}`;
  const { prev, next } = getAdjacentDocs(path);
  const sections = extractSections(doc.rawContent);
  const codeBlocks = extractCodeBlocks(doc.rawContent);

  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
    slug: slug.join("/"),
    path,
    sections,
    code_blocks: codeBlocks,
    prerequisites: doc.frontmatter.prerequisites ?? [],
    next_steps: doc.frontmatter.next_steps ?? [],
    ai_metadata: {
      difficulty: doc.frontmatter.ai_difficulty,
      estimated_minutes: doc.frontmatter.ai_estimated_minutes,
      tags: doc.frontmatter.ai_tags,
    },
    api_endpoints: doc.frontmatter.api_endpoints,
    sdks_relevant: doc.frontmatter.sdks_relevant,
    prev: prev ? { label: prev.label, href: prev.href } : null,
    next: next ? { label: next.label, href: next.href } : null,
  };
}
