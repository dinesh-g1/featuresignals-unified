"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { Button, Card, Badge, Input, Label, Select, Tabs, TabsList, TabsTrigger, TabsContent, EmptyState, LoadingSpinner } from "@/components/ui";
import {
  FlagIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  LoaderIcon,
  ToggleLeftIcon,
  CheckIcon,
} from "@/components/ui/icons/nav-icons";
import { toast } from "@/components/toast";
import { cn, timeAgo, formatDate } from "@/lib/utils";
import type { Flag, FlagState, Environment } from "@/lib/types";

export default function FlagDetailPage() {
  const params = useParams();
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const flagKey = params?.flagKey as string;

  const [flag, setFlag] = useState<Flag | null>(null);
  const [state, setState] = useState<FlagState | null>(null);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load flag and environments
  const load = useCallback(async () => {
    if (!token || !projectId || !flagKey) return;
    setLoading(true);
    setError("");
    try {
      const [f, e] = await Promise.all([
        api.getFlag(token, projectId, flagKey),
        api.listEnvironments(token, projectId),
      ]);
      setFlag(f);
      setEnvs(e ?? []);
      setEditForm({ name: f.name, description: f.description || "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load flag");
    } finally {
      setLoading(false);
    }
  }, [token, projectId, flagKey]);

  useEffect(() => { load(); }, [load]);

  // Load flag state for selected env
  useEffect(() => {
    const envId = selectedEnv || currentEnvId;
    if (!token || !projectId || !flagKey || !envId) return;
    api.getFlagState(token, projectId, flagKey, envId)
      .then(setState)
      .catch(() => setState(null));
  }, [token, projectId, flagKey, selectedEnv, currentEnvId]);

  // Set initial selected env
  useEffect(() => {
    if (currentEnvId && !selectedEnv) setSelectedEnv(currentEnvId);
  }, [currentEnvId, selectedEnv]);

  async function handleToggle() {
    const envId = selectedEnv || currentEnvId;
    if (!token || !projectId || !flagKey || !envId) return;
    setToggling(true);
    try {
      const updated = await api.updateFlagState(token, projectId, flagKey, envId, {
        enabled: !state?.enabled,
      });
      setState(updated);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Toggle failed", "error");
    } finally {
      setToggling(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId || !flagKey) return;
    setSaving(true);
    try {
      const updated = await api.updateFlag(token, projectId, flagKey, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
      });
      setFlag(updated);
      setEditing(false);
      toast("Flag updated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update flag", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token || !projectId) return;
    setDeleting(true);
    try {
      await api.deleteFlag(token, projectId, flagKey);
      toast("Flag deleted", "success");
      router.push(`/projects/${projectId}/flags`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete flag", "error");
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-16"><LoadingSpinner size="lg" /></div>;
  }

  if (error || !flag) {
    return (
      <div className="p-6">
        <EmptyState icon={FlagIcon} title="Flag not found" description={error || "The requested feature flag does not exist."} />
      </div>
    );
  }

  const envOptions = envs.map((e) => ({ value: e.id, label: e.name }));
  const activeEnvId = selectedEnv || currentEnvId;
  const isEnabled = state?.enabled ?? false;
  const rollout = state?.percentage_rollout ?? 0;

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/projects/${projectId}/flags`)}>
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[var(--fgColor-default)]">{flag.name}</h1>
          <p className="text-sm text-[var(--fgColor-muted)] font-mono">{flag.key}</p>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <PencilIcon className="mr-1.5 h-4 w-4" />Edit
              </Button>
              <Button variant="danger-ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                <TrashIcon className="mr-1.5 h-4 w-4" />Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <Card className="p-4">
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="edit-desc">Description</Label>
              <Input id="edit-desc" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setEditing(false); setEditForm({ name: flag.name, description: flag.description || "" }); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Flag metadata */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-[var(--fgColor-muted)]">Type</p>
          <Badge variant="default" className="mt-1">{flag.flag_type}</Badge>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--fgColor-muted)]">Category</p>
          <Badge variant="primary" className="mt-1">{flag.category}</Badge>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--fgColor-muted)]">Created</p>
          <p className="mt-1 text-sm font-medium">{formatDate(flag.created_at)}</p>
        </Card>
      </div>

      {flag.description && (
        <Card className="p-4">
          <p className="text-xs text-[var(--fgColor-muted)] mb-1">Description</p>
          <p className="text-sm text-[var(--fgColor-default)]">{flag.description}</p>
        </Card>
      )}

      {/* Environment selector + Toggle */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--fgColor-default)]">Flag State</p>
              <p className="text-xs text-[var(--fgColor-muted)]">Environment-specific configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={activeEnvId ?? ""}
              onValueChange={setSelectedEnv}
              options={envOptions}
              placeholder="Select environment"
              className="min-w-[160px]"
              size="sm"
            />
            <Button
              onClick={handleToggle}
              disabled={toggling || !activeEnvId}
              variant={isEnabled ? "primary" : "secondary"}
            >
              {toggling ? (
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ToggleLeftIcon className="mr-2 h-4 w-4" />
              )}
              {isEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </div>

        {state && (
          <div className="mt-4 pt-4 border-t border-[var(--borderColor-default)]">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <div>
                <p className="text-xs text-[var(--fgColor-muted)]">Rollout</p>
                <p className="text-sm font-semibold">{rollout}%</p>
                <div className="mt-1 h-2 w-full rounded-full bg-[var(--bgColor-muted)]">
                  <div className="h-2 rounded-full bg-[var(--bgColor-accent-emphasis)]" style={{ width: `${rollout}%` }} />
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--fgColor-muted)]">Targeting Rules</p>
                <p className="text-sm font-semibold">{state.rules?.length ?? 0} rules</p>
              </div>
              <div>
                <p className="text-xs text-[var(--fgColor-muted)]">Last Updated</p>
                <p className="text-sm">{state.updated_at ? timeAgo(state.updated_at) : "—"}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Tags */}
      {flag.tags && flag.tags.length > 0 && (
        <Card className="p-4">
          <p className="text-xs text-[var(--fgColor-muted)] mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {flag.tags.map((tag) => (
              <Badge key={tag} variant="default" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <Card className="border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Delete &ldquo;{flag.key}&rdquo;?</p>
          <p className="text-xs text-red-600 mt-1">This permanently deletes the flag and all its configurations.</p>
          <div className="flex gap-2 mt-3">
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
