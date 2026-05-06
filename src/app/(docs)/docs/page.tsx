import type { Metadata } from "next";
import Link from "next/link";
import { renderDoc } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "FeatureSignals documentation — AI-powered feature flag management with targeted rollouts, A/B experiments, and real-time updates.",
};

export default async function DocsIndexPage() {
  // Try to render the intro page as the index content
  const doc = await renderDoc(["intro"]);

  if (!doc) {
    return <DocsIndexFallback />;
  }

  const { Content } = doc;

  return (
    <article className="prose-container">
      <Content
        components={mdxComponents}
      />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Fallback — shown when intro.mdx doesn't exist yet
// ---------------------------------------------------------------------------

function DocsIndexFallback() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--fgColor-default)]">
          FeatureSignals Documentation
        </h1>
        <p className="mt-3 text-lg text-[var(--fgColor-muted)] leading-relaxed">
          AI-powered feature flag management with targeted rollouts, A/B
          experiments, and real-time updates.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LinkCard
          title="Quickstart"
          description="Get up and running in 5 minutes with Docker Compose."
          href="/docs/getting-started/quickstart"
        />
        <LinkCard
          title="Feature Flags"
          description="Learn about flag types, evaluation, and best practices."
          href="/docs/core-concepts/feature-flags"
        />
        <LinkCard
          title="SDKs"
          description="Integrate with Go, Node.js, Python, Java, .NET, Ruby, React, Vue."
          href="/docs/sdks/overview"
        />
        <LinkCard
          title="API Reference"
          description="Complete REST API documentation for all endpoints."
          href="/docs/api-reference/overview"
        />
      </div>
    </div>
  );
}

function LinkCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-[var(--borderColor-default)] p-5 hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--bgColor-accent-muted)]/10 transition-all"
    >
      <h3 className="text-base font-semibold text-[var(--fgColor-accent)]">
        {title}
      </h3>
      <p className="mt-1 text-sm text-[var(--fgColor-muted)]">{description}</p>
    </Link>
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
  h2: (props) => (
    <h2 className="text-xl font-semibold text-[var(--fgColor-default)] mt-8 mb-3 pb-1.5 border-b border-[var(--borderColor-default)]" {...props} />
  ),
  h3: (props) => (
    <h3 className="text-lg font-semibold text-[var(--fgColor-default)] mt-6 mb-2" {...props} />
  ),
  h4: (props) => (
    <h4 className="text-base font-semibold text-[var(--fgColor-default)] mt-4 mb-2" {...props} />
  ),
  p: (props) => (
    <p className="text-[var(--fgColor-muted)] leading-relaxed mb-4" {...props} />
  ),
  a: (props) => (
    <a className="text-[var(--fgColor-accent)] hover:underline underline-offset-2" {...props} />
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
  code: (props: React.HTMLAttributes<HTMLElement>) => {
    const { children, className, ...rest } = props;
    // Inline code
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
    // Block code — rendered by pre wrapper
    return <code {...props} />;
  },
  pre: (props) => (
    <pre className="overflow-x-auto rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] p-4 mb-4 text-sm font-mono text-[var(--fgColor-default)]" {...props} />
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
    <blockquote className="border-l-4 border-[var(--borderColor-accent-emphasis)] bg-[var(--bgColor-accent-muted)]/30 rounded-r-lg px-4 py-3 mb-4 text-[var(--fgColor-muted)]" {...props} />
  ),
  hr: () => (
    <hr className="my-8 border-t border-[var(--borderColor-default)]" />
  ),
};
