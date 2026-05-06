"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";

interface SubmitButtonProps
  extends Omit<ButtonProps, "loading" | "children" | "onClick"> {
  onClick: () => Promise<void> | void;
  loading: boolean;
  success?: boolean;
  error?: string | null;
  successDuration?: number;
  children: ReactNode;
  successLabel?: string;
}

/**
 * SubmitButton — API-call button with loading, success, and error states.
 *
 * States:
 *   idle → loading (spinner) → success (checkmark, 1.5s) → idle
 *                           or → error (shake, message) → idle
 */
export function SubmitButton({
  onClick,
  loading,
  success = false,
  error = null,
  successDuration = 1500,
  children,
  successLabel = "Saved!",
  className,
  variant = "primary",
  size = "md",
  disabled,
  ...rest
}: SubmitButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  // Handle success state
  useEffect(() => {
    if (success && !loading) {
      setShowSuccess(true);
      setShowError(null);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, successDuration);
      return () => clearTimeout(timer);
    }
  }, [success, loading, successDuration]);

  // Handle error state
  useEffect(() => {
    if (error && !loading) {
      setShowError(error);
      setShowSuccess(false);
      const timer = setTimeout(() => {
        setShowError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, loading]);

  const handleClick = useCallback(async () => {
    if (loading || showSuccess) return;
    setShowError(null);
    try {
      await onClick();
    } catch {
      // Error handled by parent via error prop
    }
  }, [onClick, loading, showSuccess]);

  const isDisabled = disabled || loading || showSuccess;

  return (
    <div className="relative inline-flex">
      <Button
        variant={showError ? "danger" : variant}
        size={size}
        loading={loading}
        disabled={isDisabled}
        onClick={handleClick}
        className={cn(
          showError && "shake",
          className,
        )}
        {...rest}
      >
        {showSuccess ? (
          <span className="flex items-center gap-1.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="check-animate"
            >
              <path d="M3 8l3.5 3.5L13 5" />
            </svg>
            <span className="copy-bounce">{successLabel}</span>
          </span>
        ) : (
          children
        )}
      </Button>
      {showError && (
        <span className="absolute left-0 right-0 -bottom-6 text-center text-xs text-[var(--fgColor-danger)]">
          {showError}
        </span>
      )}
    </div>
  );
}
