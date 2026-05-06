"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import {
  SparklesIcon,
  CheckIcon,
  FolderOpenIcon,
  LayersIcon,
  ArrowRightIcon,
  KeyIcon,
  CopyIcon,
  ClipboardIcon,
  FlagIcon,
} from "@/components/ui/icons/nav-icons";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { DOCS_LINKS } from "@/components/docs-link";
import { API_BASE_URL } from "@/lib/external-urls";
import type { Project, Environment } from "@/lib/types";

const STEPS = [
  { key: "project_setup", label: "Project", icon: FolderOpenIcon },
  { key: "env_setup", label: "Environment", icon: LayersIcon },
  { key: "first_flag_created", label: "Create Flag", icon: FlagIcon },
  { key: "first_sdk_connected", label: "Connect SDK", icon: KeyIcon },
  { key: "first_evaluation", label: "Go Live", icon: SparklesIcon },
];

const SDK_TABS = [
  { id: "node", label: "Node.js" },
  { id: "go", label: "Go" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "react", label: "React" },
];

const SDK_INSTALL: Record<string, string> = {
  go: "go get github.com/featuresignals/fs-sdk-go",
  node: "npm install @featuresignals/sdk-node",
  python: "pip install featuresignals-sdk",
  java: `// Maven: add to pom.xml
<dependency>
  <groupId>com.featuresignals</groupId>
  <artifactId>fs-sdk-java</artifactId>
  <version>1.0.0</version>
</dependency>`,
  react: "npm install @featuresignals/sdk-react",
};

function sdkSnippet(sdk: string, apiKey: string, baseUrl: string): string {
  const key = apiKey || "YOUR_SERVER_SDK_KEY";
  const snippets: Record<string, string> = {
    go: `import "github.com/featuresignals/fs-sdk-go"

client := featuresignals.NewClient(featuresignals.Config{
    SDKKey:   "${key}",
    ServerURL: "${baseUrl}",
})
enabled := client.BooleanFlag("my-feature", false)`,
    node: `import { FeatureSignals } from "@featuresignals/sdk-node";

const fs = new FeatureSignals({
  sdkKey: "${key}",
  serverUrl: "${baseUrl}",
});

const enabled = await fs.booleanFlag("my-feature", false);`,
    python: `from featuresignals import FeatureSignals

fs = FeatureSignals(
    sdk_key="${key}",
    server_url="${baseUrl}",
)

enabled = fs.boolean_flag("my-feature", False)`,
    java: `import com.featuresignals.sdk.FeatureSignals;

FeatureSignals fs = FeatureSignals.builder()
    .sdkKey("${key}")
    .serverUrl("${baseUrl}")
    .build();

boolean enabled = fs.booleanFlag("my-feature", false);`,
    react: `import { useFlag } from "@featuresignals/sdk-react";

function MyComponent() {
  const enabled = useFlag("my-feature", false);
  if (enabled) return <NewUI />;
  return <OldUI />;
}

// Wrap your app with FeatureSignalsProvider
<FeatureSignalsProvider sdkKey="${key}" serverUrl="${baseUrl}">
  <App />
</FeatureSignalsProvider>`,
  };
  return snippets[sdk] || snippets.node;
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAppStore((s) => s.token);
  const refreshToken = useAppStore((s) => s.refreshToken);
  const setAuth = useAppStore((s) => s.setAuth);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const setCurrentEnv = useAppStore((s) => s.setCurrentEnv);
  const userName = useAppStore((s) => s.user?.name);

  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const [projects, setProjects] = useState<Project[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(currentEnvId);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectFieldError, setProjectFieldError] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const [flagForm, setFlagForm] = useState({ key: "", name: "" });
  const [flagFieldErrors, setFlagFieldErrors] = useState<Record<string, string>>({});
  const [creatingFlag, setCreatingFlag] = useState(false);

  const [selectedSdk, setSelectedSdk] = useState("node");
  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Handle payment callback
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast("Payment successful! Your plan has been upgraded to Pro.", "success");
      if (refreshToken) {
        api.refresh(refreshToken).then((data) => {
          if (data?.access_token) {
            setAuth(data.access_token, data.refresh_token, data.user ?? useAppStore.getState().user, data.organization ?? useAppStore.getState().organization, data.expires_at, data.onboarding_completed);
          }
        }).catch(() => {});
      }
    } else if (status === "failed") {
      toast("Payment failed. Please try again.", "error");
    } else if (status === "canceled") {
      toast("Checkout canceled. No charges were made.");
    }
  }, [searchParams, refreshToken, setAuth]);

  const loadProjects = useCallback(async () => {
    if (!token) return;
    const t = token;
    try {
      const list = await api.listProjects(token);
      setProjects(list);
      if (list.length > 0 && !selectedProjectId) setSelectedProjectId(list[0].id);
    } catch { /* empty */ }
  }, [token, selectedProjectId]);

  const loadEnvironments = useCallback(async () => {
    if (!token || !selectedProjectId) return;
    try {
      const list = await api.listEnvironments(token, selectedProjectId);
      setEnvironments(list);
      if (list.length > 0 && !selectedEnvId) setSelectedEnvId(list[0].id);
    } catch { /* empty */ }
  }, [token, selectedProjectId, selectedEnvId]);

  useEffect(() => {
    if (!token) return;
    const t = token;
    async function init() {
      try {
        const [data] = await Promise.all([api.getOnboarding(t), loadProjects()]);
        if (data) {
          const steps: Record<string, boolean> = {
            project_setup: projectId != null,
            env_setup: currentEnvId != null,
            first_flag_created: data.first_flag_created,
            first_sdk_connected: data.first_sdk_connected,
            first_evaluation: data.first_evaluation,
          };
          setCompleted(steps);
          const firstIncomplete = STEPS.findIndex((s) => !steps[s.key]);
          setCurrentStep(firstIncomplete === -1 ? STEPS.length - 1 : firstIncomplete);
          if (!data.plan_selected) {
            api.updateOnboarding(t, { plan_selected: true }).catch(() => {});
          }
        }
      } catch { /* continue */ }
      setLoading(false);
    }
    init();
  }, [token, projectId, currentEnvId, loadProjects]);

  useEffect(() => { loadEnvironments(); }, [loadEnvironments]);

  useEffect(() => {
    if (!token || !currentEnvId) return;
    api.listAPIKeys(token, currentEnvId).then((keys) => {
      if (keys && keys.length > 0) {
        const sk = keys.find((k) => k.type === "server") ?? keys[0];
        if (sk?.key_prefix) setApiKey(sk.key_prefix + "...");
      }
    }).catch(() => {});
  }, [token, currentEnvId]);

  function advanceToNext(updates: Record<string, boolean>) {
    const merged = { ...completed, ...updates };
    setCompleted(merged);
    const nextIncomplete = STEPS.findIndex((s) => !merged[s.key]);
    setCurrentStep(nextIncomplete === -1 ? STEPS.length - 1 : nextIncomplete);
  }

  async function handleCreateProject() {
    if (!token || !newProjectName.trim()) { setProjectFieldError("Project name is required"); return; }
    setProjectFieldError("");
    setCreatingProject(true);
    try {
      const project = await api.createProject(token, { name: newProjectName.trim() });
      setProjects((prev) => [...prev, project]);
      setSelectedProjectId(project.id);
      setNewProjectName("");
      toast("Project created!", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to create project", "error");
    } finally {
      setCreatingProject(false);
    }
  }

  function handleProjectConfirm() {
    if (!selectedProjectId) { toast("Please select a project.", "error"); return; }
    setCurrentProject(selectedProjectId);
    advanceToNext({ project_setup: true });
  }

  function handleEnvConfirm() {
    if (!selectedEnvId) { toast("Please select an environment.", "error"); return; }
    setCurrentEnv(selectedEnvId);
    advanceToNext({ env_setup: true });
  }

  async function handleCreateFlag(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) return;
    const errors: Record<string, string> = {};
    if (!flagForm.key.trim()) errors.key = "Flag key is required";
    if (!flagForm.name.trim()) errors.name = "Flag name is required";
    if (Object.keys(errors).length > 0) { setFlagFieldErrors(errors); return; }
    setFlagFieldErrors({});
    setCreatingFlag(true);
    try {
      await api.createFlag(token, projectId, { key: flagForm.key, name: flagForm.name, flag_type: "boolean" });
      toast("Flag created!", "success");
      setFlagForm({ key: "", name: "" });
      await advanceToNext({ first_flag_created: true });
      if (token) api.updateOnboarding(token!, { first_flag_created: true }).catch(() => {});
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to create flag", "error");
    } finally {
      setCreatingFlag(false);
    }
  }

  async function handleSdkComplete() {
    advanceToNext({ first_sdk_connected: true });
    if (token) api.updateOnboarding(token!, { first_sdk_connected: true }).catch(() => {});
  }

  async function handleFinish() {
    advanceToNext({ first_evaluation: true });
    sessionStorage.setItem("fs-tour-eligible", "true");
    if (token) api.updateOnboarding(token!, { first_evaluation: true, completed: true }).catch(() => {});
    router.push(projectId ? `/projects/${projectId}/flags` : "/projects");
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--borderColor-accent-muted)] border-t-[var(--fgColor-accent)]" />
      </div>
    );
  }

  const greeting = userName ? `, ${userName.split(" ")[0]}` : "";
  const snippet = sdkSnippet(selectedSdk, apiKey, API_BASE_URL);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <div className="text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--bgColor-accent-muted)] px-4 py-1.5 text-xs font-medium text-[var(--fgColor-accent)] ring-1 ring-accent/10">
          <SparklesIcon className="h-3.5 w-3.5" />AI-Powered Feature Management
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--fgColor-default)]">
          Welcome{greeting} to <span className="text-[var(--fgColor-accent)]">FeatureSignals</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--fgColor-muted)]">
          Your workspace is ready. Let&apos;s get your first flag live in under 5 minutes.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-0">
        {STEPS.map((step, idx) => {
          const done = completed[step.key];
          const active = currentStep === idx;
          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setCurrentStep(idx)}
                  className={cn(
                    "flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-all",
                    done ? "bg-emerald-500 text-white shadow-sm"
                      : active ? "bg-[var(--bgColor-accent-emphasis)] text-white shadow-md ring-4 ring-accent/10"
                      : "bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)]",
                  )}
                >
                  {done ? <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5" /> : idx + 1}
                </button>
                <span className={cn("mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-medium whitespace-nowrap", active ? "text-[var(--fgColor-accent)]" : done ? "text-emerald-700" : "text-[var(--fgColor-subtle)]")}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && <div className={cn("mx-1 sm:mx-2 h-0.5 w-6 sm:w-10 md:w-16", done ? "bg-emerald-400" : "bg-[var(--bgColor-muted)]")} />}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="p-4 sm:p-6 md:p-8 shadow-sm">
        {/* Step 0: Project Setup */}
        {currentStep === 0 && (
          <div>
            <h2 className="text-xl font-semibold text-[var(--fgColor-default)]">Set Up Your Project</h2>
            <p className="mt-1 text-sm text-[var(--fgColor-muted)]">A project groups your feature flags and environments together.</p>
            {projects.length > 0 && (
              <div className="mt-6 space-y-2">
                <Label>Select an existing project</Label>
                <div className="grid gap-2">
                  {projects.map((p) => (
                    <button key={p.id} onClick={() => setSelectedProjectId(p.id)}
                      className={cn("flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all", selectedProjectId === p.id ? "border-[var(--fgColor-accent)] bg-[var(--bgColor-accent-muted)] ring-2 ring-[var(--borderColor-accent-muted)]" : "border-[var(--borderColor-default)] hover:border-[var(--borderColor-emphasis)] hover:bg-[var(--bgColor-muted)]")}>
                      <FolderOpenIcon className={cn("h-5 w-5", selectedProjectId === p.id ? "text-[var(--fgColor-accent)]" : "text-[var(--fgColor-subtle)]")} />
                      <div><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-[var(--fgColor-subtle)]">{p.slug}</p></div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-[var(--fgColor-muted)] mb-2">Or create a new project</p>
              <form noValidate onSubmit={(e) => { e.preventDefault(); handleCreateProject(); }}>
                <div className="flex gap-2">
                  <Input value={newProjectName} onChange={(e) => { setNewProjectName(e.target.value); setProjectFieldError(""); }} placeholder="My App" className="flex-1" />
                  <Button variant="secondary" type="submit" disabled={creatingProject || !newProjectName.trim()}>{creatingProject ? "Creating..." : "Create"}</Button>
                </div>
                {projectFieldError && <p className="mt-1 text-xs text-red-600">{projectFieldError}</p>}
              </form>
            </div>
            <div className="mt-6"><Button onClick={handleProjectConfirm} disabled={!selectedProjectId}>Continue with this project</Button></div>
          </div>
        )}

        {/* Step 1: Environment Setup */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-[var(--fgColor-default)]">Choose Your Environment</h2>
            <p className="mt-1 text-sm text-[var(--fgColor-muted)]">Select the environment you want to start with.</p>
            {environments.length > 0 ? (
              <div className="mt-6 grid gap-2">
                {environments.map((env) => (
                  <button key={env.id} onClick={() => setSelectedEnvId(env.id)}
                    className={cn("flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all", selectedEnvId === env.id ? "border-[var(--fgColor-accent)] bg-[var(--bgColor-accent-muted)] ring-2 ring-[var(--borderColor-accent-muted)]" : "border-[var(--borderColor-default)] hover:border-[var(--borderColor-emphasis)] hover:bg-[var(--bgColor-muted)]")}>
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: env.color || "#64748b" }} />
                    <div><p className="text-sm font-medium">{env.name}</p><p className="text-xs text-[var(--fgColor-subtle)]">{env.slug || env.name.toLowerCase()}</p></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-[var(--borderColor-emphasis)] bg-[var(--bgColor-muted)] p-6 text-center">
                <LayersIcon className="mx-auto h-8 w-8 text-[var(--fgColor-subtle)]" />
                <p className="mt-2 text-sm text-[var(--fgColor-muted)]">No environments found. They are created automatically with your project.</p>
              </div>
            )}
            <div className="mt-6"><Button onClick={handleEnvConfirm} disabled={!selectedEnvId}>Continue with this environment</Button></div>
          </div>
        )}

        {/* Step 2: Create Flag */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-[var(--fgColor-default)]">Create Your First Flag</h2>
            <p className="mt-1 text-sm text-[var(--fgColor-muted)]">Feature flags let you toggle functionality without redeploying.</p>
            <form noValidate onSubmit={handleCreateFlag} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Flag Key</Label>
                <Input value={flagForm.key} onChange={(e) => { setFlagForm({ ...flagForm, key: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-") }); setFlagFieldErrors({}); }} placeholder="new-checkout-flow" />
                {flagFieldErrors.key && <p className="text-xs text-red-600">{flagFieldErrors.key}</p>}
                <p className="text-xs text-[var(--fgColor-subtle)]">Lowercase letters, numbers, dashes, and underscores only.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Display Name</Label>
                <Input value={flagForm.name} onChange={(e) => { setFlagForm({ ...flagForm, name: e.target.value }); setFlagFieldErrors({}); }} placeholder="New Checkout Flow" />
                {flagFieldErrors.name && <p className="text-xs text-red-600">{flagFieldErrors.name}</p>}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" disabled={creatingFlag}>{creatingFlag ? "Creating..." : "Create Flag"}</Button>
                <Button type="button" variant="secondary" onClick={() => advanceToNext({ first_flag_created: true })}>Skip this step</Button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Install SDK */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-[var(--fgColor-default)]">Connect Your App</h2>
            <p className="mt-1 text-sm text-[var(--fgColor-muted)]">Install the SDK in your language and start evaluating flags.</p>
            {apiKey && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--fgColor-accent)]/10 bg-[var(--bgColor-accent-muted)] px-3 py-2">
                <KeyIcon className="h-4 w-4 shrink-0 text-[var(--fgColor-accent)]" />
                <span className="text-xs font-medium text-[var(--fgColor-accent)]">Your API key is pre-filled in the snippets below</span>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {SDK_TABS.map((tab) => (
                <button key={tab.id} onClick={() => setSelectedSdk(tab.id)}
                  className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", selectedSdk === tab.id ? "bg-[var(--bgColor-accent-emphasis)] text-white" : "bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)]")}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--fgColor-muted)]">Installation</span>
                  <button onClick={() => copyText(SDK_INSTALL[selectedSdk] || "", "install")} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--fgColor-accent)]">
                    {copied === "install" ? <><ClipboardIcon className="h-3 w-3" /> Copied!</> : <><CopyIcon className="h-3 w-3" /> Copy</>}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 sm:p-4 text-xs sm:text-sm text-slate-100"><code>{SDK_INSTALL[selectedSdk]}</code></pre>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--fgColor-muted)]">Quick Start</span>
                  <button onClick={() => copyText(snippet, "snippet")} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--fgColor-accent)]">
                    {copied === "snippet" ? <><ClipboardIcon className="h-3 w-3" /> Copied!</> : <><CopyIcon className="h-3 w-3" /> Copy</>}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 sm:p-4 text-xs sm:text-sm text-slate-100"><code>{snippet}</code></pre>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button onClick={handleSdkComplete}>I&apos;ve connected the SDK</Button>
              <Button variant="secondary" asChild><a href={DOCS_LINKS.quickstart} target="_blank" rel="noopener noreferrer">View full docs</a></Button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 4 && (
          <div className="text-center py-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent/10 to-purple-100">
              <SparklesIcon className="h-10 w-10 text-[var(--fgColor-accent)]" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-[var(--fgColor-default)]">You&apos;re All Set!</h2>
            <p className="mt-2 text-sm text-[var(--fgColor-muted)]">Your workspace is ready. Start managing feature flags and ship confidently.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button variant="secondary" asChild><Link href={projectId ? `/projects/${projectId}/flags` : "/flags"}>View Flags</Link></Button>
              <Button variant="secondary" asChild><Link href="/settings/billing">Plans & Billing</Link></Button>
            </div>
            <Button onClick={handleFinish} className="mt-6" size="lg">Go to Dashboard</Button>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-center gap-6">
        <button onClick={() => router.push(projectId ? `/projects/${projectId}/flags` : "/projects")} className="text-sm font-medium text-[var(--fgColor-subtle)] transition-colors hover:text-[var(--fgColor-muted)]">
          Skip onboarding
        </button>
        <Link href="/settings/billing" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--fgColor-accent)] transition-colors">
          View plans & pricing <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--borderColor-accent-muted)] border-t-[var(--fgColor-accent)]" /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}
