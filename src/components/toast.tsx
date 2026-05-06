"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
  paused: boolean;
  createdAt: number;
}

// ── Global toast dispatcher ─────────────────────────────────────────────────

let addToast: (message: string, type?: ToastType) => void = () => {};

export function toast(message: string, type: ToastType = "info") {
  addToast(message, type);
}

// ── Icons ───────────────────────────────────────────────────────────────────

function SuccessIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm11.78-1.28a.75.75 0 00-1.06-1.06L6.75 9.69 5.28 8.22a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4.5-4.5z" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M6.28 1.22a.75.75 0 00-1.06 1.06L6.94 4l-1.72 1.72a.75.75 0 001.06 1.06L8 5.06l1.72 1.72a.75.75 0 101.06-1.06L9.06 4l1.72-1.72a.75.75 0 00-1.06-1.06L8 2.94 6.28 1.22zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0z" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378c.29.544.045 1.225-.513 1.46a1.02 1.02 0 01-.397.072H2.285c-1.385 0-2.25-1.507-1.543-2.693L6.457 1.047zM8.75 5.5a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3zm-.75 5.5a1 1 0 100-2 1 1 0 000 2z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.22 2.22a.75.75 0 011.06 0L6 4.94 8.72 2.22a.75.75 0 111.06 1.06L7.06 6l2.72 2.72a.75.75 0 11-1.06 1.06L6 7.06l-2.72 2.72a.75.75 0 01-1.06-1.06L4.94 6 2.22 3.28a.75.75 0 010-1.06z" />
    </svg>
  );
}

// ── Style maps ──────────────────────────────────────────────────────────────

const iconMap: Record<
  ToastType,
  React.ComponentType<{ className?: string }>
> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

const styleMap: Record<ToastType, string> = {
  success:
    "bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)] ring-[var(--borderColor-success-muted)]",
  error:
    "bg-[var(--bgColor-danger-muted)] text-[var(--fgColor-danger)] ring-[var(--borderColor-danger-emphasis)]/20",
  warning:
    "bg-[var(--bgColor-attention-muted)] text-[var(--fgColor-attention)] ring-[var(--borderColor-attention-muted)]",
  info: "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] ring-[var(--borderColor-accent-muted)]",
};

const progressColorMap: Record<ToastType, string> = {
  success: "var(--bgColor-success-emphasis)",
  error: "var(--bgColor-danger-emphasis)",
  warning: "var(--bgColor-attention-emphasis)",
  info: "var(--bgColor-accent-emphasis)",
};

const TOAST_DURATION = 4000;
const EXIT_ANIMATION_DURATION = 250;

// ── Container ───────────────────────────────────────────────────────────────

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [counter, setCounter] = useState(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismiss = useCallback((id: number) => {
    // Clear any existing timer
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, exiting: true, paused: true } : t,
      ),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_ANIMATION_DURATION);
  }, []);

  const add = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = counter;
      setCounter((c) => c + 1);
      const newToast: Toast = {
        id,
        message,
        type,
        exiting: false,
        paused: false,
        createdAt: Date.now(),
      };
      setToasts((prev) => [...prev, newToast]);

      // Schedule auto-dismiss
      const dismissTimer = setTimeout(() => {
        dismiss(id);
      }, TOAST_DURATION);
      timersRef.current.set(id, dismissTimer);

      return id;
    },
    [counter, dismiss],
  );

  useEffect(() => {
    addToast = add;
  }, [add]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 max-w-[380px] w-full pointer-events-none"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((t) => {
        const Icon = iconMap[t.type];
        return (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        );
      })}
    </div>
  );
}

// ── Individual Toast ────────────────────────────────────────────────────────

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const startX = touchStartX.current;
    const startY = touchStartY.current;
    if (startX === null || startY === null) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    // Only start swiping if horizontal movement > vertical
    if (!isSwiping.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
      isSwiping.current = true;
    }
    if (isSwiping.current && dx > 0) {
      setSwipeOffset(dx);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (swipeOffset > 80) {
      onDismiss();
    } else {
      setSwipeOffset(0);
    }
    touchStartX.current = null;
    touchStartY.current = null;
    isSwiping.current = false;
  }, [swipeOffset, onDismiss]);

  const Icon = iconMap[t.type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
        opacity:
          swipeOffset > 0 ? Math.max(0, 1 - swipeOffset / 200) : undefined,
      }}
      className={`pointer-events-auto relative overflow-hidden rounded-xl ring-1 shadow-lg transition-all duration-200 ${
        t.exiting ? "opacity-0 translate-x-4 scale-95" : "animate-bounce-in"
      } ${styleMap[t.type]}`}
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium flex-1">{t.message}</span>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss notification"
        >
          <CloseIcon className="h-3 w-3" />
        </button>
      </div>
      {/* Progress bar */}
      {!t.exiting && !t.paused && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-full opacity-40 toast-progress-bar"
          style={{
            backgroundColor: progressColorMap[t.type],
          }}
        />
      )}
      {/* Swipe hint on mobile */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-25 hidden sm:hidden">
        &larr; swipe
      </div>
    </div>
  );
}
