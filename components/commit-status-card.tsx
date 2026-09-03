"use client";

import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLghCommitStatus } from "@/lib/api";
import { CommitStatusReport, LghCommitStatus } from "@/lib/types";

function statusClass(status: string): string {
    switch (status) {
        case "success":
            return "border-green-500/60 text-green-600 dark:text-green-400";
        case "failure":
        case "error":
            return "border-red-500/60 text-red-600 dark:text-red-400";
        case "cancelled":
            return "border-yellow-500/60 text-yellow-700 dark:text-yellow-400";
        default:
            return "border-muted-foreground/40 text-muted-foreground";
    }
}

function StatusPill({ status }: { status: string }) {
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(status)}`}
        >
            {status}
        </span>
    );
}

/**
 * Aggregate commit status as reported to LGH (proxied through ActionD).
 * Renders nothing when the backend has no proxy, LGH has no report yet,
 * or the job carries no commit SHA.
 */
export function CommitStatusCard({ repo, sha }: { repo: string; sha: string }) {
    const [report, setReport] = useState<CommitStatusReport | null>(null);
    const [state, setState] = useState<"loading" | "ready" | "hidden">("loading");

    useEffect(() => {
        let cancelled = false;
        getLghCommitStatus(repo, sha)
            .then((data) => {
                if (!cancelled) {
                    setReport(data);
                    setState("ready");
                }
            })
            .catch(() => {
                // 404 from LGH (no status yet) or backend without the proxy.
                if (!cancelled) setState("hidden");
            });
        return () => {
            cancelled = true;
        };
    }, [repo, sha]);

    if (state !== "ready" || !report) return null;

    return (
        <Card data-testid="commit-status-card">
            <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <GitBranch className="h-4 w-4" />
                    Commit Status (LGH)
                    <StatusPill status={report.overall} />
                    <code className="font-mono text-xs text-muted-foreground">
                        {report.commit_sha?.substring(0, 7) ?? sha.substring(0, 7)}
                    </code>
                </CardTitle>
            </CardHeader>
            {report.statuses?.length > 0 && (
                <CardContent>
                    <ul className="space-y-1.5">
                        {report.statuses.map((entry: LghCommitStatus, i) => (
                            <li
                                key={`${entry.plugin}-${i}`}
                                className="flex flex-wrap items-center gap-2 text-sm"
                            >
                                <StatusPill status={entry.status} />
                                <span className="font-medium">{entry.plugin}</span>
                                {entry.summary && (
                                    <span className="text-muted-foreground truncate max-w-[60ch]">
                                        {entry.summary}
                                    </span>
                                )}
                                <span className="ml-auto text-xs text-muted-foreground">
                                    {new Date(entry.timestamp).toLocaleString()}
                                </span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            )}
        </Card>
    );
}
