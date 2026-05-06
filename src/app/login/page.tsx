"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { api, APIError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface FormErrors {
  email?: string;
  password?: string;
}

function validateForm(data: { email: string; password: string }): FormErrors {
  const errors: FormErrors = {};

  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Enter a valid email address";
  }

  if (!data.password) {
    errors.password = "Password is required";
  }

  return errors;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    switch (error.status) {
      case 401:
        return "Invalid email or password. Please try again.";
      case 429:
        return "Too many login attempts. Please wait a moment and try again.";
      case 403:
        return error.message || "Account disabled. Please contact support.";
      default:
        return error.message || "Something went wrong. Please try again.";
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred. Please try again.";
}

// ---------------------------------------------------------------------------
// Login form (inner — uses useSearchParams)
// ---------------------------------------------------------------------------

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setAuth = useAppStore((s) => s.setAuth);

  // Pre-fill email from query params (e.g. redirected after sandbox claim)
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Post-claim message
  const claimed = searchParams.get("claimed");
  const sessionExpired = searchParams.get("session_expired");

  const handleFieldChange = useCallback(
    (field: keyof FormErrors, value: string) => {
      setFormErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      if (field === "email") setEmail(value);
      else setPassword(value);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const errors = validateForm({ email, password });
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      setSubmitting(true);

      try {
        const result = await api.login({
          email: email.trim(),
          password,
        });

        setAuth(
          result.tokens.access_token,
          result.tokens.refresh_token,
          result.user,
          result.organization ?? null,
          result.tokens.expires_at,
          result.onboarding_completed,
        );

        router.push("/projects");
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, setAuth, router],
  );

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader>
          <CardTitle>Sign in to FeatureSignals</CardTitle>
          <CardDescription>
            Welcome back. Enter your credentials to continue.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Claimed-success banner */}
            {claimed === "true" && (
              <div className="rounded-lg border border-[var(--borderColor-success-emphasis)] bg-[var(--bgColor-success-muted)] px-3 py-2.5 text-sm text-[var(--fgColor-success)]">
                Your demo has been claimed! Sign in with your new account to
                continue.
              </div>
            )}

            {/* Session-expired banner */}
            {sessionExpired === "true" && (
              <div className="rounded-lg border border-[var(--borderColor-attention-emphasis)] bg-[var(--bgColor-attention-muted)] px-3 py-2.5 text-sm text-[var(--fgColor-attention)]">
                Your session has expired. Please sign in again.
              </div>
            )}

            {/* Error display */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-[var(--borderColor-danger-emphasis)] bg-[var(--bgColor-danger-muted)] px-3 py-2.5 text-sm text-[var(--fgColor-danger)]"
              >
                {error}
              </div>
            )}

            <FormField
              label="Email"
              htmlFor="email"
              required
              error={formErrors.email}
            >
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="password"
              required
              error={formErrors.password}
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) =>
                    handleFieldChange("password", e.target.value)
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fgColor-subtle)] hover:text-[var(--fgColor-default)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path d="M8 3C4.36 3 1.26 5.5 0 8c1.26 2.5 4.36 5 8 5s6.74-2.5 8-5c-1.26-2.5-4.36-5-8-5Zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path d="M8 3C4.36 3 1.26 5.5 0 8c1.26 2.5 4.36 5 8 5s6.74-2.5 8-5c-1.26-2.5-4.36-5-8-5ZM5 8a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </FormField>

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-[var(--fgColor-accent)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
            >
              Sign In
            </Button>
            <p className="text-sm text-[var(--fgColor-muted)]">
              Don&rsquo;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-[var(--fgColor-accent)] hover:underline"
              >
                Create one
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export (with Suspense boundary for useSearchParams)
// ---------------------------------------------------------------------------

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
