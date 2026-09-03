"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, GitCommit, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunsTable } from "@/components/runs-table";
import { StatusBadge } from "@/components/status-badge";
import { getActionsByEvent } from "@/lib/api";
import { ActionRun } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

/**
 * Grouped view of every job triggered by one event (one push/tag):
 * GET /api/actions/by-event/{event_id}, reachable by clicking an event_id.
 */
export function EventGroupView({ eventId }: { eventId: string }) {
    const router = useRouter();
    const [runs, setRuns] = useState<ActionRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEvent = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await getActionsByEvent(eventId);
            setRuns(data);
            setError(null);
        } catch (err) {
            if (!silent) setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    usePolling(() => fetchEvent(true), 5_000);

    // All runs of an event share the trigger; take context from the newest.
    const head = runs[0];
    const statusCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const run of runs) counts.set(run.status, (counts.get(run.status) ?? 0) + 1);
        return counts;
    }, [runs]);

    return (
        <div className="space-y-4" data-testid="event-group">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.push("/actions")} aria-label="Back to all actions">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Event Group
                    </h3>
                    <code className="text-xs text-muted-foreground font-mono">{eventId}</code>
                </div>
                <div className="ml-auto flex flex-wrap gap-1.5">
                    {Array.from(statusCounts.entries()).map(([status, count]) => (
                        <span key={status} className="flex items-center gap-1">
                            <StatusBadge status={status} />
                            <span className="text-xs text-muted-foreground tabular-nums">×{count}</span>
                        </span>
                    ))}
                </div>
            </div>

            {error && (
                <div className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    Failed to load event: {error}
                </div>
            )}

            {head && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Trigger context</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <div className="text-xs text-muted-foreground">Repo</div>
                            <div className="font-medium">{head.repo}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Trigger</div>
                            <div>{head.trigger_reason || head.event_type || "—"}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">When</div>
                            <div>{new Date(head.created_at).toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Commit</div>
                            {head.commit?.hash || head.commit_sha ? (
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <GitCommit className="h-3.5 w-3.5 shrink-0" />
                                    <code className="font-mono text-xs">
                                        {(head.commit?.hash || head.commit_sha)?.substring(0, 7)}
                                    </code>
                                    {head.branch && <Badge variant="secondary" className="text-xs">{head.branch}</Badge>}
                                </div>
                            ) : (
                                <span className="text-muted-foreground">—</span>
                            )}
                        </div>
                        {head.commit?.message && (
                            <div className="sm:col-span-2 lg:col-span-4 text-muted-foreground truncate">
                                {head.commit.message}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {loading && runs.length === 0 ? (
                <div className="rounded-md border p-8 text-center text-muted-foreground">Loading…</div>
            ) : (
                <RunsTable runs={runs} />
            )}
        </div>
    );
}
