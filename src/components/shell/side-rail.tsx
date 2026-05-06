"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShell } from "./shell-provider";

interface NavItem {
  label: string;
  href: string;
  icon?: string;
  children?: NavItem[];
}

const productNav: NavItem[] = [
  { label: "Projects", href: "/projects" },
  { label: "Activity", href: "/activity" },
  { label: "Settings", href: "/settings/general" },
  { label: "Team", href: "/settings/team" },
  { label: "Billing", href: "/settings/billing" },
];

const learnNav: NavItem[] = [
  { label: "Documentation", href: "/docs" },
  { label: "API Reference", href: "/docs/api-reference" },
  { label: "Blog", href: "/blog" },
];

const companyNav: NavItem[] = [
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Integrations", href: "/integrations" },
];

function NavSection({
  title,
  items,
  onClick,
}: {
  title: string;
  items: NavItem[];
  onClick?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="mb-4">
      <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--fgColor-subtle)]">
        {title}
      </h3>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClick}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] font-medium"
                  : "text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

const productPages = [
  "/projects",
  "/activity",
  "/settings",
  "/team",
  "/onboarding",
  "/flags",
  "/segments",
  "/analytics",
  "/webhooks",
  "/env-comparison",
  "/target-inspector",
  "/target-comparison",
  "/usage",
  "/janitor",
  "/health",
  "/approvals",
  "/api-keys",
  "/support",
  "/limits",
];
const docsPages = ["/docs"];
const marketingPages = [
  "/pricing",
  "/about",
  "/contact",
  "/integrations",
  "/customers",
  "/partners",
  "/blog",
  "/features",
  "/use-cases",
  "/migrate",
  "/rollout",
  "/target",
  "/create",
  "/cleanup",
];

export function SideRail() {
  const { sideRailOpen, isAuthenticated, setSideRailOpen } = useShell();
  const pathname = usePathname();
  const [drawerClosing, setDrawerClosing] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  // Determine which nav context we're in
  const isProduct = productPages.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const isDocs = docsPages.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const isMarketing = marketingPages.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const closeMobileDrawer = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSideRailOpen(false);
    }
  }, [setSideRailOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSideRailOpen(false);
    }
  }, [pathname, setSideRailOpen]);

  // Swipe-to-close on mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx < -40 && drawerRef.current) {
      drawerRef.current.style.transform = `translateX(${dx}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (dx < -60) {
        setDrawerClosing(true);
        setTimeout(() => {
          setSideRailOpen(false);
          setDrawerClosing(false);
          if (drawerRef.current) {
            drawerRef.current.style.transform = "";
          }
        }, 200);
      } else if (drawerRef.current) {
        drawerRef.current.style.transform = "";
      }
    },
    [setSideRailOpen],
  );

  // ── Mobile: overlay drawer ──
  const isMobile =
    typeof window !== "undefined" ? window.innerWidth < 768 : false;

  // Read mobile state via matchMedia for SSR safety
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Mobile overlay backdrop + drawer
  if (mobile) {
    if (!sideRailOpen) {
      // Collapsed: show nothing on the side (hamburger in top bar handles it)
      return null;
    }

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black/30 overlay-fade-in"
          onClick={closeMobileDrawer}
          aria-hidden="true"
        />
        {/* Drawer */}
        <aside
          ref={drawerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`fixed left-0 top-0 z-50 h-full w-64 touch-pan-y border-r border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-2xl overflow-y-auto ${
            drawerClosing ? "drawer-slide-out" : "drawer-slide-in"
          }`}
        >
          {/* Close button area */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--borderColor-default)]">
            <Link
              href="/"
              onClick={closeMobileDrawer}
              className="flex items-center gap-2 font-semibold text-[var(--fgColor-default)]"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect
                  width="22"
                  height="22"
                  rx="5"
                  fill="var(--bgColor-accent-emphasis)"
                />
                <path
                  d="M6 11l3 3 7-7"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              FeatureSignals
            </Link>
            <button
              onClick={closeMobileDrawer}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)]"
              aria-label="Close navigation"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2.97 2.97a.75.75 0 011.06 0L8 6.94l3.97-3.97a.75.75 0 111.06 1.06L9.06 8l3.97 3.97a.75.75 0 11-1.06 1.06L8 9.06l-3.97 3.97a.75.75 0 01-1.06-1.06L6.94 8 2.97 4.03a.75.75 0 010-1.06z" />
              </svg>
            </button>
          </div>
          <div className="p-3">
            <NavSection
              title="Product"
              items={productNav}
              onClick={closeMobileDrawer}
            />
            <div className="my-3 border-t border-[var(--borderColor-default)]" />
            <NavSection
              title="Learn"
              items={learnNav}
              onClick={closeMobileDrawer}
            />
            <div className="my-3 border-t border-[var(--borderColor-default)]" />
            <NavSection
              title="Company"
              items={companyNav}
              onClick={closeMobileDrawer}
            />
          </div>
        </aside>
      </>
    );
  }

  // ── Desktop: persistent side rail ──
  if (!sideRailOpen) {
    return (
      <aside className="w-12 shrink-0 border-r border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] flex flex-col items-center pt-3 gap-2">
        <SideRailIcon href="/flags" label="Flags" isActive={isProduct} />
        <SideRailIcon href="/docs" label="Docs" isActive={isDocs} />
        <SideRailIcon href="/pricing" label="Pricing" isActive={isMarketing} />
      </aside>
    );
  }

  return (
    <aside className="w-56 shrink-0 border-r border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] overflow-y-auto">
      <div className="p-3">
        <NavSection title="Product" items={productNav} />
        <div className="my-3 border-t border-[var(--borderColor-default)]" />
        <NavSection title="Learn" items={learnNav} />
        <div className="my-3 border-t border-[var(--borderColor-default)]" />
        <NavSection title="Company" items={companyNav} />
      </div>
    </aside>
  );
}

function SideRailIcon({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
        isActive
          ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]"
          : "text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)]"
      }`}
      title={label}
    >
      {label.charAt(0)}
    </Link>
  );
}
