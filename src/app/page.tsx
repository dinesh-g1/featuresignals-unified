"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SandboxLoader } from "@/components/landing/sandbox-loader";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface SandboxData {
  sandbox_id: string;
  env_key: string;
  org_id: string;
  project_id: string;
  dev_env_id: string;
  prod_env_id: string;
  expires_at: string;
}

interface DemoFlag {
  key: string;
  name: string;
  type: string;
  description: string;
  enabled: boolean;
  environment: string;
}

const DEMO_FLAGS: DemoFlag[] = [
  {
    key: "dark-mode",
    name: "Dark Mode",
    type: "Release",
    description: "Toggle dark mode across the app",
    enabled: true,
    environment: "Production",
  },
  {
    key: "beta-dashboard",
    name: "Beta Dashboard",
    type: "Experiment",
    description: "New dashboard for beta testers",
    enabled: false,
    environment: "Staging",
  },
  {
    key: "new-checkout",
    name: "New Checkout Flow",
    type: "Release",
    description: "Redesigned checkout experience",
    enabled: true,
    environment: "Production",
  },
  {
    key: "maintenance-banner",
    name: "Maintenance Banner",
    type: "Ops",
    description: "Show maintenance banner",
    enabled: false,
    environment: "Production",
  },
  {
    key: "admin-preview",
    name: "Admin Preview",
    type: "Permission",
    description: "Preview features for admins only",
    enabled: true,
    environment: "Production",
  },
];

const SDK_LANGUAGES = [
  {
    key: "node",
    label: "Node.js",
    install: "npm install @featuresignals/node",
    init: "npx featuresignals init",
  },
  {
    key: "python",
    label: "Python",
    install: "pip install featuresignals",
    init: "featuresignals init",
  },
  {
    key: "react",
    label: "React",
    install: "npm install @featuresignals/react",
    init: "npx featuresignals init",
  },
  {
    key: "go",
    label: "Go",
    install: "go get github.com/featuresignals/go-sdk",
    init: "featuresignals init",
  },
  {
    key: "java",
    label: "Java",
    install: "# Add to pom.xml or build.gradle",
    init: "featuresignals init",
  },
  {
    key: "dotnet",
    label: ".NET",
    install: "dotnet add package FeatureSignals",
    init: "featuresignals init",
  },
  {
    key: "ruby",
    label: "Ruby",
    install: "gem install featuresignals",
    init: "featuresignals init",
  },
  {
    key: "vue",
    label: "Vue",
    install: "npm install @featuresignals/vue",
    init: "npx featuresignals init",
  },
];

const HERO_SUBHEADLINES = [
  "Ship faster. Break nothing. Start now.",
  "Feature flags that don't lock you in.",
  "Toggle features. No signup. No docs. 10 seconds.",
];

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, ttlHours: number) {
  const expires = new Date(
    Date.now() + ttlHours * 60 * 60 * 1000,
  ).toUTCString();
  document.cookie =
    name +
    "=" +
    encodeURIComponent(value) +
    "; expires=" +
    expires +
    "; path=/; SameSite=Lax";
}

// ---- Countdown Timer ----
function useCountdown(expiresAt: string | undefined) {
  const [remaining, setRemaining] = useState<string>("");

  useEffect(() => {
    if (!expiresAt) return;
    const expires = expiresAt;

    function tick() {
      const now = Date.now();
      const end = new Date(expires).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setRemaining("Expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours >= 1) {
        setRemaining(hours + "h " + minutes + "m");
      } else {
        setRemaining(minutes + "m");
      }
    }

    tick();
    const interval = setInterval(tick, 60_000); // update every minute
    return () => clearInterval(interval);
  }, [expiresAt]);

  return remaining;
}

export default function LandingPage() {
  const [sandbox, setSandbox] = useState<SandboxData | null>(null);
  const [flags, setFlags] = useState<DemoFlag[]>(DEMO_FLAGS);
  const [selectedLang, setSelectedLang] = useState("node");
  const [evalResult, setEvalResult] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Micro-interaction state: tracks recently toggled flags for animations
  const [toggledFlags, setToggledFlags] = useState<Record<string, number>>({});
  const [updatedLabels, setUpdatedLabels] = useState<Record<string, boolean>>(
    {},
  );

  // Rotating sub-headline
  const [subheadlineIndex, setSubheadlineIndex] = useState(0);
  const subheadlineTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Ripple refs for toggle buttons
  const toggleRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Countdown
  const countdown = useCountdown(sandbox?.expires_at);
  const countdownUrgent =
    countdown.startsWith("0h") ||
    countdown === "Expired" ||
    (countdown.endsWith("m") && parseInt(countdown) < 60);
  const countdownCritical = countdown.endsWith("m") && parseInt(countdown) < 10;

  // Rotating sub-headline effect
  useEffect(() => {
    subheadlineTimerRef.current = setInterval(() => {
      setSubheadlineIndex((prev) => (prev + 1) % HERO_SUBHEADLINES.length);
    }, 5000);
    return () => {
      if (subheadlineTimerRef.current !== null) {
        clearInterval(subheadlineTimerRef.current);
      }
    };
  }, []);

  // Initialize sandbox on first visit
  useEffect(() => {
    async function initSandbox() {
      const existingId = getCookie("fs_sandbox_id");
      if (existingId) {
        try {
          const res = await fetch(API_URL + "/api/sandbox/" + existingId);
          if (res.ok) {
            const data = await res.json();
            const storedKey = localStorage.getItem("fs_sandbox_env_key");
            if (storedKey) data.env_key = storedKey;
            setSandbox(data);
            setLoading(false);
            evaluateAllFlags(data.env_key, DEMO_FLAGS).then(setEvalResult);
            return;
          }
        } catch {
          // Cookie exists but sandbox expired — create a new one
        }
      }

      // Create new sandbox
      try {
        const res = await fetch(API_URL + "/api/sandbox", { method: "POST" });
        if (!res.ok) {
          throw new Error("Failed to create sandbox");
        }
        const data: SandboxData = await res.json();
        setCookie("fs_sandbox_id", data.sandbox_id, 24);
        if (data.env_key) {
          localStorage.setItem("fs_sandbox_env_key", data.env_key);
        }
        setSandbox(data);
        setLoading(false);
        const results: Record<string, boolean> = {};
        DEMO_FLAGS.forEach((f) => {
          results[f.key] = f.enabled;
        });
        setEvalResult(results);
      } catch (err) {
        setError("Could not create demo sandbox. Please try again.");
        setLoading(false);
        const results: Record<string, boolean> = {};
        DEMO_FLAGS.forEach((f) => {
          results[f.key] = f.enabled;
        });
        setEvalResult(results);
      }
    }

    initSandbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFlag = useCallback(
    async (key: string) => {
      // Record toggle time for micro-interactions
      const now = Date.now();
      setToggledFlags((prev) => ({ ...prev, [key]: now }));
      setUpdatedLabels((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setUpdatedLabels((prev) => ({ ...prev, [key]: false }));
      }, 1500);

      // Optimistic update
      setFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f)),
      );
      setEvalResult((prev) => ({ ...prev, [key]: !prev[key] }));

      // Trigger ripple effect on toggle button
      const btn = toggleRefs.current[key];
      if (btn) {
        btn.classList.remove("animate-ripple-pulse");
        // Force reflow
        void btn.offsetWidth;
        btn.classList.add("animate-ripple-pulse");
      }

      if (sandbox?.env_key) {
        try {
          const res = await fetch(API_URL + "/v1/evaluate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + sandbox.env_key,
            },
            body: JSON.stringify({
              user: {
                key: "demo-user-" + Math.random().toString(36).slice(2, 8),
              },
              flags: [key],
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.value !== undefined) {
              setEvalResult((prev) => ({ ...prev, [key]: data.value }));
            }
          }
        } catch {
          // Silently fall back to optimistic state
        }
      }
    },
    [sandbox, flags],
  );

  const lang = SDK_LANGUAGES.find((l) => l.key === selectedLang)!;

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // ---- LOADING STATE (staged loader) ----
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <SandboxLoader />
      </div>
    );
  }

  // ---- ERROR STATE ----
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <div className="text-3xl mb-3">⚠️</div>
          <h2 className="text-lg font-semibold text-[var(--fgColor-default)] mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-[var(--fgColor-muted)] mb-4">{error}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const registerUrl = sandbox
    ? "/register?sandbox_id=" + encodeURIComponent(sandbox.sandbox_id)
    : "/register";

  return (
    <div className="min-h-full">
      {/* ================================================================
           HERO — Product Experience
           ================================================================ */}
      <section className="relative overflow-hidden border-b border-[var(--borderColor-default)] bg-[var(--bgColor-inset)]">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-20">
          {/* Urgency Countdown — sticky on mobile */}
          {sandbox && (
            <div
              className={cn(
                "md:hidden sticky top-0 z-30 -mx-4 px-4 py-2 text-center text-xs font-medium border-b transition-colors duration-300",
                countdownCritical
                  ? "bg-[var(--bgColor-danger-muted)] text-[var(--fgColor-danger)] border-[var(--borderColor-danger-emphasis)]"
                  : countdownUrgent
                    ? "bg-[var(--bgColor-attention-muted)] text-[var(--fgColor-attention)] border-[var(--borderColor-attention-muted)]"
                    : "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] border-[var(--borderColor-accent-muted)]",
              )}
            >
              <span
                className={cn(
                  countdownCritical && "animate-countdown-pulse-red",
                )}
              >
                ⏳ Your demo expires in {countdown} · No credit card required
              </span>
            </div>
          )}

          <div className="text-center mb-8 sm:mb-10">
            {/* Live indicator pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3 py-1 text-xs font-medium text-[var(--fgColor-muted)] mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {sandbox ? (
                <>Demo sandbox active</>
              ) : (
                <>No signup required — you&apos;re already in a demo sandbox</>
              )}
            </div>

            {/* Main headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--fgColor-default)] leading-tight">
              Your first feature flag is{" "}
              <span className="text-[var(--fgColor-accent)]">live</span>
            </h1>

            {/* Rotating sub-headline */}
            <p className="mt-4 text-base sm:text-lg text-[var(--fgColor-muted)] max-w-2xl mx-auto h-7 relative overflow-hidden">
              {HERO_SUBHEADLINES.map((line, i) => (
                <span
                  key={i}
                  className={cn(
                    "absolute inset-x-0 transition-all duration-500",
                    i === subheadlineIndex
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4",
                  )}
                  aria-hidden={i !== subheadlineIndex}
                >
                  {line}
                </span>
              ))}
            </p>

            {sandbox && (
              <p className="mt-2 text-xs text-[var(--fgColor-subtle)] font-mono">
                Sandbox: {sandbox.sandbox_id} · Env key:{" "}
                {sandbox.env_key
                  ? sandbox.env_key.slice(0, 8) + "..."
                  : "(return visit)"}
              </p>
            )}
          </div>

          {/* ================================================================
               SOCIAL PROOF STRIP
               ================================================================ */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mb-8 text-xs text-[var(--fgColor-muted)]">
            <span className="inline-flex items-center gap-1">
              <span className="text-[var(--fgColor-success)]">⚡</span>{" "}
              Sub-millisecond evaluation
            </span>
            <span className="hidden sm:inline text-[var(--borderColor-emphasis)]">
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-[var(--fgColor-accent)]">📦</span> 8 SDKs
            </span>
            <span className="hidden sm:inline text-[var(--borderColor-emphasis)]">
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-[var(--fgColor-done)]">📋</span> Apache 2.0
              License
            </span>
            <span className="hidden sm:inline text-[var(--borderColor-emphasis)]">
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-[var(--fgColor-accent)]">✓</span>{" "}
              OpenFeature Certified
            </span>
            <span className="hidden sm:inline text-[var(--borderColor-emphasis)]">
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-[var(--fgColor-success)]">🏠</span>{" "}
              Self-host for ₹735/mo
            </span>
          </div>

          {/* Desktop countdown */}
          {sandbox && (
            <div
              className={cn(
                "hidden md:block text-center mb-8 text-xs font-medium transition-colors duration-300 rounded-lg py-1.5",
                countdownCritical
                  ? "bg-[var(--bgColor-danger-muted)] text-[var(--fgColor-danger)]"
                  : countdownUrgent
                    ? "bg-[var(--bgColor-attention-muted)] text-[var(--fgColor-attention)]"
                    : "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]",
              )}
            >
              <span
                className={cn(
                  countdownCritical && "animate-countdown-pulse-red",
                )}
              >
                ⏳ Your demo expires in {countdown} · No credit card required
              </span>
            </div>
          )}

          {/* ================================================================
               FLAG CARDS
               ================================================================ */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {flags.map((flag) => {
              const wasToggled = toggledFlags[flag.key];
              const showUpdated = updatedLabels[flag.key];

              return (
                <div
                  key={flag.key}
                  className={cn(
                    "group rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-4 shadow-sm hover:shadow-md hover:border-[var(--fgColor-accent)]/30 transition-all duration-200",
                    wasToggled && "animate-border-flash",
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[var(--fgColor-default)] truncate">
                        {flag.name}
                      </h3>
                      <p className="text-xs text-[var(--fgColor-muted)] font-mono">
                        {flag.key}
                      </p>
                    </div>
                    <button
                      ref={(el) => {
                        toggleRefs.current[flag.key] = el;
                      }}
                      onClick={() => toggleFlag(flag.key)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        flag.enabled
                          ? "bg-[var(--fgColor-success)]"
                          : "bg-[var(--fgColor-muted)]",
                      )}
                      role="switch"
                      aria-checked={flag.enabled}
                      aria-label={"Toggle " + flag.name}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          flag.enabled ? "translate-x-5" : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-[var(--fgColor-subtle)] mb-2">
                    {flag.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[var(--fgColor-subtle)]">
                    <span className="inline-flex items-center rounded-md bg-[var(--bgColor-muted)] px-2 py-0.5 font-medium">
                      {flag.type}
                    </span>
                    <span>{flag.environment}</span>
                  </div>
                  {/* Evaluation preview */}
                  <div
                    className={cn(
                      "mt-3 rounded-md bg-[var(--bgColor-inset)] border border-[var(--borderColor-default)] p-2 transition-all duration-300",
                      wasToggled && "animate-eval-pulse",
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300",
                          showUpdated
                            ? "text-[var(--fgColor-success)]"
                            : "text-[var(--fgColor-subtle)]",
                        )}
                      >
                        {showUpdated ? "Updated ✓" : "Evaluation"}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--fgColor-muted)]">
                        /v1/evaluate
                      </span>
                    </div>
                    <code className="block text-xs font-mono text-[var(--fgColor-default)]">
                      {sandbox ? (
                        <>
                          {'{ "' +
                            flag.key +
                            '": ' +
                            (evalResult[flag.key] ?? flag.enabled) +
                            " }"}
                        </>
                      ) : (
                        <>
                          {'{ "' +
                            flag.key +
                            '": ' +
                            (evalResult[flag.key] ?? flag.enabled) +
                            " } (local)"}
                        </>
                      )}
                    </code>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================================================================
               SDK INTEGRATION
               ================================================================ */}
          <div className="rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-5 sm:p-6 shadow-sm">
            <h3 className="font-semibold text-[var(--fgColor-default)] mb-1">
              Try it in your app
            </h3>
            <p className="text-sm text-[var(--fgColor-muted)] mb-4">
              {sandbox
                ? "Your environment key is pre-configured. Copy and run these commands."
                : "Copy these commands. Your sandbox environment key is pre-configured."}
            </p>
            {/* Language tabs — horizontally scrollable on mobile */}
            <div className="flex flex-nowrap gap-1 mb-4 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {SDK_LANGUAGES.map((sdk) => (
                <button
                  key={sdk.key}
                  onClick={() => setSelectedLang(sdk.key)}
                  className={cn(
                    "shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    selectedLang === sdk.key
                      ? "bg-[var(--bgColor-accent-emphasis)] text-white"
                      : "bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)] hover:bg-[var(--borderColor-default)] hover:text-[var(--fgColor-default)]",
                  )}
                >
                  {sdk.label}
                </button>
              ))}
            </div>
            {/* Code blocks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md bg-[var(--bgColor-inset)] border border-[var(--borderColor-default)] px-3 py-2">
                <code className="text-sm font-mono text-[var(--fgColor-default)] break-all">
                  {lang.install}
                </code>
                <button
                  onClick={() => handleCopy(lang.install)}
                  className="shrink-0 ml-2 text-xs font-medium text-[var(--fgColor-accent)] hover:underline transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="flex items-center justify-between rounded-md bg-[var(--bgColor-inset)] border border-[var(--borderColor-default)] px-3 py-2">
                <code className="text-sm font-mono text-[var(--fgColor-default)] break-all">
                  {lang.init}
                </code>
                <button
                  onClick={() => handleCopy(lang.init)}
                  className="shrink-0 ml-2 text-xs font-medium text-[var(--fgColor-accent)] hover:underline transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* ================================================================
               CTA HIERARCHY — Two-tier
               ================================================================ */}
          <div className="mt-8 text-center">
            <Link href={registerUrl}>
              <Button
                variant="primary"
                size="xl"
                className="w-full sm:w-auto px-10 py-3 text-base font-semibold shadow-[var(--shadow-floating-small)]"
              >
                Claim your demo — it&apos;s free
              </Button>
            </Link>
            <p className="mt-3 text-sm text-[var(--fgColor-muted)]">
              Just browsing? No problem. This demo stays active for 24 hours.
            </p>
          </div>

          {/* ================================================================
               ANXIETY REDUCTION — What happens after signup?
               ================================================================ */}
          <div className="mt-8 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-5 sm:p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--fgColor-default)] mb-4 text-center">
              After you claim your demo:
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  step: "1",
                  text: "Your sandbox becomes your real account — no migration, no data loss",
                },
                {
                  step: "2",
                  text: "All 5 flags, segments, and configs preserved exactly as you see them",
                },
                {
                  step: "3",
                  text: "Invite your team — unlimited seats, one flat fee",
                },
                {
                  step: "4",
                  text: "Integrate our SDK in minutes — 8 languages, copy-paste ready",
                },
                {
                  step: "5",
                  text: "First 14 days free on Pro plan — cancel anytime",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] text-xs font-bold">
                    {item.step}
                  </span>
                  <p className="text-sm text-[var(--fgColor-muted)] leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
           MARKETING CONTENT — Below the fold
           ================================================================ */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--fgColor-default)]">
            Why FeatureSignals?
          </h2>
          <p className="mt-3 text-[var(--fgColor-muted)] max-w-2xl mx-auto">
            The only feature flag platform designed for AI agents and humans.
            Used by teams that ship.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Sub-Millisecond Evaluation",
              desc: "Stateless Go engine. In-memory cache with PG LISTEN/NOTIFY invalidation. No database calls on the hot path.",
            },
            {
              title: "Flat Pricing — INR 1,999/mo",
              desc: "Unlimited seats, projects, and environments. No per-seat fees. No usage meters. One flat price. Save 4-80x vs LaunchDarkly.",
            },
            {
              title: "OpenFeature Native",
              desc: "All 8 SDKs built as first-class OpenFeature providers. Zero vendor lock-in. Switch providers by changing one line.",
            },
            {
              title: "AI Agent Ready",
              desc: "MCP server. Machine-readable docs (HTML + Markdown + JSON). Structured error responses. Agents can read, integrate, and manage flags autonomously.",
            },
            {
              title: "Built-in A/B Testing",
              desc: "Weighted variants, impression tracking, mutual exclusion groups. Experimentation included in every tier.",
            },
            {
              title: "Self-Host for INR 735/mo",
              desc: "Apache 2.0. Single Go binary + PostgreSQL. Deploy on Hetzner, AWS, or air-gapped. The same software that powers our SaaS.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-6 hover:border-[var(--fgColor-accent)]/30 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-[var(--fgColor-default)] mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-[var(--fgColor-muted)] leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/pricing" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              className="sm:w-auto"
            >
              View pricing →
            </Button>
          </Link>
          <Link href="/docs" className="w-full sm:w-auto">
            <Button variant="ghost" size="lg" fullWidth className="sm:w-auto">
              Read the docs →
            </Button>
          </Link>
        </div>
      </section>

      {/* ================================================================
           FOOTER
           ================================================================ */}
      <footer className="border-t border-[var(--borderColor-default)] bg-[var(--bgColor-inset)]">
        <div className="mx-auto max-w-5xl px-4 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--fgColor-muted)]">
          <span>
            &copy; {new Date().getFullYear()} FeatureSignals. Apache 2.0.
          </span>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/docs"
              className="hover:text-[var(--fgColor-default)] transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/blog"
              className="hover:text-[var(--fgColor-default)] transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/pricing"
              className="hover:text-[var(--fgColor-default)] transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="hover:text-[var(--fgColor-default)] transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

async function evaluateAllFlags(
  envKey: string,
  flags: DemoFlag[],
): Promise<Record<string, boolean>> {
  try {
    const flagKeys = flags.map((f) => f.key);
    const res = await fetch(API_URL + "/v1/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + envKey,
      },
      body: JSON.stringify({
        user: { key: "demo-user" },
        flags: flagKeys,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const results: Record<string, boolean> = {};
      flags.forEach((f) => {
        results[f.key] = data?.[f.key] ?? f.enabled;
      });
      return results;
    }
  } catch {
    // Fallback to defaults
  }
  const results: Record<string, boolean> = {};
  flags.forEach((f) => {
    results[f.key] = f.enabled;
  });
  return results;
}
