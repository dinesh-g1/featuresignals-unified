/**
 * Auth Layout — centered card wrapper for authentication pages.
 *
 * Pages under /auth/* (e.g. /auth/forgot-password, /auth/reset-password,
 * /auth/verify-email) use this layout to get a clean, focused card UI
 * while still being wrapped by the root layout shell (top bar + side rail).
 *
 * Standalone pages like /login and /register use the same visual pattern
 * via their own centered-card markup so they can independently read
 * search params (sandbox_id, email, etc.) with Suspense boundaries.
 */

import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-scale-in">
        {children}
      </div>
    </div>
  );
}
