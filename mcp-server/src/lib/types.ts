/**
 * Shared type definitions for MCP tool inputs and outputs.
 *
 * These types mirror the FeatureSignals API DTOs (server/internal/api/dto/)
 * and the unified app's doc types (unified/src/lib/docs.ts), adapted for
 * MCP tool consumption by AI agents.
 */

// ---------------------------------------------------------------------------
// Documentation types
// ---------------------------------------------------------------------------

export interface DocSearchResult {
  title: string;
  snippet: string;
  url: string;
  relevance: number;
  category?: string;
}

export interface DocSection {
  heading: string;
  content: string;
}

export interface DocCodeBlock {
  language: string;
  code: string;
  heading?: string;
}

export interface DocAiMetadata {
  difficulty?: string;
  estimated_minutes?: number;
  tags?: string[];
}

export interface DocNavItem {
  label: string;
  href: string;
}

export interface DocPageResponse {
  title: string;
  description: string;
  slug: string;
  path: string;
  sections: DocSection[];
  code_blocks: DocCodeBlock[];
  prerequisites: string[];
  next_steps: string[];
  ai_metadata: DocAiMetadata;
  api_endpoints?: string[];
  sdks_relevant?: string[];
  prev: DocNavItem | null;
  next: DocNavItem | null;
}

export interface ApiReferenceResponse {
  method: string;
  path: string;
  description: string;
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  response: ApiResponseInfo;
  examples: ApiExample[];
}

export interface ApiParameter {
  name: string;
  in: "path" | "query" | "header" | "body";
  required: boolean;
  type: string;
  description: string;
  default?: string;
}

export interface ApiRequestBody {
  contentType: string;
  schema: Record<string, unknown>;
  example?: Record<string, unknown>;
}

export interface ApiResponseInfo {
  status: number;
  contentType: string;
  schema: Record<string, unknown>;
  description: string;
}

export interface ApiExample {
  title: string;
  request: string;
  response: string;
}

// ---------------------------------------------------------------------------
// Flag types (mirrors server DTOs)
// ---------------------------------------------------------------------------

export type FlagType = "boolean" | "string" | "number" | "json";

export interface FlagInput {
  key: string;
  name: string;
  type?: FlagType;
  default_value?: unknown;
  description?: string;
  tags?: string[];
}

export interface Flag {
  id: string;
  key: string;
  name: string;
  description: string;
  flag_type: string;
  category: string;
  status: string;
  default_value: unknown;
  tags: string[];
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EvalContext {
  key?: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface EvalResult {
  flag_key: string;
  value: unknown;
  reason: string;
  variant_key?: string;
  eval_time_ms?: number;
}

// ---------------------------------------------------------------------------
// Migration types
// ---------------------------------------------------------------------------

export type MigrationProvider =
  | "launchdarkly"
  | "configcat"
  | "flagsmith"
  | "unleash";

export interface MigrationPreviewRequest {
  provider: MigrationProvider;
  api_key: string;
}

export interface ImportedFlagInfo {
  key: string;
  name: string;
  type: string;
  environments: string[];
  rules: number;
}

export interface ImportedEnvInfo {
  name: string;
  key: string;
}

export interface PricingComparison {
  current: number;
  fs: number;
  savings_annual: number;
  savings_percent: number;
}

export interface MigrationPreviewResponse {
  flags: ImportedFlagInfo[];
  environments: ImportedEnvInfo[];
  segments: number;
  estimated_migration_time: string;
  pricing_comparison: PricingComparison;
}

// ---------------------------------------------------------------------------
// Sandbox types
// ---------------------------------------------------------------------------

export interface SandboxResponse {
  sandbox_id: string;
  env_key: string;
  org_id: string;
  project_id: string;
  expires_at: string;
}

export type SdkLanguage =
  | "node"
  | "python"
  | "react"
  | "go"
  | "java"
  | "dotnet"
  | "ruby"
  | "vue";

export interface SandboxCodeResponse {
  language: SdkLanguage;
  install_cmd: string;
  init_cmd: string;
  code_snippet: string;
  env_key: string;
}

export interface ClaimSandboxRequest {
  email: string;
  password: string;
  name?: string;
}

export interface ClaimSandboxResponse {
  claimed: boolean;
  message: string;
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
}

// ---------------------------------------------------------------------------
// Tool result wrapper — all tools return this shape
// ---------------------------------------------------------------------------

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  request_id?: string;
}
