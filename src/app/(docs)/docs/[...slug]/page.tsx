import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { renderDoc, getDoc, getDocJson } from "@/lib/docs";
import { DocsBreadcrumbs } from "@/components/docs/breadcrumbs";
import { PrevNextNav } from "@/components/docs/prev-next-nav";
import { DOCS_URL } from "@/lib/external-urls";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const { slug, format } = parseSlug(rawSlug);

  // For .md and .json variants, use minimal metadata
  if (format !== "html") {
    return { title: `${slug.join("/")}.${format}` };
  }

  const doc = await getDoc(slug);
  if (!doc) {
    return { title: "Not Found" };
  }

  const path = `/docs/${slug.join("/")}`;

  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
    alternates: {
      canonical: `${DOCS_URL}${path}`,
      types: {
        "text/markdown": `${DOCS_URL}${path}.md`,
        "application/json": `${DOCS_URL}${path}.json`,
      },
    },
    openGraph: {
      title: doc.frontmatter.title,
      description: doc.frontmatter.description,
      type: "article",
      url: `${DOCS_URL}${path}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DocsPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const { slug, format } = parseSlug(rawSlug);

  // --- Markdown variant ---
  if (format === "md") {
    return <MarkdownResponse slug={slug} />;
  }

  // --- JSON variant ---
  if (format === "json") {
    return <JsonResponse slug={slug} />;
  }

  // --- HTML variant (default) ---
  const doc = await renderDoc(slug);
  if (!doc) notFound();

  const { Content, frontmatter, toc, prev, next } = doc;
  const path = `/docs/${slug.join("/")}`;

  // Build breadcrumbs from slug
  const breadcrumbItems = buildBreadcrumbs(slug, frontmatter.title);

  return (
    <article className="prose-container">
      {/* Breadcrumbs */}
      <DocsBreadcrumbs items={breadcrumbItems} className="mb-6" />

      {/* AI-readable metadata (visually hidden but accessible to screen readers and crawlers) */}
      <AiMetadataSection frontmatter={frontmatter} path={path} />

      {/* Page title */}
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fgColor-default)] mt-0 mb-4">
        {frontmatter.title}
      </h1>

      {/* Description */}
      {frontmatter.description && (
        <p className="text-lg text-[var(--fgColor-muted)] leading-relaxed mb-6">
          {frontmatter.description}
        </p>
      )}

      {/* AI metadata badge row */}
      <AiMetadataBadges frontmatter={frontmatter} />

      {/* Table of contents (for longer pages) */}
      {toc.length > 3 && <TableOfContents toc={toc} />}

      {/* Main content — rendered MDX */}
      <div className="mt-6">
        <Content components={mdxComponents} />
      </div>

      {/* Previous / Next navigation */}
      <PrevNextNav prev={prev} next={next} />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Format variants — Raw Markdown & JSON
// ---------------------------------------------------------------------------

async function MarkdownResponse({ slug }: { slug: string[] }) {
  const doc = await getDoc(slug);
  if (!doc) notFound();

  return (
    <pre className="whitespace-pre-wrap font-mono text-sm text-[var(--fgColor-muted)]">
      {doc.rawSource}
    </pre>
  );
}

async function JsonResponse({ slug }: { slug: string[] }) {
  const json = await getDocJson(slug);
  if (!json) notFound();

  return (
    <pre className="whitespace-pre-wrap font-mono text-sm text-[var(--fgColor-muted)]">
      {JSON.stringify(json, null, 2)}
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Slug parsing — detect .md and .json format suffixes
// ---------------------------------------------------------------------------

function parseSlug(rawSlug: string[]): {
  slug: string[];
  format: "html" | "md" | "json";
} {
  if (rawSlug.length === 0) {
    return { slug: [], format: "html" };
  }

  const last = rawSlug[rawSlug.length - 1];
  if (last.endsWith(".md")) {
    return {
      slug: [
        ...rawSlug.slice(0, -1),
        last.replace(/\.md$/, ""),
      ],
      format: "md",
    };
  }
  if (last.endsWith(".json")) {
    return {
      slug: [
        ...rawSlug.slice(0, -1),
        last.replace(/\.json$/, ""),
      ],
      format: "json",
    };
  }
  return { slug: rawSlug, format: "html" };
}

// ---------------------------------------------------------------------------
// Breadcrumbs builder
// ---------------------------------------------------------------------------

function buildBreadcrumbs(
  slug: string[],
  pageTitle: string,
): { label: string; href?: string }[] {
  const items: { label: string; href?: string }[] = [
    { label: "Docs", href: "/docs" },
  ];

  let accumulated = "";
  for (let i = 0; i < slug.length - 1; i++) {
    accumulated += `/${slug[i]}`;
    items.push({
      label: formatBreadcrumbLabel(slug[i]),
      href: `/docs${accumulated}`,
    });
  }

  // Last item is the page title (no link)
  items.push({ label: pageTitle });

  return items;
}

function formatBreadcrumbLabel(slugPart: string): string {
  return slugPart
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// AI Metadata section (visually hidden, accessible to agents)
// ---------------------------------------------------------------------------

function AiMetadataSection({
  frontmatter,
  path,
}: {
  frontmatter: Record<string, unknown>;
  path: string;
}) {
  const aiFields = [
    "ai_difficulty",
    "ai_estimated_minutes",
    "ai_tags",
    "api_endpoints",
    "sdks_relevant",
    "prerequisites",
    "next_steps",
  ];

  const hasAiData = aiFields.some((f) => frontmatter[f] != null);
  if (!hasAiData) return null;

  return (
    <section
      aria-label="AI metadata"
      className="sr-only"
      data-ai-metadata={JSON.stringify(
        Object.fromEntries(
          aiFields
            .filter((f) => frontmatter[f] != null)
            .map((f) => [f, frontmatter[f]]),
        ),
      )}
      data-doc-path={path}
    />
  );
}

// ---------------------------------------------------------------------------
// AI Metadata badges (visible)
// ---------------------------------------------------------------------------

function AiMetadataBadges({
  frontmatter,
}: {
  frontmatter: Record<string, unknown>;
}) {
  const difficulty = frontmatter.ai_difficulty as string | undefined;
  const minutes = frontmatter.ai_estimated_minutes as number | undefined;
  const tags = frontmatter.ai_tags as string[] | undefined;

  if (!difficulty && !minutes && !tags?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {difficulty && (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            difficulty === "beginner"
              ? "bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)]"
              : difficulty === "intermediate"
                ? "bg-[var(--bgColor-attention-muted)] text-[var(--fgColor-attention)]"
                : "bg-[var(--bgColor-danger-muted)] text-[var(--fgColor-danger)]"
          }`}
        >
          {difficulty}
        </span>
      )}
      {minutes != null && (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)] border border-[var(--borderColor-default)]">
          ~{minutes} min read
        </span>
      )}
      {tags?.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table of Contents
// ---------------------------------------------------------------------------

function TableOfContents({
  toc,
}: {
  toc: { depth: number; value: string; id: string }[];
}) {
  return (
    <nav
      aria-label="Table of contents"
      className="mb-8 rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] p-4"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--fgColor-subtle)] mb-3">
        On this page
      </h2>
      <ul className="space-y-1">
        {toc.map((entry) => (
          <li
            key={entry.id}
            style={{ paddingLeft: `${(entry.depth - 2) * 0.75}rem` }}
          >
            <a
              href={`#${entry.id}`}
              className="block text-sm text-[var(--fgColor-muted)] hover:text-[var(--fgColor-accent)] transition-colors py-0.5"
            >
              {entry.value}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// MDX Components
// ---------------------------------------------------------------------------

import type { MDXComponents } from "mdx/types";

const mdxComponents: MDXComponents = {
  h1: (props) => (
    <h1 className="text-3xl font-bold tracking-tight text-[var(--fgColor-default)] mt-0 mb-4" {...props} />
  ),
  h2: (props) => {
    const id = String(props.children ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return (
      <h2
        id={id}
        className="text-xl font-semibold text-[var(--fgColor-default)] mt-8 mb-3 pb-1.5 border-b border-[var(--borderColor-default)] scroll-mt-20"
        {...props}
      />
    );
  },
  h3: (props) => {
    const id = String(props.children ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return (
      <h3
        id={id}
        className="text-lg font-semibold text-[var(--fgColor-default)] mt-6 mb-2 scroll-mt-20"
        {...props}
      />
    );
  },
  h4: (props) => (
    <h4 className="text-base font-semibold text-[var(--fgColor-default)] mt-4 mb-2" {...props} />
  ),
  p: (props) => (
    <p className="text-[var(--fgColor-muted)] leading-relaxed mb-4" {...props} />
  ),
  a: (props) => (
    <a className="text-[var(--fgColor-accent)] hover:underline underline-offset-2 decoration-1" {...props} />
  ),
  ul: (props) => (
    <ul className="list-disc pl-6 mb-4 space-y-1 text-[var(--fgColor-muted)]" {...props} />
  ),
  ol: (props) => (
    <ol className="list-decimal pl-6 mb-4 space-y-1 text-[var(--fgColor-muted)]" {...props} />
  ),
  li: (props) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: (props) => (
    <strong className="font-semibold text-[var(--fgColor-default)]" {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement> & { "data-language"?: string }) => {
    const { children, className, ...rest } = props;
    // Inline code (no className from syntax highlighting)
    if (!className) {
      return (
        <code
          className="px-1.5 py-0.5 text-sm font-mono bg-[var(--bgColor-muted)] text-[var(--fgColor-default)] rounded border border-[var(--borderColor-default)]"
          {...rest}
        >
          {children}
        </code>
      );
    }
    return <code className={className} {...rest} />;
  },
  pre: (props) => (
    <pre
      className="overflow-x-auto rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] p-4 mb-4 text-sm font-mono text-[var(--fgColor-default)] leading-relaxed"
      {...props}
    />
  ),
  table: (props) => (
    <div className="overflow-x-auto mb-4 rounded-lg border border-[var(--borderColor-default)]">
      <table className="w-full text-sm" {...props} />
    </div>
  ),
  thead: (props) => (
    <thead className="bg-[var(--bgColor-inset)] border-b border-[var(--borderColor-default)]" {...props} />
  ),
  th: (props) => (
    <th className="px-4 py-2 text-left font-semibold text-[var(--fgColor-default)]" {...props} />
  ),
  td: (props) => (
    <td className="px-4 py-2 border-t border-[var(--borderColor-muted)] text-[var(--fgColor-muted)]" {...props} />
  ),
  blockquote: (props) => (
    <blockquote className="border-l-4 border-[var(--borderColor-accent-emphasis)] bg-[var(--bgColor-accent-muted)]/20 rounded-r-lg px-4 py-3 mb-4 text-[var(--fgColor-muted)]" {...props} />
  ),
  hr: () => (
    <hr className="my-8 border-t border-[var(--borderColor-default)]" />
  ),
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="rounded-lg my-6 max-w-full" alt={props.alt ?? ""} {...props} />
  ),
};
