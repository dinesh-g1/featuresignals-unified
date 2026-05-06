"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface ShellContextValue {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  resolvedTheme: "light" | "dark";
  sideRailOpen: boolean;
  setSideRailOpen: (open: boolean) => void;
  toggleSideRail: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  isAuthenticated: boolean;
  sandboxId: string | null;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within ShellProvider");
  return ctx;
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<"light" | "dark" | "system">("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [sideRailOpen, setSideRailOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sandboxId, setSandboxId] = useState<string | null>(null);

  const setTheme = useCallback((t: "light" | "dark" | "system") => {
    setThemeState(t);
    if (typeof window !== "undefined") {
      localStorage.setItem("fs-theme", t);
    }
  }, []);

  const toggleSideRail = useCallback(() => {
    setSideRailOpen((prev) => !prev);
  }, []);

  // Resolve theme
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("fs-theme") as "light" | "dark" | "system" | null : null;
    const current = stored ?? "system";
    setThemeState(current);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const resolve = () => {
      if (current === "system") {
        setResolvedTheme(mediaQuery.matches ? "dark" : "light");
      } else {
        setResolvedTheme(current);
      }
    };
    resolve();
    mediaQuery.addEventListener("change", resolve);
    return () => mediaQuery.removeEventListener("change", resolve);
  }, []);

  // Apply theme class to html
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  // Read sandbox cookie on mount
  useEffect(() => {
    const match = document.cookie.match(/fs_sandbox_id=([^;]+)/);
    if (match) {
      setSandboxId(match[1]);
    }
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <ShellContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
        sideRailOpen,
        setSideRailOpen,
        toggleSideRail,
        searchOpen,
        setSearchOpen,
        isAuthenticated,
        sandboxId,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}
