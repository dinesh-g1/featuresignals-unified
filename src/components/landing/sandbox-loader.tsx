"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface LoaderStep {
  label: string;
  status: "pending" | "running" | "complete";
}

const STEPS: LoaderStep[] = [
  { label: "Spinning up a sandbox organization", status: "pending" },
  { label: "Creating demo project & environments", status: "pending" },
  { label: "Generating sample feature flags", status: "pending" },
  { label: "Connecting evaluation engine", status: "pending" },
  { label: "Preparing SDK snippets", status: "pending" },
];

const STEP_ANIMATION_DELAY_MS = 500;

export function SandboxLoader({ className }: { className?: string }) {
  const [steps, setSteps] = useState<LoaderStep[]>(STEPS);
  const [allDone, setAllDone] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const advanceStep = useCallback((index: number) => {
    setSteps((prev) => {
      const next = [...prev];
      // Mark previous steps complete
      for (let i = 0; i < index; i++) {
        if (next[i].status === "running") {
          next[i] = { ...next[i], status: "complete" };
        }
      }
      // Start current step
      if (index < next.length && next[index].status === "pending") {
        next[index] = { ...next[index], status: "running" };
      }
      return next;
    });

    // After a beat, mark the current step complete and advance
    if (index < STEPS.length) {
      const timer = setTimeout(() => {
        setSteps((prev) => {
          const next = [...prev];
          if (next[index]?.status === "running") {
            next[index] = { ...next[index], status: "complete" };
          }
          return next;
        });
        if (index + 1 < STEPS.length) {
          advanceStep(index + 1);
        } else {
          // All steps done
          const doneTimer = setTimeout(() => {
            setAllDone(true);
          }, 300);
          timersRef.current.push(doneTimer);
        }
      }, STEP_ANIMATION_DELAY_MS);
      timersRef.current.push(timer);
    }
  }, []);

  useEffect(() => {
    // Kick off the first step
    const kickoff = setTimeout(() => {
      advanceStep(0);
    }, 300);
    timersRef.current.push(kickoff);

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [advanceStep]);

  return (
    <div
      className={cn(
        "w-full max-w-md mx-auto rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow-floating-small)] p-6",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-base">⚡</span>
        <h2 className="text-sm font-semibold text-[var(--fgColor-default)]">
          Creating your demo environment...
        </h2>
      </div>

      {/* Steps */}
      <div className="space-y-0.5 mb-5">
        {steps.map((step, i) => (
          <div
            key={step.label}
            className={cn(
              "flex items-center gap-3 px-2 py-1.5 rounded-md transition-all duration-300",
              step.status === "running" &&
                "bg-[var(--bgColor-accent-muted)]/50",
            )}
          >
            {/* Status icon */}
            <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
              {step.status === "pending" && (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--borderColor-default)]" />
              )}
              {step.status === "running" && (
                <span className="relative flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--fgColor-accent)] opacity-40" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-[var(--fgColor-accent)]" />
                </span>
              )}
              {step.status === "complete" && (
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[var(--fgColor-success)]">
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2.5 6L5 8.5L9.5 3.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </span>

            {/* Label */}
            <span
              className={cn(
                "text-sm transition-colors duration-300",
                step.status === "pending" && "text-[var(--fgColor-subtle)]",
                step.status === "running" &&
                  "text-[var(--fgColor-default)] font-medium",
                step.status === "complete" && "text-[var(--fgColor-success)]",
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p
        className={cn(
          "text-xs text-center text-[var(--fgColor-muted)] transition-all duration-500",
          allDone && "text-[var(--fgColor-success)] font-medium",
        )}
      >
        {allDone
          ? "✓ Ready! Your sandbox is live."
          : "This takes ~2 seconds. No signup required."}
      </p>
    </div>
  );
}
