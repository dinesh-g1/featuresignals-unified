"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { docsNavSections, type DocNavItem } from "@/content/docs/nav-tree";

// ---------------------------------------------------------------------------
// DocsSidebar
// ---------------------------------------------------------------------------

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 h-full overflow-y-auto border-r border-[var(--borderColor-default)] bg-[var(--bgColor-inset)]">
      <nav className="p-4 pb-16">
        <div className="mb-3 px-2">
          <Link
            href="/docs"
            className="text-sm font-semibold text-[var(--fgColor-default)] hover:text-[var(--fgColor-accent)] transition-colors"
          >
            Documentation
          </Link>
        </div>
        {docsNavSections.map((section) => (
          <NavSection
            key={section.label}
            section={section}
            pathname={pathname}
          />
        ))}
      </nav>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// NavSection
// ---------------------------------------------------------------------------

function NavSection({
  section,
  pathname,
}: {
  section: { label: string; collapsed: boolean; items: DocNavItem[] };
  pathname: string;
}) {
  const [collapsed, setCollapsed] = useState(section.collapsed);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--fgColor-subtle)] hover:text-[var(--fgColor-default)] transition-colors rounded"
        aria-expanded={!collapsed}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={cn(
            "shrink-0 transition-transform duration-150",
            !collapsed && "rotate-90",
          )}
        >
          <path
            d="M3.5 1.5L7 5L3.5 8.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {section.label}
      </button>

      {!collapsed && (
        <ul className="mt-0.5 ml-2 space-y-0.5">
          {section.items.map((item) => (
            <NavItem key={item.href || item.label} item={item} pathname={pathname} depth={0} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavItem — recursive
// ---------------------------------------------------------------------------

function NavItem({
  item,
  pathname,
  depth,
}: {
  item: DocNavItem;
  pathname: string;
  depth: number;
}) {
  const hasChildren = item.items && item.items.length > 0;

  // Category node (no href)
  if (!item.href && hasChildren) {
    return (
      <li>
        <CategoryNode item={item} pathname={pathname} depth={depth} />
      </li>
    );
  }

  // Leaf node (with href, possibly with children = expandable)
  if (item.href && hasChildren) {
    return (
      <li>
        <ExpandableNavItem item={item} pathname={pathname} depth={depth} />
      </li>
    );
  }

  // Simple leaf
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "block rounded-md px-2 py-1 text-sm transition-colors",
          pathname === item.href || pathname.startsWith(item.href + "/")
            ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] font-medium"
            : "text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)]",
          depth > 0 && "ml-3",
        )}
      >
        {item.label}
      </Link>
    </li>
  );
}

// ---------------------------------------------------------------------------
// CategoryNode — non-clickable category header
// ---------------------------------------------------------------------------

function CategoryNode({
  item,
  pathname,
  depth,
}: {
  item: DocNavItem;
  pathname: string;
  depth: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex w-full items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-[var(--fgColor-muted)] hover:text-[var(--fgColor-default)] transition-colors",
          depth > 0 && "ml-3",
        )}
        aria-expanded={!collapsed}
      >
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          className={cn(
            "shrink-0 transition-transform duration-150",
            !collapsed && "rotate-90",
          )}
        >
          <path
            d="M3 1.5L5.5 4L3 6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {item.label}
      </button>
      {!collapsed && item.items && (
        <ul className="mt-0.5 ml-2 space-y-0.5">
          {item.items.map((child) => (
            <NavItem key={child.href || child.label} item={child} pathname={pathname} depth={depth + 1} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExpandableNavItem — clickable with children
// ---------------------------------------------------------------------------

function ExpandableNavItem({
  item,
  pathname,
  depth,
}: {
  item: DocNavItem;
  pathname: string;
  depth: number;
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const [collapsed, setCollapsed] = useState(!isActive);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <div>
      <div className="flex items-center group">
        <Link
          href={item.href}
          className={cn(
            "flex-1 rounded-md px-2 py-1 text-sm transition-colors truncate",
            isActive
              ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] font-medium"
              : "text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)]",
            depth > 0 && "ml-3",
          )}
        >
          {item.label}
        </Link>
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "shrink-0 p-1 text-[var(--fgColor-subtle)] hover:text-[var(--fgColor-default)] transition-colors rounded",
            depth > 0 && "mr-1",
          )}
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            className={cn(
              "transition-transform duration-150",
              !collapsed && "rotate-90",
            )}
          >
            <path
              d="M3 1.5L5.5 4L3 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {!collapsed && item.items && (
        <ul className="mt-0.5 ml-2 space-y-0.5">
          {item.items.map((child) => (
            <NavItem key={child.href || child.label} item={child} pathname={pathname} depth={depth + 1} />
          ))}
        </ul>
      )}
    </div>
  );
}
