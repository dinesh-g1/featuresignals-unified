import { cn } from "@/lib/utils";
import { ExternalLinkIcon } from "@/components/ui/icons/nav-icons";

interface EmptyStateProps {
  icon:
    | React.ComponentType<{ className?: string }>
    | React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string | React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  docsUrl?: string;
  docsLabel?: string;
  emoji?: string;
  className?: string;
}

/**
 * EmptyState — used when a page/list has no data yet.
 * Shows an icon, title, optional description, and optional CTA.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  docsUrl,
  docsLabel,
  emoji,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-16 text-center animate-fade-in sm:px-6",
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bgColor-accent-muted)] ring-1 ring-[var(--borderColor-accent-muted)] shadow-sm">
        {emoji ? (
          <span className="text-xl leading-none">{emoji}</span>
        ) : (
          <Icon className="h-7 w-7 text-[var(--fgColor-accent)]" />
        )}
      </div>
      <p className="mt-4 text-sm font-semibold text-[var(--fgColor-default)]">
        {title}
      </p>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--fgColor-subtle)]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
      {docsUrl && (
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--fgColor-accent)] hover:text-[var(--fgColor-accent)] transition-colors"
        >
          {docsLabel || "Learn more in docs"}
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline SVG Illustrations — minimal line art, Primer design language,
// uses currentColor for theming. No external dependencies.
// ─────────────────────────────────────────────────────────────────────────────

/** Flag icon with "+" badge — for "No flags yet" */
export function FlagsEmptyIcon({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      className={cn("text-[var(--fgColor-accent)]", className)}
      aria-hidden="true"
    >
      {/* Flag pole */}
      <line
        x1="14"
        y1="6"
        x2="14"
        y2="42"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Flag body */}
      <path
        d="M14 8h18l-4 8 4 8H14"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* + badge circle */}
      <circle cx="38" cy="14" r="8" fill="var(--bgColor-success-emphasis)" />
      {/* + lines */}
      <path
        d="M38 10v8M34 14h8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Overlapping user icons — for "No segments" */
export function SegmentsEmptyIcon({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      className={cn("text-[var(--fgColor-accent)]", className)}
      aria-hidden="true"
    >
      {/* User 1 (back) */}
      <circle
        cx="19"
        cy="16"
        r="7"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 38c0-6.627 5.373-12 12-12s12 5.373 12 12"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* User 2 (front) */}
      <circle
        cx="32"
        cy="18"
        r="6"
        fill="var(--bgColor-default)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M22 38c0-5.523 4.477-10 10-10s10 4.477 10 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Webhook/connection icon — for "No webhooks" */
export function WebhooksEmptyIcon({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      className={cn("text-[var(--fgColor-accent)]", className)}
      aria-hidden="true"
    >
      {/* Left node */}
      <rect
        x="4"
        y="14"
        width="14"
        height="14"
        rx="3"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Connection line with bend */}
      <path
        d="M18 21h6c2 0 4 2 4 4v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrowhead */}
      <path
        d="M24 29l4-4M24 29l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Right node */}
      <rect
        x="30"
        y="14"
        width="14"
        height="14"
        rx="3"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Person with "+" badge — for "No team members" */
export function TeamEmptyIcon({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      className={cn("text-[var(--fgColor-accent)]", className)}
      aria-hidden="true"
    >
      {/* Person body */}
      <circle
        cx="20"
        cy="14"
        r="7"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M4 40c0-8.837 7.163-16 16-16s16 7.163 16 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* + badge */}
      <circle cx="38" cy="14" r="8" fill="var(--bgColor-success-emphasis)" />
      <path
        d="M38 10v8M34 14h8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Clipboard with checkmark — for "No audit entries" */
export function AuditEmptyIcon({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      className={cn("text-[var(--fgColor-accent)]", className)}
      aria-hidden="true"
    >
      {/* Clipboard body */}
      <rect
        x="10"
        y="10"
        width="28"
        height="32"
        rx="3"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Clipboard clip top */}
      <path
        d="M16 6h16a3 3 0 013 3v4H13V9a3 3 0 013-3z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Checkmark */}
      <path
        d="M17 26l5 5 10-10"
        stroke="var(--bgColor-success-emphasis)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lines (representing list items) */}
      <line
        x1="17"
        y1="34"
        x2="31"
        y2="34"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      <line
        x1="17"
        y1="38"
        x2="27"
        y2="38"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}

/** Project/building icon with "+" — for "No projects" */
export function ProjectsEmptyIcon({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      className={cn("text-[var(--fgColor-accent)]", className)}
      aria-hidden="true"
    >
      {/* Building */}
      <rect
        x="8"
        y="14"
        width="26"
        height="28"
        rx="2"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Roof */}
      <path
        d="M5 14l16-10 16 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Windows */}
      <rect
        x="13"
        y="20"
        width="6"
        height="6"
        rx="1"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <rect
        x="23"
        y="20"
        width="6"
        height="6"
        rx="1"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <rect
        x="13"
        y="30"
        width="6"
        height="6"
        rx="1"
        fill="currentColor"
        fillOpacity="0.15"
      />
      {/* + badge */}
      <circle cx="40" cy="14" r="8" fill="var(--bgColor-success-emphasis)" />
      <path
        d="M40 10v8M36 14h8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
