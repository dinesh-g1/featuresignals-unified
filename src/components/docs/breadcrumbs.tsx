import Link from "next/link";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// BreadcrumbItem
// ---------------------------------------------------------------------------

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ---------------------------------------------------------------------------
// DocsBreadcrumbs
// ---------------------------------------------------------------------------

export function DocsBreadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1.5 text-sm", className)}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;

        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                className="text-[var(--borderColor-emphasis)] shrink-0"
              >
                <path
                  d="M4.5 2.5L8 6L4.5 9.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {isLast || !item.href ? (
              <span
                className={cn(
                  isLast
                    ? "font-medium text-[var(--fgColor-default)]"
                    : "text-[var(--fgColor-muted)]",
                )}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-[var(--fgColor-muted)] hover:text-[var(--fgColor-accent)] transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
