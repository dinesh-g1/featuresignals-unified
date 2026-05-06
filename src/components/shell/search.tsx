"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useShell } from "./shell-provider";

type SearchCategory =
  | "action"
  | "documentation"
  | "api"
  | "product"
  | "glossary";

interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  description?: string;
  url: string;
  fragment?: string;
  headings?: string[];
  shortcut?: number;
}

// Static search index — used as fallback when the generated index can't be loaded.
// The primary index is generated at build time by scripts/build-search-index.ts
// and served as /search-index.json.
const STATIC_INDEX: SearchResult[] = [
  // Actions
  {
    id: "action-create-flag",
    category: "action",
    title: "Create a flag",
    description: "Create a new feature flag",
    url: "/flags/new",
    shortcut: 1,
  },
  {
    id: "action-create-segment",
    category: "action",
    title: "Create a segment",
    description: "Create a reusable user segment",
    url: "/segments/new",
    shortcut: 2,
  },
  {
    id: "action-create-environment",
    category: "action",
    title: "Add an environment",
    description: "Add a new environment to a project",
    url: "/projects",
  },
  // Docs
  {
    id: "doc-quickstart",
    category: "documentation",
    title: "Quickstart Guide",
    description: "Get started with FeatureSignals in 5 minutes",
    url: "/docs/getting-started/quickstart",
  },
  {
    id: "doc-targeting",
    category: "documentation",
    title: "Creating Targeting Rules",
    description: "Define which users see which flag values",
    url: "/docs/core-features/targeting",
    fragment: "creating-targeting-rules",
  },
  {
    id: "doc-segments",
    category: "documentation",
    title: "Segments",
    description: "Reusable user groups for targeting",
    url: "/docs/core-features/segments",
  },
  {
    id: "doc-rollouts",
    category: "documentation",
    title: "Percentage Rollouts",
    description: "Gradual releases to a percentage of users",
    url: "/docs/core-features/percentage-rollouts",
  },
  {
    id: "doc-flags",
    category: "documentation",
    title: "Feature Flags",
    description: "Understanding feature flags and toggle categories",
    url: "/docs/core-features/flags",
  },
  {
    id: "doc-migration",
    category: "documentation",
    title: "Migrating from LaunchDarkly",
    description: "Import flags, segments, and environments",
    url: "/docs/getting-started/migrate-from-launchdarkly",
  },
  {
    id: "doc-sdk-node",
    category: "documentation",
    title: "Node.js SDK",
    description: "Install and configure the Node.js SDK",
    url: "/docs/sdks/node",
  },
  {
    id: "doc-sdk-react",
    category: "documentation",
    title: "React SDK",
    description: "Install and configure the React SDK",
    url: "/docs/sdks/react",
  },
  // API
  {
    id: "api-flags",
    category: "api",
    title: "GET /v1/flags",
    description: "List all feature flags",
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
    id: "api-targeting",
    category: "api",
    title: "POST /v1/targeting-rules",
    description: "Create a targeting rule",
    url: "/docs/api-reference/v1/targeting-rules",
  },
  // Product
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
];

const MAX_RESULTS = 8;
const SEARCH_INDEX_URL = "/search-index.json";

/** Group label & icon configuration for each search category. */
const CATEGORY_CONFIG: Record<
  SearchCategory,
  { label: string; icon: string; order: number }
> = {
  action: { label: "Actions", icon: "&#9889;", order: 0 },
  documentation: { label: "Documentation", icon: "&#128214;", order: 1 },
  api: { label: "API Reference", icon: "&#128268;", order: 2 },
  product: { label: "Product Pages", icon: "&#127959;", order: 3 },
  glossary: { label: "Glossary", icon: "&#128218;", order: 4 },
};

export function SearchTrigger() {
  const { setSearchOpen } = useShell();

  return (
    <button
      onClick={() => setSearchOpen(true)}
      className="flex w-full items-center gap-2 rounded-md border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-3 py-1.5 text-sm text-[var(--fgColor-muted)] hover:border-[var(--fgColor-accent)] hover:text-[var(--fgColor-default)] transition-colors"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <circle cx="6" cy="6" r="4" />
        <path d="M9 9l3.5 3.5" />
      </svg>
      <span className="flex-1 text-left">Search docs, flags, APIs...</span>
      <kbd className="hidden sm:inline-flex items-center rounded border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-1.5 py-0.5 text-xs font-mono text-[var(--fgColor-subtle)]">
        &#8984;K
      </kbd>
    </button>
  );
}

export function SearchDialog() {
  const { searchOpen, setSearchOpen } = useShell();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchIndex, setSearchIndex] = useState<SearchResult[]>(STATIC_INDEX);
  const [indexLoaded, setIndexLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load the generated search index on mount; fall back to static index on failure
  useEffect(() => {
    let cancelled = false;

    async function loadIndex(): Promise<void> {
      try {
        const res = await fetch(SEARCH_INDEX_URL);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: SearchResult[] = await res.json();
        if (!cancelled) {
          setSearchIndex(data);
        }
      } catch {
        // Keep STATIC_INDEX as fallback — no action needed
      } finally {
        if (!cancelled) {
          setIndexLoaded(true);
        }
      }
    }

    loadIndex();
    return () => {
      cancelled = true;
    };
  }, []);

  // Focus input on open
  useEffect(() => {
    if (searchOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  // Close on Escape
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen, setSearchOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return searchIndex.slice(0, MAX_RESULTS);
    const q = query.toLowerCase();
    return searchIndex
      .filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          (r.headings && r.headings.some((h) => h.toLowerCase().includes(q))),
      )
      .slice(0, MAX_RESULTS);
  }, [query, searchIndex]);

  const categorized = useMemo(() => {
    const cats: Record<SearchCategory, SearchResult[]> = {
      action: [],
      documentation: [],
      api: [],
      product: [],
      glossary: [],
    };
    results.forEach((r) => cats[r.category].push(r));
    return cats;
  }, [results]);

  const flattened = useMemo(() => {
    // Order categories consistently by their configured order
    const ordered: SearchCategory[] = [
      "action",
      "documentation",
      "api",
      "product",
      "glossary",
    ];
    return ordered.flatMap((cat) => categorized[cat]);
  }, [categorized]);

  const navigate = useCallback(
    (result: SearchResult) => {
      setSearchOpen(false);
      const target = result.fragment
        ? `${result.url}#${result.fragment}`
        : result.url;
      router.push(target);
    },
    [router, setSearchOpen],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flattened.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && flattened[selectedIndex]) {
        e.preventDefault();
        navigate(flattened[selectedIndex]);
      }
    },
    [flattened, selectedIndex, navigate],
  );

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => setSearchOpen(false)}
      />
      {/* Dialog */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg">
        <div className="mx-4 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-2 border-b border-[var(--borderColor-default)] px-4">
            <svg
              width="16"
              height="16"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-[var(--fgColor-subtle)] shrink-0"
            >
              <circle cx="6" cy="6" r="4" />
              <path d="M9 9l3.5 3.5" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search docs, flags, APIs..."
              className="flex-1 bg-transparent py-3 text-sm text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center rounded border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 text-xs font-mono text-[var(--fgColor-subtle)]">
              esc
            </kbd>
          </div>
          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {flattened.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-[var(--fgColor-muted)]">
                No results for &ldquo;{query}&rdquo;.
                {query.length > 2 && (
                  <span className="block mt-1">
                    Try a different search term or browse the docs.
                  </span>
                )}
              </div>
            ) : (
              <>
                {indexLoaded &&
                  resultGroups.map((group) => {
                    if (categorized[group.category].length === 0) return null;
                    const baseIdx = flattened.findIndex(
                      (r) => r.category === group.category,
                    );
                    return (
                      <ResultGroup
                        key={group.category}
                        label={group.label}
                        icon={group.icon}
                        results={categorized[group.category]}
                        selectedIndex={selectedIndex}
                        baseIndex={baseIdx}
                        onSelect={navigate}
                        onHover={setSelectedIndex}
                      />
                    );
                  })}
              </>
            )}
          </div>
          {/* Footer */}
          <div className="flex items-center gap-4 border-t border-[var(--borderColor-default)] px-4 py-2 text-xs text-[var(--fgColor-subtle)]">
            <span>&#8593;&#8595; Navigate</span>
            <span>&#9166; Open</span>
            <span>esc Dismiss</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Ordered list of category display groups. Computed outside render to be stable. */
const resultGroups: {
  category: SearchCategory;
  label: string;
  icon: string;
}[] = (
  ["action", "documentation", "api", "product", "glossary"] as SearchCategory[]
).map((cat) => ({
  category: cat,
  label: CATEGORY_CONFIG[cat].label,
  icon: CATEGORY_CONFIG[cat].icon,
}));

function ResultGroup({
  label,
  icon,
  results,
  selectedIndex,
  baseIndex,
  onSelect,
  onHover,
}: {
  label: string;
  icon: string;
  results: SearchResult[];
  selectedIndex: number;
  baseIndex: number;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}) {
  if (results.length === 0) return null;

  return (
    <div className="mb-1">
      <div
        className="px-3 py-1 text-xs font-semibold text-[var(--fgColor-subtle)] uppercase tracking-wider"
        dangerouslySetInnerHTML={{ __html: `${icon} ${label}` }}
      />
      {results.map((result, i) => {
        const globalIndex = baseIndex + i;
        const isSelected = globalIndex === selectedIndex;
        return (
          <button
            key={result.id}
            onClick={() => onSelect(result)}
            onMouseEnter={() => onHover(globalIndex)}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
              isSelected
                ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]"
                : "text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]"
            }`}
          >
            <span className="flex-1">
              <span className="block font-medium">{result.title}</span>
              {result.description && (
                <span className="block text-xs text-[var(--fgColor-muted)]">
                  {result.description}
                </span>
              )}
            </span>
            {result.shortcut && (
              <kbd className="hidden sm:inline-flex items-center rounded border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 text-xs font-mono text-[var(--fgColor-subtle)]">
                &#8984;{result.shortcut}
              </kbd>
            )}
          </button>
        );
      })}
    </div>
  );
}
