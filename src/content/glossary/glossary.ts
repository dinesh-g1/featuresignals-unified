// =============================================================================
// FeatureSignals Glossary — Single source of truth for terminology definitions.
//
// Used by:
//   - Emergent documentation (shortDef — inline on product pages)
//   - Formal /docs pages (longDef — full explanations)
//   - AI agents / MCP server (structured data for context injection)
//   - SDK docs generation
//
// Phase 4 will move this to a CMS-backed content layer. For now, all entries
// are hardcoded and version-controlled alongside the app.
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GlossaryCategory = "core" | "advanced" | "sdk" | "api";

export interface GlossaryEntry {
  term: string;
  shortDef: string; // One-liner for emergent docs
  longDef: string; // Full explanation for /docs
  relatedTerms: string[];
  category: GlossaryCategory;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const glossary: Map<string, GlossaryEntry> = new Map();

function register(entry: GlossaryEntry): void {
  // Normalize to lowercase for case-insensitive lookup
  glossary.set(entry.term.toLowerCase(), entry);
}

// ---------------------------------------------------------------------------
// Core Concepts
// ---------------------------------------------------------------------------

register({
  term: "Flag",
  shortDef:
    "A feature flag is a conditional toggle that lets you control who sees a feature without deploying code.",
  longDef: `A feature flag (also called a feature toggle) is a software development technique that allows you to turn functionality on or off without changing code. FeatureSignals flags evaluate in under 1ms by caching rulesets in memory and using PG LISTEN/NOTIFY for cross-instance invalidation.

Flags have a type (Release, Experiment, Ops, or Permission) that determines their lifecycle and intended use. Each flag belongs to a Project and has separate states per Environment. Flags evaluate against a user context at runtime, returning a value based on targeting rules, percentage rollouts, and default values.`,
  relatedTerms: [
    "Toggle Category",
    "Targeting Rule",
    "Percentage Rollout",
    "Environment",
    "Project",
  ],
  category: "core",
});

register({
  term: "Segment",
  shortDef:
    "A segment is a reusable group of users defined by attribute rules (e.g., 'beta testers' or 'enterprise customers').",
  longDef: `Segments let you define user groups once and reuse them across multiple flags. A segment is defined by a set of conditions on user attributes (e.g., email ends with @company.com, or plan = enterprise).

Segments support AND/OR match logic and can be combined with per-flag targeting rules. When a segment updates, all flags referencing that segment automatically reflect the change — no need to update each flag individually.

Segments are scoped to a Project and available across all environments within that project.`,
  relatedTerms: ["Flag", "Targeting Rule", "Condition"],
  category: "core",
});

register({
  term: "Environment",
  shortDef:
    "An environment is an isolated context for flag states (e.g., Development, Staging, Production).",
  longDef: `Environments represent different deployment stages in your software delivery pipeline. Common environments include Development, Staging, and Production. Each environment has its own independent flag states, targeting rules, and rollouts.

This means you can have a flag enabled in Development for testing, rolled out to 10% of users in Staging for validation, and disabled in Production — all from the same flag definition. Environments enable safe, progressive delivery workflows.`,
  relatedTerms: ["Flag", "Project", "Percentage Rollout"],
  category: "core",
});

register({
  term: "Project",
  shortDef:
    "A project groups related flags, segments, and environments together — typically one per application or service.",
  longDef: `A Project is the top-level organizational unit for your feature flags. It contains flags, segments, and environments. Most teams create one project per application or microservice.

Projects provide logical isolation: flags in different projects are independent and can use the same keys without conflict. Billing and usage limits are tracked at the organization level, but projects help you organize your work.`,
  relatedTerms: ["Flag", "Segment", "Environment", "Organization"],
  category: "core",
});

register({
  term: "Targeting Rule",
  shortDef:
    "A targeting rule defines who gets which flag value based on user attributes (e.g., 'email contains @test.com → true').",
  longDef: `Targeting rules are the core mechanism for controlling who sees a feature. Each rule consists of conditions on user attributes (attribute, operator, values) and the value to serve when those conditions match.

Rules are evaluated in priority order — the first matching rule wins. If no rules match, the flag falls through to the percentage rollout (if configured) or the default value.

Targeting rules support operators like equals, not-equals, contains, starts-with, ends-with, in (array), and regex matching. You can also target specific segments as a shortcut for reusable rule sets.`,
  relatedTerms: ["Flag", "Segment", "Percentage Rollout", "Condition"],
  category: "core",
});

register({
  term: "Percentage Rollout",
  shortDef:
    "A percentage rollout gradually exposes a flag to a random percentage of users (0–100%).",
  longDef: `Percentage rollouts let you gradually release a feature to a subset of users. For example, a 10% rollout means approximately 10% of your user base will see the feature. The assignment is deterministic based on a hash of the user key — so a given user consistently sees the same value.

Percentage rollouts are often used for canary releases: start at 1%, monitor metrics, increase to 10%, 50%, and finally 100%. If targeting rules are present, they take priority over the percentage rollout — the percentage only applies to users who don't match any targeting rule.`,
  relatedTerms: ["Flag", "Targeting Rule", "Environment"],
  category: "core",
});

// ---------------------------------------------------------------------------
// Toggle Categories
// ---------------------------------------------------------------------------

register({
  term: "Release Toggle",
  shortDef:
    "A release toggle decouples deployment from release — ship code dark and enable it when ready.",
  longDef: `Release toggles are the most common type of feature flag. They allow teams to deploy code to production while keeping it hidden from users until it's ready. This decouples deployment (pushing code) from release (exposing it to users).

Release toggles are typically short-lived — they should be removed once the feature is fully rolled out and stable. FeatureSignals' Janitor helps detect and clean up stale release toggles automatically.`,
  relatedTerms: ["Flag", "Toggle Category", "Janitor"],
  category: "core",
});

register({
  term: "Experiment Toggle",
  shortDef:
    "An experiment toggle powers A/B tests by randomly assigning users to variants and measuring outcomes.",
  longDef: `Experiment toggles drive A/B tests and multivariate experiments. Unlike simple on/off flags, experiment toggles can have multiple variants (e.g., control vs. treatment A vs. treatment B). Users are randomly assigned to variants, and you measure the impact on key metrics.

FeatureSignals supports experiment toggles with built-in variant support, weighted allocation, and evaluation reason tracking so your analytics pipeline knows exactly which variant each user saw.`,
  relatedTerms: ["Flag", "Toggle Category", "Variant"],
  category: "core",
});

register({
  term: "Ops Toggle",
  shortDef:
    "An ops toggle controls operational behavior — maintenance mode, feature kill switches, or rate limiting.",
  longDef: `Ops (operational) toggles control infrastructure and operational behavior rather than product features. Common examples include: maintenance mode banners, emergency kill switches for problematic features, rate limiting toggles, and debug mode flags.

Ops toggles tend to be longer-lived than release toggles and are often controlled by operations or SRE teams rather than product teams. They should be clearly labeled so they aren't accidentally cleaned up by Janitor.`,
  relatedTerms: ["Flag", "Toggle Category", "Kill Switch"],
  category: "core",
});

register({
  term: "Permission Toggle",
  shortDef:
    "A permission toggle gates features based on user tier, plan, or role — like 'admin-only preview'.",
  longDef: `Permission toggles control access to features based on user permissions, plans, or roles rather than gradual rollout. Examples include: admin-only features, premium plan features, internal tools, and beta access for specific users.

Unlike release toggles, permission toggles are often long-lived or permanent — they represent business rules about who can access what. They're managed differently from release toggles and excluded from Janitor cleanup.`,
  relatedTerms: ["Flag", "Toggle Category", "Targeting Rule"],
  category: "core",
});

// ---------------------------------------------------------------------------
// Flag Statuses
// ---------------------------------------------------------------------------

register({
  term: "Active",
  shortDef:
    "The flag is live and actively evaluating. This is the normal operating state.",
  longDef: `An active flag is live in at least one environment and evaluating against user requests. Active flags appear in the dashboard, SDK evaluations, and analytics. This is the normal operating state for flags that are in use.`,
  relatedTerms: ["Flag", "Flag Status"],
  category: "core",
});

register({
  term: "Rolled Out",
  shortDef:
    "The flag has been fully rolled out to 100% and is awaiting cleanup.",
  longDef: `A rolled-out flag has been deployed to 100% of users and is no longer needed as a toggle — the feature is effectively permanent. Rolled-out flags should be removed from code and archived. FeatureSignals' Janitor automatically detects rolled-out flags and can generate cleanup pull requests.`,
  relatedTerms: ["Flag", "Flag Status", "Janitor", "Archived"],
  category: "core",
});

register({
  term: "Deprecated",
  shortDef:
    "The flag is marked for removal. It may still evaluate but should not be used in new code.",
  longDef: `A deprecated flag is scheduled for removal. It may still serve evaluations for backward compatibility, but teams should stop using it in new code. Deprecated flags show warnings in the dashboard and SDK. After a deprecation period (typically 30 days), the flag can be archived.`,
  relatedTerms: ["Flag", "Flag Status", "Archived"],
  category: "core",
});

register({
  term: "Archived",
  shortDef:
    "The flag has been removed from active use and is preserved for audit purposes only.",
  longDef: `An archived flag is no longer active and does not evaluate. It's preserved for audit trail purposes — you can still see its history, who changed it, and when it was removed. Archived flags don't appear in the main flags list by default and don't consume evaluation quota.`,
  relatedTerms: ["Flag", "Flag Status", "Deprecated"],
  category: "core",
});

// ---------------------------------------------------------------------------
// SDK & API Concepts
// ---------------------------------------------------------------------------

register({
  term: "API Key",
  shortDef:
    "An API key authenticates SDK requests. Server-side keys have full access; client-side keys are environment-scoped.",
  longDef: `API keys authenticate your application's SDK with the FeatureSignals evaluation API. There are two types:

- **Server keys**: Full access to all flags and environments in a project. Used in backend services.
- **Client keys**: Scoped to a specific environment. Safe to use in frontend/mobile apps.

Keys are SHA-256 hashed in the database. The raw key is shown only once at creation time. You can revoke and rotate keys at any time.`,
  relatedTerms: ["Flag", "Environment", "SDK"],
  category: "api",
});

register({
  term: "Webhook",
  shortDef:
    "A webhook sends HTTP callbacks to your server when flag states change — keeping your systems in sync.",
  longDef: `Webhooks notify your application when flag states change in FeatureSignals. Instead of polling for changes, your server receives HTTP POST requests with the change details. Common webhook events include: flag created, flag updated, flag state changed, and flag archived.

Webhooks support retry with exponential backoff (up to 5 attempts), secret signing for verification, and delivery logging. You can filter webhooks by event type and configure multiple webhooks per project.`,
  relatedTerms: ["Flag", "Audit Log", "Webhook Delivery"],
  category: "api",
});

register({
  term: "Audit Log",
  shortDef:
    "The audit log records every change to flags, segments, and settings — who did what, when, and from where.",
  longDef: `The audit log provides a complete, immutable record of all changes in your FeatureSignals organization. Every flag toggle, rule change, segment update, and configuration modification is recorded with: who made the change, what changed, when it happened, and the IP address of the actor.

Audit logs are essential for compliance (SOC 2, GDPR), debugging ("who turned off the checkout flag?"), and security investigations. Logs are retained for the duration of your plan and can be exported for external analysis.`,
  relatedTerms: ["Flag", "Segment", "Webhook"],
  category: "api",
});

// ---------------------------------------------------------------------------
// Advanced Concepts
// ---------------------------------------------------------------------------

register({
  term: "Toggle Category",
  shortDef:
    "The type of toggle: Release (ship dark), Experiment (A/B test), Ops (operational), or Permission (access control).",
  longDef: `Every flag in FeatureSignals has a category that determines its purpose and lifecycle:

- **Release**: Decouple deploy from release. Short-lived. Clean up after rollout.
- **Experiment**: A/B test variants against metrics. Medium-lived. Remove after experiment concludes.
- **Ops**: Operational control (maintenance mode, kill switches). Can be long-lived.
- **Permission**: Access control by tier/role (premium features, admin tools). Often permanent.

The category affects how the flag appears in the dashboard, whether Janitor flags it for cleanup, and the available evaluation strategies.`,
  relatedTerms: ["Flag", "Release Toggle", "Experiment Toggle", "Ops Toggle", "Permission Toggle"],
  category: "core",
});

register({
  term: "Condition",
  shortDef:
    "A condition matches users based on attributes (e.g., 'country equals US' or 'plan in [pro, enterprise]').",
  longDef: `Conditions are the building blocks of targeting rules and segments. Each condition specifies an attribute name, an operator, and one or more values to match against. Supported operators include: equals, not-equals, contains, starts-with, ends-with, in (array membership), greater-than, less-than, and regex.

Conditions within a rule can be combined with AND logic (all must match) or OR logic (any match). This allows expressive targeting like: "(country = US AND plan = pro) OR email contains @enterprise.com".`,
  relatedTerms: ["Targeting Rule", "Segment"],
  category: "advanced",
});

register({
  term: "Variant",
  shortDef:
    "A variant is a named value in a multi-armed experiment (e.g., 'control', 'treatment-a', 'treatment-b').",
  longDef: `Variants enable multi-armed experiments and A/B tests. Instead of a simple on/off flag, a flag with variants can return multiple different values. Each variant has a key, a value, and a weight that determines what percentage of users see it.

For example, a checkout experiment might have three variants: 'control' (existing flow, 50%), 'variant-a' (new flow, 25%), and 'variant-b' (alternate flow, 25%). The evaluation engine assigns users deterministically based on their user key.`,
  relatedTerms: ["Flag", "Experiment Toggle", "Percentage Rollout"],
  category: "advanced",
});

register({
  term: "SDK",
  shortDef:
    "The FeatureSignals SDK integrates with your application to evaluate flags at runtime.",
  longDef: `FeatureSignals provides official SDKs for Node.js, Python, Go, React, Java, .NET, Ruby, Vue, and more. All SDKs are OpenFeature-compliant and follow the same evaluation semantics.

SDKs maintain a local cache of flag rulesets, synced via PG LISTEN/NOTIFY for sub-millisecond evaluation. They never make a network call on the evaluation hot path — everything is served from memory. SDKs emit evaluation metrics, respect flag prerequisites and mutual exclusion groups, and handle connectivity loss gracefully.`,
  relatedTerms: ["Flag", "API Key", "Evaluation"],
  category: "sdk",
});

register({
  term: "Evaluation",
  shortDef:
    "Evaluation is the process of determining which flag value to serve for a given user at runtime.",
  longDef: `Flag evaluation is the core runtime operation: given a flag key and a user context (attributes), determine which value to return. The evaluation engine follows this sequence:

1. Check if the flag is enabled in the environment
2. Evaluate targeting rules in priority order (first match wins)
3. If no rule matches, apply percentage rollout
4. If below rollout threshold, return the flag value; otherwise return default
5. Record the evaluation reason for analytics

FeatureSignals evaluations complete in under 1ms p99 by caching rulesets in memory and avoiding all database calls on the hot path.`,
  relatedTerms: ["Flag", "SDK", "Targeting Rule", "Percentage Rollout"],
  category: "sdk",
});

register({
  term: "Janitor",
  shortDef:
    "Janitor is FeatureSignals' automated stale flag detection and cleanup system.",
  longDef: `Janitor continuously analyzes your flags to detect stale, rolled-out, and unused toggles. It uses evaluation metrics, flag age, and status to identify flags that are candidates for removal.

Janitor can:
- Flag stale release toggles that have been at 100% rollout for > 30 days
- Detect flags with zero evaluations in the last 90 days
- Generate automated cleanup pull requests (GitHub integration)
- Provide a cleanup dashboard with prioritized recommendations

Janitor helps prevent "toggle debt" — the accumulation of obsolete flags that add complexity and risk to your codebase.`,
  relatedTerms: ["Flag", "Release Toggle", "Rolled Out", "Deprecated"],
  category: "advanced",
});

register({
  term: "Kill Switch",
  shortDef:
    "A kill switch is an ops toggle that can instantly disable a feature in production during an incident.",
  longDef: `A kill switch is a special type of ops toggle designed for emergency use. It allows operators to instantly disable a feature across all users without deploying code. Kill switches are typically pre-configured for critical paths and tested regularly.

Best practices: tag kill switch flags clearly, pre-configure them before you need them, test them in staging, and ensure the on-call team has permission to toggle them. FeatureSignals supports one-click kill switch activation from the dashboard and via API.`,
  relatedTerms: ["Flag", "Ops Toggle"],
  category: "advanced",
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up a glossary entry by term name (case-insensitive).
 * Returns undefined if no entry exists for the given term.
 */
export function getGlossaryEntry(term: string): GlossaryEntry | undefined {
  return glossary.get(term.toLowerCase());
}

/**
 * Get all glossary entries as an array.
 * Useful for rendering a glossary index page or search.
 */
export function getAllGlossaryEntries(): GlossaryEntry[] {
  return Array.from(glossary.values());
}

/**
 * Get entries filtered by category.
 */
export function getGlossaryEntriesByCategory(
  category: GlossaryCategory,
): GlossaryEntry[] {
  return Array.from(glossary.values()).filter(
    (entry) => entry.category === category,
  );
}

/**
 * Search glossary entries by a query string.
 * Searches term name, shortDef, and relatedTerms.
 */
export function searchGlossary(query: string): GlossaryEntry[] {
  const q = query.toLowerCase();
  return Array.from(glossary.values()).filter(
    (entry) =>
      entry.term.toLowerCase().includes(q) ||
      entry.shortDef.toLowerCase().includes(q) ||
      entry.longDef.toLowerCase().includes(q) ||
      entry.relatedTerms.some((t) => t.toLowerCase().includes(q)),
  );
}
