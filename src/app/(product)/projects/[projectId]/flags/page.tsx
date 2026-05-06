"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { useFlags, useFlagStates, useFlagStateMap, useCreateFlag, useDeleteFlag } from "@/hooks/use-data";
import { Button, Card, Input, Badge, Select, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Label, EmptyState, LoadingSpinner } from "@/components/ui";
import {
  FlagIcon,
  PlusIcon,
  TrashIcon,
  SearchIcon,
  LoaderIcon,
  ToggleLeftIcon,
} from "@/components/ui/icons/nav-icons";
import { toast } from "@/components/toast";
import { cn, timeAgo } from "@/lib/utils";
import { EventBus } from "@/lib/event-bus";
import { DOCS_LINKS } from "@/components/docs-link";
import type { Flag, FlagState } from "@/lib/types";

const FLAG_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "boolean", label: "Boolean" },
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "json", label: "JSON" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "release", label: "Release" },
  { value: "experiment", label: "Experiment" },
  { value: "permission", label: "Permission" },
  { value: "ops", label: "Ops" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

type SortKey = "key" | "name" | "created_at" | "updated_at";

export default function FlagsPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: flags, loading: flagsLoading, error: flagsError, refetch: refetchFlags } = useFlags(projectId);
  const { data: batchStates } = useFlagStates(projectId, currentEnvId);
  const stateMap = useFlagStateMap(batchStates, flags);

  const createFlag = useCreateFlag(projectId);
  const deleteFlag = useDeleteFlag(projectId);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newFlag, setNewFlag] = useState({
    key: "",
    name: "",
    flag_type: "boolean" as string,
    category: "release",
    description: "",
    default_value: "false",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Toggle / delete state
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Init from URL params
  useEffect(() => {
    const s = searchParams.get("search");
    if (s) setSearchInput(s);
    const t = searchParams.get("type");
    if (t) setTypeFilter(t);
    const c = searchParams.get("category");
    if (c) setCategoryFilter(c);
    const st = searchParams.get("status");
    if (st) setStatusFilter(st);
  }, [searchParams]);

  // Update URL
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (sortBy !== "created_at") params.set("sortBy", sortBy);
    if (sortDir !== "desc") params.set("sortDir", sortDir);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [search, typeFilter, categoryFilter, statusFilter, sortBy, sortDir, router]);

  useEffect(() => { updateUrl(); }, [updateUrl]);

  // Filtered & sorted flags
  const filtered = useMemo(() => {
    let result = (flags ?? []).filter(
      (f) =>
        (f.key ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (f.name ?? "").toLowerCase().includes(search.toLowerCase()),
    );
    if (typeFilter !== "all") result = result.filter((f) => f.flag_type === typeFilter);
    if (categoryFilter !== "all") result = result.filter((f) => f.category === categoryFilter);
    if (statusFilter !== "all") result = result.filter((f) => f.status === statusFilter);
    result.sort((a, b) => {
      const aVal = (a[sortBy] ?? "") as string;
      const bVal = (b[sortBy] ?? "") as string;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [flags, search, typeFilter, categoryFilter, statusFilter, sortBy, sortDir]);

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

  function defaultValueForType(type: string): string {
    switch (type) {
      case "string": return '""';
      case "number": return "0";
      case "json": return "{}";
      default: return "false";
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) return;
    const errors: Record<string, string> = {};
    if (!newFlag.key.trim()) errors.key = "Key is required";
    if (!newFlag.name.trim()) errors.name = "Name is required";
    if (newFlag.flag_type === "json") {
      try { JSON.parse(newFlag.default_value); } catch { errors.default_value = "Invalid JSON"; }
    }
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});

    let parsedDefault: unknown;
    try { parsedDefault = JSON.parse(newFlag.default_value); } catch { return; }

    const result = await createFlag.mutate({
      key: newFlag.key.trim(),
      name: newFlag.name.trim(),
      flag_type: newFlag.flag_type,
      category: newFlag.category,
      description: newFlag.description,
      default_value: parsedDefault,
    });
    if (result) {
      setShowCreate(false);
      setNewFlag({ key: "", name: "", flag_type: "boolean", category: "release", description: "", default_value: "false" });
      EventBus.dispatch("flags:changed");
      toast("Flag created", "success");
    } else if (createFlag.error) {
      toast(createFlag.error, "error");
    }
  }

  async function handleDelete(flagKey: string) {
    const result = await deleteFlag.mutate(flagKey);
    setDeleting(null);
    if (result !== undefined) {
      EventBus.dispatch("flags:changed");
      toast("Flag deleted", "success");
    } else if (deleteFlag.error) {
      toast(deleteFlag.error, "error");
    }
  }

  async function handleQuickToggle(flagKey: string) {
    if (!currentEnvId) { toast("Select an environment first", "error"); return; }
    setToggling(flagKey);
    const current = stateMap.get(flagKey);
    try {
      await api.updateFlagState(token!, projectId!, flagKey, currentEnvId, { enabled: !current?.enabled });
      refetchFlags();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Toggle failed", "error");
    } finally {
      setToggling(null);
    }
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center p-16">
        <EmptyState icon={FlagIcon} title="Select a project" description="Choose a project from the projects page to view its feature flags." />
      </div>
    );
  }

  if (flagsLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-40 animate-pulse rounded bg-[var(--borderColor-default)]" />
            <div className="h-4 w-24 animate-pulse rounded bg-[var(--borderColor-default)]" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded-lg bg-[var(--borderColor-default)]" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--borderColor-default)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fgColor-default)]">Feature Flags</h1>
          <p className="mt-1 text-sm text-[var(--fgColor-muted)]">Manage feature flags and their rollout configurations.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />Create Flag
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fgColor-subtle)]" />
          <Input
            type="text"
            placeholder="Search flags by key or name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter} options={FLAG_TYPE_OPTIONS} size="sm" className="min-w-[130px]" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter} options={CATEGORY_OPTIONS} size="sm" className="min-w-[150px]" />
          <Select value={statusFilter} onValueChange={setStatusFilter} options={STATUS_OPTIONS} size="sm" className="min-w-[130px]" />
        </div>
      </div>

      {/* Flags list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FlagIcon}
          title={flags && flags.length > 0 ? "No matching flags" : "No flags yet"}
          description={flags && flags.length > 0 ? "Try adjusting your search or filters." : "Create your first feature flag to start managing releases, experiments, and permissions."}
          action={<Button onClick={() => setShowCreate(true)}><PlusIcon className="mr-2 h-4 w-4" />Create your first flag</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-[var(--borderColor-default)]">
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-3 text-xs font-semibold text-[var(--fgColor-muted)] bg-[var(--bgColor-muted)]">
              <button onClick={() => handleSort("name")} className="flex-1 text-left hover:text-[var(--fgColor-default)]">Flag {sortBy === "name" && (sortDir === "asc" ? "↑" : "↓")}</button>
              <span className="w-20 text-center">Type</span>
              <span className="w-24 text-center">Status</span>
              <button onClick={() => handleSort("updated_at")} className="w-24 text-right hover:text-[var(--fgColor-default)]">Updated {sortBy === "updated_at" && (sortDir === "asc" ? "↑" : "↓")}</button>
              <span className="w-20" />
            </div>
            {filtered.map((flag) => {
              const state = stateMap.get(flag.key);
              const enabled = state?.enabled ?? false;
              const isToggling = toggling === flag.key;
              return (
                <div
                  key={flag.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bgColor-muted)] transition-colors cursor-pointer"
                  onClick={() => router.push(`/projects/${projectId}/flags/${flag.key}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--fgColor-default)] truncate">{flag.name}</p>
                    <p className="text-xs text-[var(--fgColor-muted)] font-mono truncate">{flag.key}</p>
                  </div>
                  <Badge variant="default" className="w-20 justify-center text-xs">{flag.flag_type}</Badge>
                  <div className="w-24 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickToggle(flag.key); }}
                      disabled={isToggling || !currentEnvId}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                        enabled
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)] hover:bg-[var(--borderColor-default)]",
                      )}
                    >
                      {isToggling ? (
                        <LoaderIcon className="h-3 w-3 animate-spin" />
                      ) : (
                        <ToggleLeftIcon className="h-3 w-3" />
                      )}
                      {enabled ? "On" : "Off"}
                    </button>
                  </div>
                  <span className="w-24 text-right text-xs text-[var(--fgColor-subtle)]">{flag.updated_at ? timeAgo(flag.updated_at) : "—"}</span>
                  <div className="w-20 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => { e.stopPropagation(); setDeleting(flag.key); }}
                      className="text-[var(--fgColor-subtle)] hover:text-red-500"
                      title="Delete flag"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Feature Flag</DialogTitle>
            <DialogDescription>Create a new feature flag in this project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-4">
            <div>
              <Label htmlFor="flag-name">Name</Label>
              <Input id="flag-name" value={newFlag.name} onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value, key: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-") })} placeholder="My Feature" className="mt-1" autoFocus />
              {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
              <Label htmlFor="flag-key">Key</Label>
              <Input id="flag-key" value={newFlag.key} onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })} placeholder="my-feature" className="mt-1 font-mono text-sm" />
              {fieldErrors.key && <p className="text-xs text-red-500 mt-1">{fieldErrors.key}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={newFlag.flag_type} onValueChange={(v) => setNewFlag({ ...newFlag, flag_type: v, default_value: defaultValueForType(v) })} options={FLAG_TYPE_OPTIONS.filter((o) => o.value !== "all")} className="mt-1" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newFlag.category} onValueChange={(v) => setNewFlag({ ...newFlag, category: v })} options={CATEGORY_OPTIONS.filter((o) => o.value !== "all")} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="flag-description">Description</Label>
              <Input id="flag-description" value={newFlag.description} onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })} placeholder="Optional description" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="flag-default">Default Value</Label>
              <Input id="flag-default" value={newFlag.default_value} onChange={(e) => setNewFlag({ ...newFlag, default_value: e.target.value })} className="mt-1 font-mono text-sm" />
              {fieldErrors.default_value && <p className="text-xs text-red-500 mt-1">{fieldErrors.default_value}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createFlag.loading}>{createFlag.loading ? "Creating..." : "Create Flag"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Flag</DialogTitle>
            <DialogDescription>Are you sure you want to delete <span className="font-semibold">{deleting}</span>? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleting && handleDelete(deleting)} disabled={deleteFlag.loading}>{deleteFlag.loading ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
