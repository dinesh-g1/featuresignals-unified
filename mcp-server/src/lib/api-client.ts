/**
 * FeatureSignals API Client
 *
 * A typed HTTP client for the FeatureSignals management API.
 * Handles authentication, error parsing, and request/response typing.
 *
 * This client is designed for MCP tool use — it never throws on HTTP errors,
 * returning structured error results that tools can surface to agents.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ApiClientConfig {
  /** Base URL of the FeatureSignals API (default: http://localhost:8080) */
  baseUrl: string;
  /** API key for authentication (X-API-Key header) */
  apiKey?: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeoutMs: number;
}

const DEFAULT_CONFIG: ApiClientConfig = {
  baseUrl: "http://localhost:8080",
  timeoutMs: 10_000,
};

// ---------------------------------------------------------------------------
// Result types — never throw on HTTP errors
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  status: number;
}

export interface ApiError {
  ok: false;
  error: string;
  status: number;
  requestId?: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// Structured error shape from FeatureSignals API
// ---------------------------------------------------------------------------

interface FsErrorBody {
  error?: string;
  request_id?: string;
}

// ---------------------------------------------------------------------------
// HTTP request types
// ---------------------------------------------------------------------------

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method: HttpMethod;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Client implementation
// ---------------------------------------------------------------------------

export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Execute a typed HTTP request. Never throws — returns ApiResult. */
  async request<T>(options: RequestOptions): Promise<ApiResult<T>> {
    const url = this.buildUrl(options.path, options.query);
    const headers = this.buildHeaders(options.headers);

    let body: string | undefined;
    if (options.body !== undefined) {
      body = JSON.stringify(options.body);
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method,
        headers,
        body,
        signal: controller.signal,
      });

      // 204 No Content — success with no body
      if (response.status === 204) {
        return { ok: true, data: undefined as T, status: 204 };
      }

      const responseBody = await response.text().catch(() => "");

      if (response.ok) {
        const data = responseBody
          ? (JSON.parse(responseBody) as T)
          : (undefined as T);
        return { ok: true, data, status: response.status };
      }

      // Parse structured error from FeatureSignals API
      let errorMessage = `HTTP ${response.status}`;
      let requestId: string | undefined;

      if (responseBody) {
        try {
          const errBody = JSON.parse(responseBody) as FsErrorBody;
          if (errBody.error) {
            errorMessage = errBody.error;
          }
          if (errBody.request_id) {
            requestId = errBody.request_id;
          }
        } catch {
          // Not JSON — use truncated body as error
          errorMessage = responseBody.slice(0, 500);
        }
      }

      return {
        ok: false,
        error: errorMessage,
        status: response.status,
        requestId,
      };
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return {
          ok: false,
          error: `Request timed out after ${this.config.timeoutMs}ms`,
          status: 0,
        };
      }
      const message =
        err instanceof Error ? err.message : "Unknown network error";
      return { ok: false, error: message, status: 0 };
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Convenience: GET request */
  async get<T>(
    path: string,
    query?: Record<string, string>,
  ): Promise<ApiResult<T>> {
    return this.request<T>({ method: "GET", path, query });
  }

  /** Convenience: POST request */
  async post<T>(
    path: string,
    body?: unknown,
  ): Promise<ApiResult<T>> {
    return this.request<T>({ method: "POST", path, body });
  }

  /** Convenience: PUT request */
  async put<T>(
    path: string,
    body?: unknown,
  ): Promise<ApiResult<T>> {
    return this.request<T>({ method: "PUT", path, body });
  }

  /** Convenience: PATCH request */
  async patch<T>(
    path: string,
    body?: unknown,
  ): Promise<ApiResult<T>> {
    return this.request<T>({ method: "PATCH", path, body });
  }

  /** Convenience: DELETE request */
  async delete<T>(path: string): Promise<ApiResult<T>> {
    return this.request<T>({ method: "DELETE", path });
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private buildUrl(path: string, query?: Record<string, string>): string {
    const base = this.config.baseUrl.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${base}${cleanPath}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (this.config.apiKey) {
      headers["X-API-Key"] = this.config.apiKey;
    }

    if (extra) {
      Object.assign(headers, extra);
    }

    return headers;
  }
}

// ---------------------------------------------------------------------------
// Factory — creates a client from environment variables
// ---------------------------------------------------------------------------

export function createApiClient(overrides?: Partial<ApiClientConfig>): ApiClient {
  const baseUrl =
    overrides?.baseUrl ??
    process.env.FS_API_URL ??
    "http://localhost:8080";

  const apiKey = overrides?.apiKey ?? process.env.FS_API_KEY;

  const timeoutMs =
    overrides?.timeoutMs ??
    (process.env.FS_API_TIMEOUT_MS
      ? parseInt(process.env.FS_API_TIMEOUT_MS, 10)
      : undefined) ??
    10_000;

  return new ApiClient({ baseUrl, apiKey, timeoutMs });
}
