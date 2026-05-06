import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ShellProvider } from "@/components/shell/shell-provider";
import { TopBar } from "@/components/shell/top-bar";
import { SideRail } from "@/components/shell/side-rail";
import { SearchDialog } from "@/components/shell/search";
import { ToastContainer } from "@/components/toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://featuresignals.com"),
  title: {
    template: "%s | FeatureSignals",
    default: "FeatureSignals — Feature Flags You Can Use Before You Sign Up",
  },
  description:
    "FeatureSignals is the only feature flag platform designed for AI agents and humans. Sub-millisecond evaluation, OpenFeature-native SDKs, flat pricing, and a sandbox you can use without signing up.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "FeatureSignals",
    locale: "en_US",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "FeatureSignals — Feature Delivery Platform",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  keywords: [
    "feature flags",
    "feature flag management",
    "enterprise feature flags",
    "LaunchDarkly alternative",
    "OpenFeature",
    "feature toggles",
    "AI agent feature flags",
    "MCP server feature flags",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full scroll-smooth`}>
      <head />
      <body className="min-h-full flex bg-[var(--bgColor-default)] text-[var(--fgColor-default)] font-sans antialiased selection:bg-[var(--bgColor-accent-emphasis)] selection:text-white">
        <ShellProvider>
          <ShellLayout>{children}</ShellLayout>
          <SearchDialog />
          <ToastContainer />
        </ShellProvider>
      </body>
    </html>
  );
}

function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full w-full">
      <SideRail />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 page-enter">{children}</main>
      </div>
    </div>
  );
}
