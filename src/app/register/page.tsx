"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { api, APIError } from "@/lib/api";
import { isPasswordStrong } from "@/components/ui/password-strength";
import { PasswordStrengthInline } from "@/components/ui/password-strength";
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
import type { ClaimSandboxResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RegisterStep =
  | { kind: "form" }
  | { kind: "otp"; email: string; password: string; name: string };

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateForm(data: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): FormErrors {
  const errors: FormErrors = {};

  if (!data.name.trim()) {
    errors.name = "Name is required";
  }

  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Enter a valid email address";
  }

  if (!data.password) {
    errors.password = "Password is required";
  } else if (data.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  } else if (!isPasswordStrong(data.password)) {
    errors.password =
      "Password must include uppercase, lowercase, number, and special character";
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords don't match";
  }

  return errors;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    switch (error.status) {
      case 409:
        return "An account with this email already exists. Try logging in instead.";
      case 404:
        return "This sandbox is no longer available. It may have expired.";
      case 400:
        return error.message || "Invalid input. Please check your fields.";
      case 429:
        return "Too many attempts. Please wait a moment and try again.";
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
// Register form (inner — uses useSearchParams)
// ---------------------------------------------------------------------------

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sandboxId = searchParams.get("sandbox_id");

  const setAuth = useAppStore((s) => s.setAuth);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Step (form → otp for standard signup)
  const [step, setStep] = useState<RegisterStep>({ kind: "form" });
  const [otp, setOtp] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleFieldChange = useCallback(
    (field: keyof FormErrors, value: string) => {
      setFormErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      switch (field) {
        case "name":
          setName(value);
          break;
        case "email":
          setEmail(value);
          break;
        case "password":
          setPassword(value);
          break;
        case "confirmPassword":
          setConfirmPassword(value);
          break;
      }
    },
    [],
  );

  const handleSubmitForm = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const errors = validateForm({ name, email, password, confirmPassword });
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      setSubmitting(true);

      try {
        if (sandboxId) {
          // Sandbox claim flow — creates account and returns tokens
          const result = await api.claimSandbox(sandboxId, {
            email: email.trim(),
            password,
            name: name.trim(),
          });
          handleClaimSuccess(result);
        } else {
          // Standard signup flow — sends OTP first
          await api.initiateSignup({
            email: email.trim(),
            password,
            name: name.trim(),
            org_name: name.trim(),
          });
          setStep({
            kind: "otp",
            email: email.trim(),
            password,
            name: name.trim(),
          });
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    [name, email, password, confirmPassword, sandboxId],
  );

  const handleClaimSuccess = useCallback(
    (result: ClaimSandboxResponse) => {
      // If the server returned auth tokens, use them directly.
      // Otherwise the server just confirms the claim — redirect to login.
      if (result.access_token && result.user) {
        setAuth(
          result.access_token,
          result.refresh_token ?? "",
          result.user,
          result.organization ?? null,
          result.expires_at,
        );
        router.push("/projects");
      } else {
        // Server returned { claimed: true } without tokens.
        // Redirect to login so the user can sign in.
        router.push(
          `/login?claimed=true&email=${encodeURIComponent(email.trim())}`,
        );
      }
    },
    [email, setAuth, router],
  );

  const handleSubmitOTP = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!otp.trim()) {
        setError("Please enter the verification code");
        return;
      }

      const { email: stepEmail } = step as {
        kind: "otp";
        email: string;
      };

      setSubmitting(true);

      try {
        const result = await api.completeSignup({
          email: stepEmail,
          otp: otp.trim(),
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
    [otp, step, setAuth, router],
  );

  const handleResendOTP = useCallback(async () => {
    const { email: stepEmail } = step as { kind: "otp"; email: string };
    try {
      await api.resendSignupOTP(stepEmail);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [step]);

  // ── Render: OTP step ────────────────────────────────────────────

  if (step.kind === "otp") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md animate-scale-in">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a 6-digit verification code to{" "}
              <span className="font-medium text-[var(--fgColor-default)]">
                {step.email}
              </span>
              . Enter it below to complete your registration.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmitOTP}>
            <CardContent className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-[var(--borderColor-danger-emphasis)] bg-[var(--bgColor-danger-muted)] px-3 py-2.5 text-sm text-[var(--fgColor-danger)]"
                >
                  {error}
                </div>
              )}

              <FormField label="Verification code" htmlFor="otp">
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                />
              </FormField>
            </CardContent>

            <CardFooter className="flex-col gap-3">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={submitting}
              >
                Verify &amp; Create Account
              </Button>
              <button
                type="button"
                onClick={handleResendOTP}
                className="text-sm text-[var(--fgColor-accent)] hover:underline"
              >
                Resend code
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // ── Render: Registration form ───────────────────────────────────

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader>
          <CardTitle>
            {sandboxId ? "Claim your demo setup" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {sandboxId
              ? "Create an account to save your demo and keep all your flags, segments, and settings."
              : "Start building with feature flags in under a minute."}
          </CardDescription>
          {sandboxId && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--bgColor-accent-muted)] px-3 py-1 text-xs font-medium text-[var(--fgColor-accent)]">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.28 5.78a.75.75 0 0 0-1.06-1.06L7.25 7.69 5.78 6.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z" />
              </svg>
              Demo &mdash; ready to claim
            </div>
          )}
        </CardHeader>

        <form onSubmit={handleSubmitForm}>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-[var(--borderColor-danger-emphasis)] bg-[var(--bgColor-danger-muted)] px-3 py-2.5 text-sm text-[var(--fgColor-danger)]"
              >
                {error}
              </div>
            )}

            <FormField
              label="Name"
              htmlFor="name"
              required
              error={formErrors.name}
            >
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
              />
            </FormField>

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
                  autoComplete="new-password"
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
              <PasswordStrengthInline password={password} />
            </FormField>

            <FormField
              label="Confirm password"
              htmlFor="confirm-password"
              required
              error={formErrors.confirmPassword}
            >
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) =>
                  handleFieldChange("confirmPassword", e.target.value)
                }
              />
            </FormField>
          </CardContent>

          <CardFooter className="flex-col gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
            >
              {sandboxId ? "Claim Your Setup" : "Create Account"}
            </Button>
            <p className="text-sm text-[var(--fgColor-muted)]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-[var(--fgColor-accent)] hover:underline"
              >
                Sign in
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
