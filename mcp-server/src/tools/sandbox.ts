/**
 * Sandbox Tools
 *
 * MCP tools for creating ephemeral demo environments and generating
 * ready-to-paste integration code for all supported SDK languages.
 *
 * The sandbox workflow:
 * 1. create_sandbox — creates a temporary org with sample flags
 * 2. get_sandbox_code — returns paste-ready code for any language
 * 3. claim_sandbox — converts the ephemeral sandbox to a real account
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../lib/api-client.js";
import type {
  SandboxResponse,
  SandboxCodeResponse,
  SdkLanguage,
  ClaimSandboxResponse,
} from "../lib/types.js";

// ---------------------------------------------------------------------------
// SDK language definitions
// ---------------------------------------------------------------------------

const VALID_SDK_LANGUAGES = [
  "node",
  "python",
  "react",
  "go",
  "java",
  "dotnet",
  "ruby",
  "vue",
] as const;

interface SdkTemplate {
  install_cmd: string;
  init_cmd: string;
  code_snippet: (envKey: string) => string;
  description: string;
}

const SDK_TEMPLATES: Record<SdkLanguage, SdkTemplate> = {
  node: {
    install_cmd: "npm install @featuresignals/node",
    init_cmd: 'export FS_ENV_KEY="<env_key>"',
    code_snippet: (
      envKey: string,
    ) => `import { FeatureSignalsClient } from "@featuresignals/node";

// Initialize the client with your environment key
const client = new FeatureSignalsClient({
  envKey: "${envKey}",
  streaming: true, // Real-time flag updates via SSE
  context: { key: "user-123" },
});

// Wait for the client to be ready
await client.waitForReady();

// Evaluate a boolean flag
const isEnabled = client.boolVariation("new-checkout", { key: "user-123" }, false);
if (isEnabled) {
  console.log("New checkout is enabled!");
}

// Evaluate a string flag
const buttonColor = client.stringVariation("button-color", { key: "user-123" }, "blue");
console.log(\`Button color: \${buttonColor}\`);

// Get all flags
const allFlags = client.allFlags();
console.log("All flags:", allFlags);

// Clean shutdown
await client.close();`,
    description:
      "Node.js/TypeScript SDK with local evaluation, polling, and SSE streaming. OpenFeature provider available.",
  },

  python: {
    install_cmd: "pip install featuresignals",
    init_cmd: 'export FS_ENV_KEY="<env_key>"',
    code_snippet: (
      envKey: string,
    ) => `from featuresignals import FeatureSignalsClient

# Initialize the client
client = FeatureSignalsClient(
    env_key="${envKey}",
    streaming=True,  # Real-time flag updates via SSE
    context={"key": "user-123"},
)

# Wait for the client to be ready
client.wait_for_ready()

# Evaluate a boolean flag
is_enabled = client.bool_variation("new-checkout", {"key": "user-123"}, False)
if is_enabled:
    print("New checkout is enabled!")

# Evaluate a string flag
button_color = client.string_variation("button-color", {"key": "user-123"}, "blue")
print(f"Button color: {button_color}")

# Get all flags
all_flags = client.all_flags()
print(f"All flags: {all_flags}")

# Clean shutdown
client.close()`,
    description:
      "Python SDK with local evaluation, polling, and SSE streaming. OpenFeature provider available.",
  },

  react: {
    install_cmd: "npm install @featuresignals/react",
    init_cmd: 'export NEXT_PUBLIC_FS_ENV_KEY="<env_key>"',
    code_snippet: (
      envKey: string,
    ) => `import { FeatureSignalsProvider, useFlag, useFlags } from "@featuresignals/react";

// Wrap your app with the provider
function App() {
  return (
    <FeatureSignalsProvider
      envKey="${envKey}"
      streaming={true}
      context={{ key: "user-123" }}
      loadingFallback={<div>Loading flags...</div>}
    >
      <HomePage />
    </FeatureSignalsProvider>
  );
}

// Use a single flag
function HomePage() {
  const isEnabled = useFlag("new-checkout", false);

  return (
    <div>
      {isEnabled ? (
        <NewCheckout />
      ) : (
        <OldCheckout />
      )}
    </div>
  );
}

// Use multiple flags at once
function Dashboard() {
  const flags = useFlags();

  return (
    <div>
      <p>New Checkout: {flags["new-checkout"] ? "ON" : "OFF"}</p>
      <p>Button Color: {flags["button-color"] ?? "blue"}</p>
    </div>
  );
}`,
    description:
      "React SDK with hooks (useFlag, useFlags) and provider pattern. OpenFeature React bindings available.",
  },

  go: {
    install_cmd: "go get github.com/featuresignals/go-sdk",
    init_cmd: 'export FS_ENV_KEY="<env_key>"',
    code_snippet: (envKey: string) => `package main

import (
    "fmt"
    "log"

    "github.com/featuresignals/go-sdk"
)

func main() {
    // Initialize the client
    client, err := featuresignals.NewClient(featuresignals.ClientOptions{
        EnvKey:    "${envKey}",
        Streaming: true, // Real-time flag updates via SSE
        Context: featuresignals.EvalContext{
            Key: "user-123",
        },
    })
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    // Wait for the client to be ready
    if err := client.WaitForReady(10 * time.Second); err != nil {
        log.Fatal(err)
    }

    // Evaluate a boolean flag
    isEnabled := client.BoolVariation("new-checkout", featuresignals.EvalContext{
        Key: "user-123",
    }, false)
    if isEnabled {
        fmt.Println("New checkout is enabled!")
    }

    // Evaluate a string flag
    buttonColor := client.StringVariation("button-color", featuresignals.EvalContext{
        Key: "user-123",
    }, "blue")
    fmt.Printf("Button color: %s\\n", buttonColor)

    // Get all flags
    allFlags := client.AllFlags()
    fmt.Printf("All flags: %+v\\n", allFlags)
}`,
    description:
      "Go SDK with local evaluation, polling, and SSE streaming. Native Go context support. OpenFeature provider available.",
  },

  java: {
    install_cmd:
      "# Add to build.gradle:\nimplementation 'com.featuresignals:featuresignals-java:0.1.0'",
    init_cmd: 'export FS_ENV_KEY="<env_key>"',
    code_snippet: (
      envKey: string,
    ) => `import com.featuresignals.FeatureSignalsClient;
import com.featuresignals.EvalContext;
import java.util.Map;

public class Main {
    public static void main(String[] args) throws Exception {
        // Initialize the client
        FeatureSignalsClient client = FeatureSignalsClient.builder()
            .envKey("${envKey}")
            .streaming(true)  // Real-time flag updates via SSE
            .context(EvalContext.builder()
                .key("user-123")
                .build())
            .build();

        // Wait for the client to be ready
        client.waitForReady(10_000);

        // Evaluate a boolean flag
        boolean isEnabled = client.boolVariation("new-checkout",
            EvalContext.builder().key("user-123").build(), false);
        if (isEnabled) {
            System.out.println("New checkout is enabled!");
        }

        // Evaluate a string flag
        String buttonColor = client.stringVariation("button-color",
            EvalContext.builder().key("user-123").build(), "blue");
        System.out.printf("Button color: %s%n", buttonColor);

        // Get all flags
        Map<String, Object> allFlags = client.allFlags();
        System.out.printf("All flags: %s%n", allFlags);

        // Clean shutdown
        client.close();
    }
}`,
    description:
      "Java SDK with builder pattern, local evaluation, polling, and SSE streaming. OpenFeature provider available.",
  },

  dotnet: {
    install_cmd: "dotnet add package FeatureSignals.Client",
    init_cmd: 'export FS_ENV_KEY="<env_key>"',
    code_snippet: (envKey: string) => `using FeatureSignals;

// Initialize the client
var client = new FeatureSignalsClient(new ClientOptions
{
    EnvKey = "${envKey}",
    Streaming = true, // Real-time flag updates via SSE
    Context = new EvalContext
    {
        Key = "user-123"
    }
});

// Wait for the client to be ready
await client.WaitForReadyAsync();

// Evaluate a boolean flag
bool isEnabled = client.BoolVariation("new-checkout",
    new EvalContext { Key = "user-123" }, false);
if (isEnabled)
{
    Console.WriteLine("New checkout is enabled!");
}

// Evaluate a string flag
string buttonColor = client.StringVariation("button-color",
    new EvalContext { Key = "user-123" }, "blue");
Console.WriteLine($"Button color: {buttonColor}");

// Get all flags
var allFlags = client.AllFlags();
Console.WriteLine($"All flags: {string.Join(", ", allFlags)}");

// Clean shutdown
client.Close();`,
    description:
      ".NET SDK with async/await, local evaluation, polling, and SSE streaming. OpenFeature provider available.",
  },

  ruby: {
    install_cmd: "gem install featuresignals",
    init_cmd: 'export FS_ENV_KEY="<env_key>"',
    code_snippet: (envKey: string) => `require 'featuresignals'

# Initialize the client
client = FeatureSignals::Client.new(
  env_key: "${envKey}",
  streaming: true,  # Real-time flag updates via SSE
  context: { key: "user-123" }
)

# Wait for the client to be ready
client.wait_for_ready

# Evaluate a boolean flag
if client.bool_variation("new-checkout", { key: "user-123" }, false)
  puts "New checkout is enabled!"
end

# Evaluate a string flag
button_color = client.string_variation("button-color", { key: "user-123" }, "blue")
puts "Button color: #{button_color}"

# Get all flags
all_flags = client.all_flags
puts "All flags: #{all_flags}"

# Clean shutdown
client.close`,
    description:
      "Ruby SDK with idiomatic Ruby patterns, local evaluation, polling, and SSE streaming. OpenFeature provider available.",
  },

  vue: {
    install_cmd: "npm install @featuresignals/vue",
    init_cmd: 'export VITE_FS_ENV_KEY="<env_key>"',
    code_snippet: (envKey: string) => `// main.ts — Plugin registration
import { createApp } from 'vue';
import { FeatureSignalsPlugin } from '@featuresignals/vue';
import App from './App.vue';

const app = createApp(App);

app.use(FeatureSignalsPlugin, {
  envKey: "${envKey}",
  streaming: true,
  context: { key: "user-123" },
});

app.mount('#app');

// In any component — use the composable
<script setup lang="ts">
import { useFlag, useFlags } from '@featuresignals/vue';

// Single flag (reactive)
const isEnabled = useFlag("new-checkout", false);

// All flags (reactive)
const flags = useFlags();
</script>

<template>
  <div>
    <NewCheckout v-if="isEnabled" />
    <OldCheckout v-else />

    <p>Button color: {{ flags['button-color'] ?? 'blue' }}</p>
  </div>
</template>`,
    description:
      "Vue 3 SDK with composables (useFlag, useFlags) and plugin registration. OpenFeature provider available.",
  },
};

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export interface SandboxToolOptions {
  client: ApiClient;
}

/**
 * Register all sandbox management tools on the MCP server.
 */
export function registerSandboxTools(
  server: McpServer,
  options: SandboxToolOptions,
): void {
  const { client } = options;

  // -- create_sandbox -----------------------------------------------

  server.tool(
    "create_sandbox",
    `Create an ephemeral demo sandbox with pre-seeded feature flags.

Creates a temporary organization with:
- Sample feature flags (new-checkout, dark-mode, button-color, premium-feature)
- Development and Production environments
- An evaluation API key ready for SDK integration
- 24-hour expiry (configurable)

No authentication required — this is a public endpoint designed for
trial and evaluation.

Use this tool when an agent needs to give a user a hands-on demo of
FeatureSignals without requiring signup.`,
    {},
    async () => {
      const result = await client.post<SandboxResponse>("/api/sandbox");

      if (!result.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: result.error,
                  status: result.status,
                  request_id: result.requestId,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      const sandbox = result.data;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                sandbox: {
                  sandbox_id: sandbox.sandbox_id,
                  env_key: sandbox.env_key,
                  org_id: sandbox.org_id,
                  project_id: sandbox.project_id,
                  expires_at: sandbox.expires_at,
                },
                next_steps: [
                  "Use get_sandbox_code to get ready-to-paste integration code for your language",
                  "Use claim_sandbox to convert this sandbox to a permanent account",
                ],
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // -- get_sandbox_code ---------------------------------------------

  server.tool(
    "get_sandbox_code",
    `Get ready-to-paste integration code for any SDK language.

Returns:
- Package install command
- Environment variable setup
- Complete initialization and evaluation code snippet
- Language-specific description

Supported languages: node, python, react, go, java, dotnet, ruby, vue

Use this tool to generate integration code after creating a sandbox
or when an agent needs to show a user how to integrate FeatureSignals.`,
    {
      language: z
        .enum(VALID_SDK_LANGUAGES as unknown as [string, ...string[]])
        .describe("SDK language to generate code for"),
      sandbox_id: z
        .string()
        .min(1)
        .describe(
          "Sandbox ID from create_sandbox — used to retrieve the evaluation API key",
        ),
    },
    async ({ language, sandbox_id }) => {
      // First, fetch the sandbox to get the env key
      const sandboxResult = await client.get<SandboxResponse>(
        `/api/sandbox/${encodeURIComponent(sandbox_id)}`,
      );

      if (!sandboxResult.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    sandboxResult.status === 404
                      ? `Sandbox not found: "${sandbox_id}". It may have expired or the ID is incorrect.`
                      : sandboxResult.error,
                  status: sandboxResult.status,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      const sandbox = sandboxResult.data;
      const lang = language as SdkLanguage;
      const template = SDK_TEMPLATES[lang];

      const code: SandboxCodeResponse = {
        language: lang,
        install_cmd: template.install_cmd,
        init_cmd: template.init_cmd.replace("<env_key>", sandbox.env_key),
        code_snippet: template.code_snippet(sandbox.env_key),
        env_key: sandbox.env_key,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                language,
                description: template.description,
                install_cmd: code.install_cmd,
                init_cmd: code.init_cmd,
                code_snippet: code.code_snippet,
                env_key: code.env_key,
                sandbox_id: sandbox.sandbox_id,
                expires_at: sandbox.expires_at,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // -- claim_sandbox ------------------------------------------------

  server.tool(
    "claim_sandbox",
    `Convert an ephemeral sandbox to a permanent account.

Takes an email and password and converts the temporary sandbox
organization into a real, persistent account. The user can then
log in and continue managing their feature flags.

Returns authentication tokens if successful, allowing the user to
be logged in immediately.

Use this tool when a user is ready to commit to FeatureSignals after
trying the sandbox demo.`,
    {
      sandbox_id: z.string().min(1).describe("Sandbox ID from create_sandbox"),
      email: z
        .string()
        .email()
        .max(255)
        .describe("User's email address for the permanent account"),
      password: z
        .string()
        .min(8)
        .max(128)
        .describe("User's chosen password (min 8 characters)"),
      name: z
        .string()
        .max(255)
        .optional()
        .describe("User's display name (optional)"),
    },
    async ({ sandbox_id, email, password, name }) => {
      const payload = {
        email,
        password,
        name: name ?? email.split("@")[0],
      };

      const result = await client.post<ClaimSandboxResponse>(
        `/api/sandbox/${encodeURIComponent(sandbox_id)}/claim`,
        payload,
      );

      if (!result.ok) {
        const statusText =
          result.status === 404
            ? "Sandbox not found — it may have expired or already been claimed"
            : result.status === 409
              ? "This sandbox has already been claimed"
              : result.status === 422
                ? "Validation failed — check email and password requirements"
                : result.error;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: statusText,
                  status: result.status,
                  request_id: result.requestId,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                claimed: result.data.claimed,
                message: result.data.message,
                user: result.data.user ?? null,
                organization: result.data.organization ?? null,
                next_steps: [
                  "Log in at https://app.featuresignals.com/login",
                  "Install an SDK using get_sandbox_code",
                  "Create additional flags using create_flag",
                ],
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
