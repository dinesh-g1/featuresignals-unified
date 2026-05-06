import type { Metadata } from "next";
import { DocsSidebar } from "@/components/docs/docs-sidebar";

export const metadata: Metadata = {
  title: {
    template: "%s | FeatureSignals Docs",
    default: "FeatureSignals Documentation",
  },
  description:
    "FeatureSignals documentation — AI-powered feature flag management with targeted rollouts, A/B experiments, and real-time updates.",
  openGraph: {
    type: "website",
    siteName: "FeatureSignals",
    locale: "en_US",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "FeatureSignals Documentation",
      },
    ],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Docs-specific sidebar on the left */}
      <DocsSidebar />

      {/* Main content area */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
