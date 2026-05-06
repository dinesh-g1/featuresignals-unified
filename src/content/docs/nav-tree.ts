// Docs navigation tree — derived from the Docusaurus sidebars.ts structure.
// Each entry maps to an MDX file in src/content/docs/<slug>.mdx

export interface DocNavItem {
  label: string;
  href: string;
  items?: DocNavItem[];
  collapsed?: boolean;
}

export interface DocNavSection {
  label: string;
  collapsed: boolean;
  items: DocNavItem[];
}

// Flat ordered list of all doc paths (for prev/next navigation).
// Derived from the sidebar structure below.
function flattenTree(items: DocNavItem[]): DocNavItem[] {
  const result: DocNavItem[] = [];
  for (const item of items) {
    if (item.href) result.push(item);
    if (item.items) result.push(...flattenTree(item.items));
  }
  return result;
}

export const docsNavSections: DocNavSection[] = [
  {
    label: "Getting Started",
    collapsed: false,
    items: [
      { label: "Introduction", href: "/docs/intro" },
      { label: "Quickstart", href: "/docs/getting-started/quickstart" },
      { label: "Installation", href: "/docs/getting-started/installation" },
      { label: "Create Your First Flag", href: "/docs/getting-started/create-your-first-flag" },
      { label: "Glossary", href: "/docs/glossary" },
    ],
  },
  {
    label: "Core Concepts",
    collapsed: false,
    items: [
      {
        label: "Feature Flag Lifecycle",
        href: "",
        items: [
          {
            label: "Create",
            href: "",
            items: [
              { label: "Feature Flags", href: "/docs/core-concepts/feature-flags" },
              { label: "Toggle Categories", href: "/docs/core-concepts/toggle-categories" },
              { label: "Projects & Environments", href: "/docs/core-concepts/projects-and-environments" },
            ],
          },
          {
            label: "Target",
            href: "",
            items: [
              { label: "Targeting & Segments", href: "/docs/core-concepts/targeting-and-segments" },
              { label: "Implementation Patterns", href: "/docs/core-concepts/implementation-patterns" },
            ],
          },
          {
            label: "Rollout",
            href: "",
            items: [
              { label: "Percentage Rollouts", href: "/docs/core-concepts/percentage-rollouts" },
              { label: "A/B Experimentation", href: "/docs/core-concepts/ab-experimentation" },
              { label: "Mutual Exclusion", href: "/docs/core-concepts/mutual-exclusion" },
              { label: "Prerequisites", href: "/docs/core-concepts/prerequisites" },
            ],
          },
          {
            label: "Monitor",
            href: "",
            items: [
              { label: "Evaluation Metrics", href: "/docs/dashboard/evaluation-metrics" },
              { label: "Flag Health", href: "/docs/dashboard/flag-health" },
              { label: "Usage Insights", href: "/docs/dashboard/usage-insights" },
            ],
          },
          {
            label: "Clean Up",
            href: "",
            items: [
              { label: "Flag Lifecycle", href: "/docs/core-concepts/flag-lifecycle" },
              { label: "AI Janitor", href: "/docs/advanced/ai-janitor" },
              { label: "AI Janitor Quickstart", href: "/docs/advanced/ai-janitor-quickstart" },
              { label: "AI Janitor Git Providers", href: "/docs/advanced/ai-janitor-git-providers" },
              { label: "AI Janitor Configuration", href: "/docs/advanced/ai-janitor-configuration" },
              { label: "AI Janitor PR Workflow", href: "/docs/advanced/ai-janitor-pr-workflow" },
              { label: "AI Janitor LLM Integration", href: "/docs/advanced/ai-janitor-llm-integration" },
              { label: "AI Janitor Troubleshooting", href: "/docs/advanced/ai-janitor-troubleshooting" },
            ],
          },
          {
            label: "Migrate",
            href: "",
            items: [
              { label: "Migrate from LaunchDarkly", href: "/docs/getting-started/migrate-from-launchdarkly" },
              { label: "Migrate from Flagsmith", href: "/docs/getting-started/migrate-from-flagsmith" },
              { label: "Migrate from Unleash", href: "/docs/getting-started/migrate-from-unleash" },
            ],
          },
        ],
      },
    ],
  },
  {
    label: "SDKs",
    collapsed: false,
    items: [
      { label: "SDK Overview", href: "/docs/sdks/overview" },
      { label: "Go", href: "/docs/sdks/go" },
      { label: "Node.js", href: "/docs/sdks/nodejs" },
      { label: "Python", href: "/docs/sdks/python" },
      { label: "Java", href: "/docs/sdks/java" },
      { label: ".NET", href: "/docs/sdks/dotnet" },
      { label: "Ruby", href: "/docs/sdks/ruby" },
      { label: "React", href: "/docs/sdks/react" },
      { label: "Vue", href: "/docs/sdks/vue" },
      { label: "OpenFeature", href: "/docs/sdks/openfeature" },
    ],
  },
  {
    label: "Platform",
    collapsed: true,
    items: [
      { label: "Dashboard Overview", href: "/docs/dashboard/overview" },
      { label: "Managing Flags", href: "/docs/dashboard/managing-flags" },
      { label: "Environment Comparison", href: "/docs/dashboard/env-comparison" },
      { label: "Target Inspector", href: "/docs/dashboard/target-inspector" },
      { label: "Target Comparison", href: "/docs/dashboard/target-comparison" },
      { label: "Relay Proxy", href: "/docs/advanced/relay-proxy" },
      { label: "Scheduling", href: "/docs/advanced/scheduling" },
      { label: "Kill Switch", href: "/docs/advanced/kill-switch" },
      { label: "Approval Workflows", href: "/docs/advanced/approval-workflows" },
      { label: "Webhooks", href: "/docs/advanced/webhooks" },
      { label: "Audit Logging", href: "/docs/advanced/audit-logging" },
      { label: "RBAC", href: "/docs/advanced/rbac" },
    ],
  },
  {
    label: "API Reference",
    collapsed: false,
    items: [
      { label: "Overview", href: "/docs/api-reference/overview" },
      { label: "Authentication", href: "/docs/api-reference/authentication" },
      { label: "Projects", href: "/docs/api-reference/projects" },
      { label: "Environments", href: "/docs/api-reference/environments" },
      { label: "Flags", href: "/docs/api-reference/flags" },
      { label: "Flag State", href: "/docs/api-reference/flag-state" },
      { label: "Evaluation", href: "/docs/api-reference/evaluation" },
      { label: "Segments", href: "/docs/api-reference/segments" },
      { label: "API Keys", href: "/docs/api-reference/api-keys" },
      { label: "Team Management", href: "/docs/api-reference/team-management" },
      { label: "Approvals", href: "/docs/api-reference/approvals" },
      { label: "Webhooks", href: "/docs/api-reference/webhooks" },
      { label: "Audit Log", href: "/docs/api-reference/audit-log" },
      { label: "Metrics", href: "/docs/api-reference/metrics" },
      { label: "Billing", href: "/docs/api-reference/billing" },
      { label: "Demo", href: "/docs/api-reference/demo" },
      { label: "Onboarding", href: "/docs/api-reference/onboarding" },
      {
        label: "Enterprise APIs",
        href: "",
        items: [
          { label: "SSO", href: "/docs/api-reference/sso" },
          { label: "SCIM", href: "/docs/api-reference/scim" },
          { label: "MFA", href: "/docs/api-reference/mfa" },
          { label: "IP Allowlist", href: "/docs/api-reference/ip-allowlist" },
          { label: "Custom Roles", href: "/docs/api-reference/custom-roles" },
          { label: "Data Export", href: "/docs/api-reference/data-export" },
        ],
      },
    ],
  },
  {
    label: "Architecture",
    collapsed: true,
    items: [
      { label: "Overview", href: "/docs/architecture/overview" },
      { label: "Evaluation Engine", href: "/docs/architecture/evaluation-engine" },
      { label: "Real-Time Updates", href: "/docs/architecture/real-time-updates" },
    ],
  },
  {
    label: "Deployment",
    collapsed: true,
    items: [
      { label: "Onboarding Guide", href: "/docs/self-hosting/onboarding-guide" },
      { label: "Docker Compose", href: "/docs/deployment/docker-compose" },
      { label: "Self-Hosting", href: "/docs/deployment/self-hosting" },
      { label: "On-Premises", href: "/docs/deployment/on-premises" },
      { label: "Configuration", href: "/docs/deployment/configuration" },
      { label: "Incident Runbook", href: "/docs/operations/incident-runbook" },
      { label: "Disaster Recovery", href: "/docs/operations/disaster-recovery" },
    ],
  },
  {
    label: "Tutorials",
    collapsed: true,
    items: [
      { label: "Feature Flag Checkout", href: "/docs/tutorials/feature-flag-checkout" },
      { label: "A/B Testing React", href: "/docs/tutorials/ab-testing-react" },
      { label: "Progressive Rollout", href: "/docs/tutorials/progressive-rollout" },
      { label: "Kill Switch", href: "/docs/tutorials/kill-switch" },
    ],
  },
  {
    label: "Enterprise",
    collapsed: true,
    items: [
      { label: "Enterprise Overview", href: "/docs/enterprise/overview" },
      { label: "Enterprise Onboarding", href: "/docs/enterprise/onboarding" },
    ],
  },
  {
    label: "Security & Compliance",
    collapsed: true,
    items: [
      { label: "Security Overview", href: "/docs/compliance/security-overview" },
      { label: "Privacy Policy", href: "/docs/compliance/privacy-policy" },
      { label: "Data Retention", href: "/docs/compliance/data-retention" },
      { label: "DPA Template", href: "/docs/compliance/dpa-template" },
      { label: "Subprocessors", href: "/docs/compliance/subprocessors" },
      { label: "GDPR Rights", href: "/docs/compliance/gdpr-rights" },
      { label: "SOC 2 Controls Matrix", href: "/docs/compliance/soc2/controls-matrix" },
      { label: "SOC 2 Evidence Collection", href: "/docs/compliance/soc2/evidence-collection" },
      { label: "SOC 2 Incident Response", href: "/docs/compliance/soc2/incident-response" },
      { label: "CCPA/CPRA", href: "/docs/compliance/ccpa-cpra" },
      { label: "ISO 27701 PIMS", href: "/docs/compliance/iso27701/pims-overview" },
      { label: "Data Privacy Framework", href: "/docs/compliance/data-privacy-framework" },
      { label: "ISO 27001 ISMS", href: "/docs/compliance/iso27001/isms-overview" },
      { label: "HIPAA", href: "/docs/compliance/hipaa" },
      { label: "DORA", href: "/docs/compliance/dora" },
      { label: "CSA STAR", href: "/docs/compliance/csa-star" },
    ],
  },
];

// Flattened list for prev/next navigation — includes only items with href
function buildFlatList(sections: DocNavSection[]): DocNavItem[] {
  const result: DocNavItem[] = [];
  for (const section of sections) {
    const flattened = flattenTree(section.items);
    result.push(...flattened.filter((i) => i.href !== ""));
  }
  return result;
}

export const docsFlatList: DocNavItem[] = buildFlatList(docsNavSections);

/** Find prev/next docs given the current href */
export function getAdjacentDocs(
  currentHref: string,
): { prev: DocNavItem | null; next: DocNavItem | null } {
  const idx = docsFlatList.findIndex((i) => i.href === currentHref);
  return {
    prev: idx > 0 ? docsFlatList[idx - 1] : null,
    next: idx < docsFlatList.length - 1 ? docsFlatList[idx + 1] : null,
  };
}
