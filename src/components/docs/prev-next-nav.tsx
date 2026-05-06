import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DocNavItem } from "@/content/docs/nav-tree";

// ---------------------------------------------------------------------------
// PrevNextNav
// ---------------------------------------------------------------------------

export function PrevNextNav({
  prev,
  next,
  className,
}: {
  prev: DocNavItem | null;
  next: DocNavItem | null;
  className?: string;
}) {
  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Previous and next pages"
      className={cn(
        "flex items-stretch gap-4 border-t border-[var(--borderColor-default)] pt-8 mt-12",
        className,
      )}
    >
      {/* Previous */}
      <div className="flex-1 min-w-0">
        {prev ? (
          <Link
            href={prev.href}
            className="group flex flex-col gap-1 rounded-lg border border-[var(--borderColor-default)] p-4 hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--bgColor-accent-muted)]/20 transition-all"
          >
            <span className="text-xs font-medium text-[var(--fgColor-subtle)] group-hover:text-[var(--fgColor-accent)] transition-colors">
              ← Previous
            </span>
            <span className="text-sm font-medium text-[var(--fgColor-default)] group-hover:text-[var(--fgColor-accent)] transition-colors truncate">
              {prev.label}
            </span>
          </Link>
        ) : (
          <div />
        )}
      </div>

      {/* Next */}
      <div className="flex-1 min-w-0 text-right">
        {next ? (
          <Link
            href={next.href}
            className="group flex flex-col gap-1 rounded-lg border border-[var(--borderColor-default)] p-4 hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--bgColor-accent-muted)]/20 transition-all"
          >
            <span className="text-xs font-medium text-[var(--fgColor-subtle)] group-hover:text-[var(--fgColor-accent)] transition-colors">
              Next →
            </span>
            <span className="text-sm font-medium text-[var(--fgColor-default)] group-hover:text-[var(--fgColor-accent)] transition-colors truncate">
              {next.label}
            </span>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </nav>
  );
}
