"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useShell } from "./shell-provider";
import { SearchTrigger } from "./search";
import { useAppStore } from "@/stores/app-store";

export function TopBar() {
  const { toggleSideRail, isAuthenticated, setSideRailOpen } = useShell();
  const user = useAppStore((s) => s.user);
  const organization = useAppStore((s) => s.organization);
  const logout = useAppStore((s) => s.logout);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleHamburgerClick = () => {
    if (mobile) {
      // On mobile: open overlay drawer
      setSideRailOpen(true);
    } else {
      // On desktop: toggle collapsed side rail
      toggleSideRail();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 sm:gap-4 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3 sm:px-4">
      {/* Hamburger / Side rail toggle */}
      <button
        onClick={handleHamburgerClick}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)] transition-colors"
        aria-label="Toggle navigation"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M2.25 4.5h13.5M2.25 9h13.5M2.25 13.5h13.5" />
        </svg>
      </button>

      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 font-semibold text-[var(--fgColor-default)] hover:text-[var(--fgColor-accent)] transition-colors shrink-0"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          className="shrink-0"
        >
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
        <span className="hidden sm:inline">FeatureSignals</span>
      </Link>

      {/* Search trigger — hidden on mobile (accessible via ⌘K or tap on search button) */}
      <div className="flex-1 max-w-md hidden sm:block">
        <SearchTrigger />
      </div>

      {/* Mobile search icon */}
      {mobile && (
        <button
          onClick={() => setSideRailOpen(false)}
          className="hidden sm:hidden"
        />
      )}

      {/* Right section */}
      <div className="flex items-center gap-1 sm:gap-2 ml-auto">
        {/* Theme toggle */}
        <ThemeToggle />

        {isAuthenticated ? (
          <div className="flex items-center gap-1 sm:gap-3">
            <span className="text-sm text-[var(--fgColor-muted)] hidden md:inline">
              {organization?.name ?? "My Org"}
            </span>
            <Link
              href="/settings"
              className="text-sm text-[var(--fgColor-muted)] hover:text-[var(--fgColor-default)] transition-colors hidden sm:inline"
            >
              {user?.name ?? user?.email ?? "Settings"}
            </Link>
            <button
              onClick={logout}
              className="text-sm text-[var(--fgColor-muted)] hover:text-[var(--fgColor-danger)] transition-colors"
            >
              <span className="hidden sm:inline">Sign out</span>
              <span className="sm:hidden" aria-label="Sign out">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 010 1.5h-2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 010 1.5h-2.5A1.75 1.75 0 012 13.25V2.75zm10.78 2.47a.75.75 0 00-1.06 0L9.25 7.69V4.75A.75.75 0 008.5 4h-3a.75.75 0 000 1.5h3v8.5a.75.75 0 001.5 0v-3.44l2.47 2.47a.75.75 0 101.06-1.06l-3.25-3.25a.75.75 0 010-1.06l3.25-3.25a.75.75 0 000-1.06z" />
                </svg>
              </span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--fgColor-muted)] hover:text-[var(--fgColor-default)] transition-colors px-2 sm:px-3 py-1.5"
            >
              <span className="hidden sm:inline">Sign in</span>
              <span className="sm:hidden" aria-label="Sign in">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 010 1.5h-2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 010 1.5h-2.5A1.75 1.75 0 012 13.25V2.75zm6.78 2.47a.75.75 0 00-1.06 0L5.25 7.69V4.75A.75.75 0 004.5 4H.75a.75.75 0 000 1.5h3.75v3.44L2.03 7.47a.75.75 0 00-1.06 1.06l3.25 3.25a.75.75 0 001.06 0l3.25-3.25a.75.75 0 000-1.06z" />
                </svg>
              </span>
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-white bg-[var(--bgColor-accent-emphasis)] hover:bg-[var(--bgColor-accent-emphasis)]/90 rounded-md px-2 sm:px-3 py-1.5 transition-colors"
            >
              <span className="hidden sm:inline">Start free</span>
              <span className="sm:hidden" aria-label="Start free">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 0a8 8 0 110 16A8 8 0 018 0zm.75 4.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" />
                </svg>
              </span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useShell();

  const cycle = () => {
    const next =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  return (
    <button
      onClick={cycle}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)] transition-colors"
      aria-label={`Theme: ${theme}`}
      title={`Theme: ${theme}`}
    >
      {theme === "light" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 018 1zm4.95 1.3a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 11-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM15 8a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0115 8zm-1.3 4.95a.75.75 0 01-1.06 0l-1.06-1.06a.75.75 0 011.06-1.06l1.06 1.06a.75.75 0 010 1.06zM8 12a4 4 0 100-8 4 4 0 000 8z" />
        </svg>
      ) : theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.5 1.5a.75.75 0 00-.75.75v.5a.75.75 0 001.5 0v-.5a.75.75 0 00-.75-.75zM8.5 13a.75.75 0 00-.75.75v.5a.75.75 0 001.5 0v-.5a.75.75 0 00-.75-.75zM2.5 4.5a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5a.75.75 0 01-.75-.75zM11.5 4.5a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5a.75.75 0 01-.75-.75zM4.5 11.5a.75.75 0 00-.75.75v.5a.75.75 0 001.5 0v-.5a.75.75 0 00-.75-.75zM11.5 8.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM1 8a7 7 0 0114 0A7 7 0 011 8z" />
        </svg>
      )}
    </button>
  );
}
