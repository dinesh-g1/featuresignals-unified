"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, CategoryBadge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FlagsPageSkeleton } from "@/components/ui/skeleton";
import { EmergentDoc } from "@/components/docs/emergent-doc";
import {
  FlagIcon,
  PlusIcon,
  ChevronRightIcon,
  SearchIcon,
  FilterIcon,
} from "@/components/ui/icons/nav-icons";

// ---------------------------------------------------------------------------
// Demo data — mirrors landing page DEMO_FLAGS with enriched fields
// ---------------------------------------------------------------------------

interface DemoFlag {
  key: string;
  name: string;
  category: "release" | "experiment" | "ops" | "permission";
  description: string;
  status: "active" | "rolled_out" | "deprecated" | "archived";
  environment: string;
  updatedAt: string;
}

const DEMO_FLAGS: DemoFlag[] = [
  {
    key: "dark-mode",
    name: "Dark Mode",
    category: "release",
    description: "Toggle dark mode across the app",
    status: "active",
    environment: "Production",
    updatedAt: "2026-01-14T10:30:00Z",
  },
  {
    key: "beta-dashboard",
    name: "Beta Dashboard",
    category: "experiment",
    description: "New dashboard for beta testers",
    status: "active",
    environment: "Staging",
    updatedAt: "2026-01-15T08:00:00Z",
  },
  {
    key: "new-checkout",
    name: "New Checkout Flow",
    category: "release",
    description: "Redesigned checkout experience",
    status: "rolled_out",
    environment: "Production",
    updatedAt: "2026-01-10T14:00:00Z",
  },
  {
    key: "maintenance-banner",
    name: "Maintenance Banner",
    category: "ops",
    description: "Show maintenance banner",
    status: "active",
    environment: "Production",
    updatedAt: "2026-01-08T09:15:00Z",
  },
  {
    key: "admin-preview",
    name: "Admin Preview",
    category: "permission",
    description: "Preview features for admins only",
    status: "active",
    environment: "Production",
    updatedAt: "2026-01-12T11:45:00Z",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FlagsPage() {
  // In a real app, flags come from API. Here we use demo data.
  const [flags] = useState<DemoFlag[]>(DEMO_FLAGS);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Simulate brief loading to show skeleton
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const filteredFlags = flags.filter((flag) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      flag.key.toLowerCase().includes(q) ||
      flag.name.toLowerCase().includes(q) ||
      flag.description.toLowerCase().includes(q)
    );
  });

  const toggleExpand = useCallback((key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  }, []);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <FlagsPageSkeleton />
      </div>
    );
  }

  // --- Empty state ---
  if (flags.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <EmptyState
          icon={FlagIcon}
          title="No flags yet"
          description="Create your first feature flag to start controlling features without deploying code."
          action={
            <Button variant="primary" size="md">
              <PlusIcon className="h-4 w-4" />
              Create your first flag
            </Button>
          }
          docsUrl="https://docs.featuresignals.com/flags"
          docsLabel="Learn about feature flags"
        />
        {/* Show emergent doc even in empty state */}
        <div className="mt-8">
          <EmergentDoc context={{ entityType: "flag", action: "creating" }} />
        </div>
      </div>
    );
  }

  // --- Flags list ---
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--fgColor-default)] tracking-tight">
            Feature Flags
          </h1>
          <p className="text-sm text-[var(--fgColor-muted)] mt-1">
            Manage your feature flags, targeting rules, and rollouts.
          </p>
        </div>
        <Button variant="primary" size="md">
          <PlusIcon className="h-4 w-4" />
          New Flag
        </Button>
      </div>

      {/* Search & filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fgColor-subtle)]" />
          <input
            type="text"
            placeholder="Search flags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm rounded-md border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--fgColor-accent)]/30 focus:border-[var(--borderColor-accent-emphasis)] transition-shadow"
          />
        </div>
        <Button variant="secondary" size="sm">
          <FilterIcon className="h-3.5 w-3.5" />
          Filter
        </Button>
        {searchQuery && (
          <span className="text-xs text-[var(--fgColor-muted)]">
            {filteredFlags.length} of {flags.length} flags
          </span>
        )}
      </div>

      {/* Flag list */}
      <div className="space-y-3">
        {filteredFlags.map((flag) => {
          const isExpanded = expandedKey === flag.key;

          return (
            <div
              key={flag.key}
              className={cn(
                "rounded-[var(--radius-large)] border transition-all duration-200 card-hover",
                isExpanded
                  ? "border-[var(--borderColor-accent-emphasis)] bg-[var(--bgColor-default)] shadow-[var(--shadow-floating-small)]"
                  : "border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow-resting-xsmall)]",
              )}
            >
              {/* Flag row */}
              <button
                type="button"
                onClick={() => toggleExpand(flag.key)}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Flag icon */}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                      isExpanded
                        ? "bg-[var(--bgColor-accent-muted)]"
                        : "bg-[var(--bgColor-muted)]",
                    )}
                  >
                    <FlagIcon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isExpanded
                          ? "text-[var(--fgColor-accent)]"
                          : "text-[var(--fgColor-muted)]",
                      )}
                    />
                  </div>

                  {/* Flag info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--fgColor-default)] truncate">
                        {flag.name}
                      </span>
                      <CategoryBadge category={flag.category} />
                      <StatusBadge status={flag.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="text-xs font-mono text-[var(--fgColor-subtle)]">
                        {flag.key}
                      </code>
                      <span className="text-xs text-[var(--fgColor-subtle)]">
                        ·
                      </span>
                      <span className="text-xs text-[var(--fgColor-subtle)]">
                        {flag.environment}
                      </span>
                      <span className="text-xs text-[var(--fgColor-subtle)]">
                        ·
                      </span>
                      <span className="text-xs text-[var(--fgColor-subtle)]">
                        Updated {formatDate(flag.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description (hidden on small screens) */}
                <span className="hidden md:block text-xs text-[var(--fgColor-muted)] max-w-xs truncate mr-4">
                  {flag.description}
                </span>

                {/* Chevron */}
                <ChevronRightIcon
                  className={cn(
                    "h-4 w-4 shrink-0 text-[var(--fgColor-muted)] transition-transform duration-200",
                    isExpanded && "rotate-90",
                  )}
                />
              </button>

              {/* Expanded: Emergent documentation */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <EmergentDoc
                    context={{
                      entityType: "flag",
                      entityKey: flag.key,
                      action: "viewing",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No search results */}
      {filteredFlags.length === 0 && searchQuery && (
        <EmptyState
          icon={SearchIcon}
          title="No flags match your search"
          description={`No flags found matching "${searchQuery}". Try a different search term or clear the filter.`}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSearchQuery("")}
            >
              Clear search
            </Button>
          }
          emoji="🔍"
        />
      )}

      {/* Bottom: general emergent doc for the flags concept */}
      {filteredFlags.length > 0 && expandedKey === null && (
        <div className="mt-8">
          <EmergentDoc
            context={{ entityType: "flag", action: "viewing" }}
            initiallyCollapsed
          />
        </div>
      )}
    </div>
  );
}
