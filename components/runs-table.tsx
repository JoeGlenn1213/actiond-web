"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, GitCommit, ExternalLink, FileText, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { ActionRun } from "@/lib/types";
import { apiUrl } from "@/lib/api-base";
import { formatDuration, shortCommit } from "@/lib/format";

interface RunsTableProps {
    runs: ActionRun[];
}

export function RunsTable({ runs }: RunsTableProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="rounded-md border" data-testid="runs-table">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead>Run ID</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Repo</TableHead>
                        <TableHead>Commit</TableHead>
                        <TableHead>Time</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {runs.map((run) => (
                        <Fragment key={run.id}>
                            <TableRow
                                className="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={() => toggleExpand(run.id)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        toggleExpand(run.id);
                                    }
                                }}
                                tabIndex={0}
                                role="button"
                                aria-expanded={expandedId === run.id}
                                data-testid="run-row"
                            >
                                <TableCell>
                                    {expandedId === run.id ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )}
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={run.status} />
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                    {run.run_id || run.id.substring(0, 8)}
                                </TableCell>
                                <TableCell className="font-medium">{run.action}</TableCell>
                                <TableCell>{run.repo}</TableCell>
                                <TableCell>
                                    {(() => {
                                        const sha = shortCommit(run.commit?.hash || run.commit_sha);
                                        return sha ? (
                                            <div className="flex items-center gap-1 font-mono text-xs">
                                                <GitCommit className="h-3 w-3" />
                                                <span>{sha}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">~ unknown</span>
                                        );
                                    })()}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {new Date(run.created_at).toLocaleString()}
                                    {run.duration_ms != null && (
                                        <div className="text-xs opacity-70">
                                            {formatDuration(run.duration_ms)}
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                            {expandedId === run.id && (
                                <TableRow>
                                    <TableCell colSpan={7} className="bg-muted/30">
                                        <ActionDetails run={run} />
                                    </TableCell>
                                </TableRow>
                            )}
                        </Fragment>
                    ))}
                    {runs.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                No actions found
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

function ActionDetails({ run }: { run: ActionRun }) {
    return (
        <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Full ID</div>
                    <div className="font-mono text-xs">{run.id}</div>
                </div>
                <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Event ID</div>
                    {run.event_id ? (
                        <Link
                            href={`/events/${encodeURIComponent(run.event_id)}`}
                            className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
                        >
                            {run.event_id}
                        </Link>
                    ) : (
                        <div className="font-mono text-xs">N/A</div>
                    )}
                </div>
                <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Plugin</div>
                    <div className="text-sm">{run.plugin_name}</div>
                </div>
                <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Started At</div>
                    <div className="text-sm">{run.started_at ? new Date(run.started_at).toLocaleString() : 'Not started'}</div>
                </div>
                {run.retry_of && (
                    <div className="col-span-2">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Retry lineage</div>
                        <div className="text-sm flex items-center gap-2">
                            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                            <Link
                                href={`/actions/${run.retry_of}`}
                                className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
                            >
                                {run.retry_of}
                            </Link>
                            {run.retry_count ? (
                                <span className="text-xs text-muted-foreground">attempt {run.retry_count + 1}</span>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>

            {run.progress && (
                <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Progress</div>
                    <div className="text-sm bg-background rounded p-2 font-mono">
                        {run.progress}
                    </div>
                </div>
            )}

            {run.error && (
                <div>
                    <div className="text-xs font-medium text-destructive mb-1">Error</div>
                    <div className="text-sm bg-destructive/10 rounded p-2 font-mono text-destructive">
                        {run.error}
                    </div>
                </div>
            )}

            <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Artifacts</div>
                <div className="flex flex-wrap gap-2">
                    {run.artifacts?.length ? (
                        run.artifacts.map((artifact) => (
                            <Button
                                key={artifact}
                                variant="outline"
                                size="sm"
                                asChild
                            >
                                <a
                                    href={apiUrl(`/api/actions/${run.id}/artifacts/${encodeURIComponent(artifact)}`)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1"
                                >
                                    <FileText className="h-3 w-3" />
                                    <span className="text-xs font-mono">{artifact}</span>
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </Button>
                        ))
                    ) : (
                        <span className="text-xs text-muted-foreground">No artifacts</span>
                    )}
                </div>
            </div>

            <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" asChild>
                    <a href={apiUrl(`/api/actions/${run.id}/stream`)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Stream
                    </a>
                </Button>
            </div>
        </div>
    );
}
