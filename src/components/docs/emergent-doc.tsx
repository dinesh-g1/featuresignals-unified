"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ChevronDownIcon,
  CopyIcon,
  CheckIcon,
  CodeIcon,
  BookIcon,
  ArrowRightIcon,
  LightbulbIcon,
} from "@/components/ui/icons/nav-icons";
import {
  useEmergentDocs,
  type EmergentDocContext,
  type QuickCopySnippet,
  type ApiEndpoint,
  type NextStep,
} from "@/hooks/use-emergent-docs";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EmergentDocProps {
  context: EmergentDocContext;
  /** Optional override: start collapsed instead of expanded */
  initiallyCollapsed?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmergentDoc({
  context,
  initiallyCollapsed = false,
  className,
}: EmergentDocProps) {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const docs = useEmergentDocs(context);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      className={cn(
        "rounded-[var(--radius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] shadow-[var(--shadow-resting-small)] overflow-hidden transition-all duration-200",
        className,
      )}
    >
      {/* Header bar */}
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[var(--bgColor-muted)]/50 transition-colors"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2.5">
          <BookIcon className="h-4 w-4 text-[var(--fgColor-accent)] shrink-0" />
          <span className="text-sm font-semibold text-[var(--fgColor-default)]">
            Documentation
          </span>
          <span className="hidden sm:inline text-xs text-[var(--fgColor-subtle)]">
            — contextual help for this page
          </span>
        </div>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 text-[var(--fgColor-muted)] transition-transform duration-200",
            !collapsed && "rotate-180",
          )}
        />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 divide-y divide-[var(--borderColor-default)]">
          {/* Section 1: What is this? */}
          <DocSection
            title={docs.whatIsThis.title}
            icon={<LightbulbIcon className="h-4 w-4" />}
          >
            <MarkdownContent content={docs.whatIsThis.content} />
          </DocSection>

          {/* Section 2: Quick Copy */}
          {docs.quickCopy && docs.quickCopy.length > 0 && (
            <DocSection
              title="Quick Copy"
              icon={<CodeIcon className="h-4 w-4" />}
            >
              <p className="text-xs text-[var(--fgColor-muted)] mb-3">
                Use this snippet in your SDK. Select a language and copy to
                clipboard.
              </p>
              <CodeSnippetPanel snippets={docs.quickCopy} />
            </DocSection>
          )}

          {/* Section 3: API Reference */}
          {docs.apiEndpoints.length > 0 && (
            <DocSection
              title="API Reference"
              icon={<ArrowRightIcon className="h-4 w-4" />}
            >
              <ApiEndpointList endpoints={docs.apiEndpoints} />
            </DocSection>
          )}

          {/* Section 4: Next Steps */}
          {docs.nextSteps.length > 0 && (
            <DocSection
              title="Next Steps"
              icon={<ArrowRightIcon className="h-4 w-4" />}
            >
              <NextStepList steps={docs.nextSteps} />
            </DocSection>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DocSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3.5">
      <h4 className="flex items-center gap-2 text-xs font-semibold text-[var(--fgColor-default)] uppercase tracking-wider mb-2.5">
        <span className="text-[var(--fgColor-accent)]">{icon}</span>
        {title}
      </h4>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown Content (lightweight — no full MDX needed for shortDef content)
// ---------------------------------------------------------------------------

function MarkdownContent({ content }: { content: string }) {
  // Split by double-newline for paragraphs, then process inline formatting
  const paragraphs = content.split("\n\n");

  return (
    <div className="text-sm leading-relaxed text-[var(--fgColor-muted)] space-y-2">
      {paragraphs.map((paragraph, i) => (
        <p key={i}>
          {paragraph.split("\n").map((line, j) => {
            // Process inline bold: **text**
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
              <span key={j}>
                {j > 0 && <br />}
                {parts.map((part, k) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                      <strong
                        key={k}
                        className="font-semibold text-[var(--fgColor-default)]"
                      >
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }
                  return <span key={k}>{part}</span>;
                })}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Code Snippet Panel
// ---------------------------------------------------------------------------

function CodeSnippetPanel({ snippets }: { snippets: QuickCopySnippet[] }) {
  const [activeLang, setActiveLang] = useState(snippets[0]?.language ?? "");
  const [copied, setCopied] = useState(false);

  const activeSnippet = snippets.find((s) => s.language === activeLang) ?? snippets[0];

  const handleCopy = useCallback(async () => {
    if (!activeSnippet) return;
    try {
      await navigator.clipboard.writeText(activeSnippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silently fail
    }
  }, [activeSnippet]);

  if (snippets.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] overflow-hidden">
      {/* Language tabs */}
      <div className="flex items-center justify-between border-b border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/50 px-1">
        <Tabs
          value={activeLang}
          onValueChange={setActiveLang}
          className="w-full"
        >
          <TabsList className="border-b-0 gap-0">
            {snippets.map((snippet) => (
              <TabsTrigger
                key={snippet.language}
                value={snippet.language}
                className="text-[11px] px-2.5 py-2 data-[state=active]:border-b-[var(--fgColor-accent)]"
              >
                {snippet.language}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="mr-1 shrink-0"
        >
          {copied ? (
            <CheckIcon className="h-3.5 w-3.5 text-[var(--fgColor-success)]" />
          ) : (
            <CopyIcon className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Code block */}
      <pre className="p-3 text-xs leading-relaxed font-mono text-[var(--fgColor-default)] bg-[var(--bgColor-inset)] overflow-x-auto">
        <code>{activeSnippet?.code}</code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// API Endpoint List
// ---------------------------------------------------------------------------

const METHOD_COLORS: Record<string, string> = {
  GET: "var(--fgColor-success)",
  POST: "var(--fgColor-accent)",
  PATCH: "var(--fgColor-attention)",
  PUT: "var(--fgColor-attention)",
  DELETE: "var(--fgColor-danger)",
};

function ApiEndpointList({ endpoints }: { endpoints: ApiEndpoint[] }) {
  return (
    <ul className="space-y-1.5">
      {endpoints.map((ep, i) => (
        <li
          key={i}
          className="flex items-center gap-3 text-sm rounded-md hover:bg-[var(--bgColor-muted)]/50 px-2 py-1.5 -mx-2 transition-colors"
        >
          <span
            className="inline-flex items-center justify-center w-12 shrink-0 text-[10px] font-bold font-mono rounded px-1.5 py-0.5"
            style={{
              color: METHOD_COLORS[ep.method] ?? "var(--fgColor-muted)",
              backgroundColor:
                ep.method === "GET"
                  ? "var(--bgColor-success-muted)"
                  : ep.method === "POST"
                    ? "var(--bgColor-accent-muted)"
                    : ep.method === "DELETE"
                      ? "var(--bgColor-danger-muted)"
                      : "var(--bgColor-attention-muted)",
            }}
          >
            {ep.method}
          </span>
          <code className="text-xs font-mono text-[var(--fgColor-default)]">
            {ep.path}
          </code>
          <span className="hidden sm:inline text-xs text-[var(--fgColor-subtle)] ml-auto">
            {ep.description}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Next Step List
// ---------------------------------------------------------------------------

function NextStepList({ steps }: { steps: NextStep[] }) {
  return (
    <ul className="space-y-1">
      {steps.map((step, i) => (
        <li key={i}>
          <Link
            href={step.href}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--fgColor-accent)] hover:text-[var(--fgColor-accent)] hover:underline underline-offset-2 transition-colors px-2 py-1 -mx-2 rounded hover:bg-[var(--bgColor-accent-muted)]/30"
          >
            {step.label}
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
