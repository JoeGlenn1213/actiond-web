"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RunsTable } from "@/components/runs-table";
import { ConnectionBanner } from "@/components/connection-banner";
import { EventGroupView } from "@/components/event-group-view";
import { ActionRun } from "@/lib/types";
import { getActions } from "@/lib/api";
import { apiUrl } from "@/lib/api-base";
import { useFilterStore, type SortField, type StatusFilter } from "@/stores/filter-store";
import { usePolling } from "@/lib/use-polling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronLeft, ChevronRight, RefreshCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All statuses" },
    { value: "running", label: "Running" },
    { value: "pending", label: "Pending" },
    { value: "queued", label: "Queued" },
    { value: "done", label: "Done" },
    { value: "failed", label: "Failed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "retrying", label: "Retrying" },
    { value: "blocked", label: "Blocked" },
    { value: "needs_approval", label: "Needs Approval" },
    { value: "retryable", label: "Retryable" },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
    { value: "created_at", label: "Created time" },
    { value: "duration_ms", label: "Duration" },
    { value: "status", label: "Status" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

type ClearStage = 1 | 2 | null;

export function ActionsClient() {
    const searchParams = useSearchParams();
    const eventId = searchParams.get("event") || "";

    const [runs, setRuns] = useState<ActionRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cleanupOpen, setCleanupOpen] = useState(false);
    const [clearStage, setClearStage] = useState<ClearStage>(null);

    const {
        status,
        repo,
        plugin,
        searchQuery,
        sortBy,
        sortOrder,
        page,
        pageSize,
        setStatus,
        setRepo,
        setPlugin,
        setSearchQuery,
        setSortBy,
        setSortOrder,
        setPage,
        setPageSize,
        resetFilters,
    } = useFilterStore();

    const fetchRuns = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await getActions();
            setRuns(data);
            setError(null);
        } catch (err) {
            // Silent poll failures keep the stale data; the connection banner
            // covers the backend-down case.
            if (!silent) setError((err as Error).message);
        } finally {
            // Always clear: the initial load happens through a silent poll tick.
            setLoading(false);
        }
    }, []);

    // Immediate fetch + 5s refresh while the tab is visible.
    usePolling(() => fetchRuns(true), 5_000);

    const repos = useMemo(
        () => Array.from(new Set(runs.map((r) => r.repo))).sort(),
        [runs],
    );
    const plugins = useMemo(
        () => Array.from(new Set(runs.map((r) => r.plugin_name || r.action))).sort(),
        [runs],
    );

    const filtered = useMemo(() => {
        let list = runs;
        if (status !== "all") list = list.filter((r) => r.status === status);
        if (repo) list = list.filter((r) => r.repo === repo);
        if (plugin) list = list.filter((r) => (r.plugin_name || r.action) === plugin);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter((r) =>
                [r.repo, r.action, r.run_id, r.event_id].some((v) => v?.toLowerCase().includes(q)),
            );
        }
        const dir = sortOrder === "asc" ? 1 : -1;
        return [...list].sort((a, b) => {
            switch (sortBy) {
                case "duration_ms":
                    return ((a.duration_ms ?? 0) - (b.duration_ms ?? 0)) * dir;
                case "status":
                    return a.status.localeCompare(b.status) * dir;
                default:
                    return (
                        (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
                    );
            }
        });
    }, [runs, status, repo, plugin, searchQuery, sortBy, sortOrder]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentRuns = filtered.slice(startIndex, endIndex);

    const handleCleanup = async () => {
        try {
            const res = await fetch(apiUrl("/api/actions/cleanup"), { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                toast.info(data.message ?? "Cleanup finished");
                fetchRuns(true);
            } else {
                toast.error(data.message || `Cleanup failed (HTTP ${res.status})`);
            }
        } catch (err) {
            toast.error(`Cleanup failed: ${(err as Error).message}`);
        } finally {
            setCleanupOpen(false);
        }
    };

    const handleClearAll = async () => {
        try {
            const res = await fetch(apiUrl("/api/actions/clear-all"), { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                toast.success(
                    `Cleared ${data.jobs_deleted} actions and ${data.dirs_deleted} artifact directories`,
                );
                setRuns([]);
                setPage(1);
                fetchRuns(true);
            } else {
                toast.error(data.message || `Clear-all failed (HTTP ${res.status})`);
            }
        } catch (err) {
            toast.error(`Clear-all failed: ${(err as Error).message}`);
        } finally {
            setClearStage(null);
        }
    };

    const hasActiveFilters =
        status !== "all" || repo !== "" || plugin !== "" || searchQuery !== "";

    // ?event=<id> renders the grouped view for that event instead of the list.
    if (eventId) {
        return <EventGroupView eventId={eventId} />;
    }

    return (
        <div className="space-y-4">
            <ConnectionBanner />
            {error && (
                <div
                    className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
                    data-testid="actions-error"
                >
                    Failed to load actions: {error}
                </div>
            )}

            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                    <SelectTrigger className="w-[160px]" aria-label="Filter by status">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={repo || "all"} onValueChange={(v) => setRepo(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[180px]" aria-label="Filter by repo">
                        <SelectValue placeholder="Repo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All repos</SelectItem>
                        {repos.map((r) => (
                            <SelectItem key={r} value={r}>
                                {r}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={plugin || "all"} onValueChange={(v) => setPlugin(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[180px]" aria-label="Filter by plugin">
                        <SelectValue placeholder="Plugin" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All plugins</SelectItem>
                        {plugins.map((p) => (
                            <SelectItem key={p} value={p}>
                                {p}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search repo / action / run / event…"
                        className="w-[240px] pl-8"
                        aria-label="Search runs"
                    />
                </div>

                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                        Reset
                    </Button>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                    Showing {filtered.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length} runs
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={String(sortBy)} onValueChange={(v) => setSortBy(v as SortField)}>
                        <SelectTrigger className="w-[150px]" aria-label="Sort by">
                            <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                            {SORT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Toggle sort order"
                        title={sortOrder === "desc" ? "Descending" : "Ascending"}
                        onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                    >
                        {sortOrder === "desc" ? (
                            <ArrowDownWideNarrow className="h-4 w-4" />
                        ) : (
                            <ArrowUpNarrowWide className="h-4 w-4" />
                        )}
                    </Button>
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                        <SelectTrigger className="w-[110px]" aria-label="Rows per page">
                            <SelectValue placeholder="Per page" />
                        </SelectTrigger>
                        <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size} / page
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setClearStage(1)}
                        disabled={loading || runs.length === 0}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear All
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCleanupOpen(true)}
                        disabled={loading || runs.length === 0}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Cleanup Old
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fetchRuns()} disabled={loading}>
                        <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            <RunsTable runs={currentRuns} />

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Cleanup confirmation */}
            <AlertDialog open={cleanupOpen} onOpenChange={setCleanupOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cleanup old actions?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This targets completed and failed actions older than 7 days.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCleanup}>Cleanup</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Clear-all double confirmation */}
            <AlertDialog open={clearStage !== null} onOpenChange={(open) => !open && setClearStage(null)}>
                <AlertDialogContent>
                    {clearStage === 1 ? (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Clear all action data?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This deletes every action record, all artifact files and the
                                    database. This cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => setClearStage(2)}>
                                    Continue
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    ) : (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Really delete everything?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Final confirmation — all action data will be permanently removed.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-white hover:bg-destructive/90"
                                    onClick={handleClearAll}
                                >
                                    Delete Everything
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    )}
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
