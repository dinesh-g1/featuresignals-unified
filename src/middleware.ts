import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_PREFIXES = [
  "/projects",
  "/settings",
  "/activity",
  "/onboarding",
  "/segments",
  "/analytics",
  "/webhooks",
  "/team",
  "/env-comparison",
  "/target-inspector",
  "/target-comparison",
  "/api-keys",
  "/approvals",
  "/janitor",
  "/health",
  "/usage",
  "/support",
  "/limits",
  "/dashboard",
];

// Routes that are always public (no auth required)
const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/auth",
  "/flags",  // sandbox eval playground
  "/docs",
  "/blog",
  "/pricing",
  "/about",
  "/contact",
  "/integrations",
  "/customers",
  "/partners",
  "/features",
  "/use-cases",
  "/migrate",
  "/rollout",
  "/target",
  "/create",
  "/cleanup",
  "/api",    // API routes
  "/_next",  // Next.js internal
  "/favicon",
  "/health",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) {
    return NextResponse.next();
  }

  // Check if route needs protection
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );

  if (!needsAuth) {
    return NextResponse.next();
  }

  // Check for auth cookie/token
  const token = request.cookies.get("featuresignals-store")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
