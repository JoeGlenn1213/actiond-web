"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { getActions } from "@/lib/api";
import { ActionRun } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Retry lineage timeline: original job → its retries. The chain is rebuilt
 * client-side from the runs list (the API exposes retry_of per job); runs
 * older than the 100-item window simply drop off the left edge.
 */
export function RetryTimeline({ job }: { job: ActionRun }) {
    const [runs, setRuns] = useState<ActionRun[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        getActions()
            .then((list) => {
                if (!cancelled) setRuns(list);
            })
            .catch(() => {
                if (!cancelled) setRuns([]);
            });
        return () => {
            cancelled = true;
        };
    }, [job.id]);

    const chain = useMemo(() => {
        if (!runs) return null;
        const byId = new Map(runs.map((r) => [r.id, r]));

        // Walk up to the original via retry_of.
        const ancestors: ActionRun[] = [];
        let current: ActionRun | undefined = job;
        let guard = 0;
        while (current && guard < 20) {
            ancestors.unshift(current);
            current = current.retry_of ? byId.get(current.retry_of) : undefined;
            guard += 1;
        }

        // Append direct retries of the current job (one level, newest last).
        const children = runs
            .filter((r) => r.retry_of === job.id)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        return [...ancestors, ...children.filter((c) => c.id !== job.id)];
    }, [runs, job]);

    if (chain === null) {
        return (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Loading retry lineage…
            </p>
        );
    }

    if (chain.length <= 1) return null;

    return (
        <div className="flex flex-wrap items-center gap-2" data-testid="retry-timeline">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            {chain.map((item, i) => (
                <span key={item.id} className="flex items-center gap-2">
                    {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                    <Link
                        href={`/actions/${item.id}`}
                        className={cn(
                            "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted",
                            item.id === job.id && "border-primary/60 bg-primary/5",
                        )}
                        title={new Date(item.created_at).toLocaleString()}
                    >
                        <StatusBadge status={item.status} className="text-[10px]" />
                        <span className="font-mono text-muted-foreground">
                            {item.run_id || item.id.substring(0, 8)}
                        </span>
                        {item.id === job.id && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">current</span>
                        )}
                    </Link>
                </span>
            ))}
        </div>
    );
}
