"use client";

import { useCallback, useEffect, useState, useRef, startTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Terminal, LayoutDashboard, GitCommit, RefreshCcw, Download, Clock, Package, AlertCircle, Lightbulb, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
import { StatusBadge } from "@/components/status-badge";
import { ConnectionBanner } from "@/components/connection-banner";
import { DiagnoseCard } from "@/components/diagnose-card";
import { ResultCard } from "@/components/result-card";
import { RetryTimeline } from "@/components/retry-timeline";
import { CommitStatusCard } from "@/components/commit-status-card";

import { subscribeToAction, ProgressMessage } from "@/lib/stream";
import { ActionRun } from "@/lib/types";
import { approveAction, getAction } from "@/lib/api";
import { QuickTestPanel } from "./quicktest/quicktest-panel";
import { apiUrl } from "@/lib/api-base";
import { formatDuration } from "@/lib/format";
import { toast } from "sonner";

interface Props {
    actionId: string;
}

const ACTIVE_STATUSES = ["running", "pending", "queued", "retrying"];
const TERMINAL_DONE = ["done", "completed", "success"];

type DetailStatus = "connecting" | "streaming" | "completed" | "error";
type ConfirmAction = "retry" | "cancel" | "approve" | null;

export default function ActionDetailClient({ actionId: propActionId }: Props) {
    const router = useRouter();
    const pathname = usePathname();

    // Extract real actionId from URL path (for static export)
    // URL pattern: /actions/{actionId}
    const actionId = pathname?.split('/actions/')[1] || propActionId;

    const [logs, setLogs] = useState<ProgressMessage[]>([]);
    const [status, setStatus] = useState<DetailStatus>("connecting");
    const [job, setJob] = useState<ActionRun | null>(null);
    const [retrying, setRetrying] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    // Fetch Job Details
    const fetchJob = useCallback(async () => {
        try {
            const data = await getAction(actionId);
            const normalizedStatus = String(data.status || "").toLowerCase();
            startTransition(() => {
                setJob(data);
                if (ACTIVE_STATUSES.includes(normalizedStatus) || normalizedStatus === "needs_approval") {
                    setStatus("streaming");
                } else if (TERMINAL_DONE.includes(normalizedStatus)) {
                    setStatus("completed");
                } else if (['failed', 'cancelled', 'error'].includes(normalizedStatus)) {
                    setStatus("error");
                }
            });
        } catch (e) {
            console.error("Failed to fetch job details", e);
        }
    }, [actionId]);

    useEffect(() => {
        fetchJob();
    }, [fetchJob]);

    // Log Streaming (active jobs only; reconnects with backoff)
    useEffect(() => {
        if (!actionId || !job) return;

        const isJobActive = job.status && ACTIVE_STATUSES.includes(job.status.toLowerCase());
        if (!isJobActive) {
            return;
        }

        const cleanup = subscribeToAction(
            actionId,
            (msg) => {
                setStatus("streaming");
                setLogs((prev) => [...prev, msg]);
                if (typeof msg.progress === "number") {
                    setProgress(Math.max(0, Math.min(100, msg.progress)));
                }

                if (msg.done) {
                    setStatus("completed");
                    fetchJob(); // Refresh job data
                }
            },
            () => {
                // Reconnect attempts exhausted
                setStatus("error");
                toast.error("Lost the live stream and could not reconnect. Use Refresh or reopen the page.");
            },
        );

        return cleanup;
    }, [actionId, job, fetchJob]);

    // Auto-scroll to bottom
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // History log replay: finished jobs have no live stream; pull the raw log
    // (stored inside the artifact dir) through the artifacts endpoint.
    const [historyLog, setHistoryLog] = useState<string | null>(null);
    useEffect(() => {
        setHistoryLog(null);
        if (!job || !job.raw_log_path) return;
        if (ACTIVE_STATUSES.includes(job.status)) return; // live stream in use
        if (logs.length > 0) return; // already have live output

        const parts = job.raw_log_path.split("/");
        const fileName = parts[parts.length - 1];
        if (!fileName) return;

        let cancelled = false;
        fetch(apiUrl(`/api/actions/${actionId}/artifacts/${encodeURIComponent(fileName)}`))
            .then(async (res) => (res.ok ? await res.text() : null))
            .then((text) => {
                if (!cancelled && text) setHistoryLog(text);
            })
            .catch(() => {
                // 404 or unreadable — the empty-state message covers it.
            });
        return () => {
            cancelled = true;
        };
    }, [job, logs.length, actionId]);

    // Handle retry
    const handleRetry = async () => {
        setConfirmAction(null);
        setRetrying(true);
        try {
            const res = await fetch(apiUrl(`/api/actions/${actionId}/retry`), {
                method: "POST",
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(`Job queued for retry — opening new job ${data.job_id}`);
                // Navigate to the new job
                router.push(`/actions/${data.job_id}`);
            } else {
                const text = await res.text().catch(() => "");
                toast.error(`Failed to retry: ${text.trim() || res.statusText}`);
            }
        } catch (error) {
            console.error("Failed to retry:", error);
            toast.error("Failed to retry. Please check the server.");
        } finally {
            setRetrying(false);
        }
    };

    // Handle cancel
    const handleCancel = async () => {
        setConfirmAction(null);
        try {
            const res = await fetch(apiUrl(`/api/actions/${actionId}/cancel`), {
                method: "POST",
            });
            if (res.ok) {
                toast.success("Action cancelled");
                fetchJob();
            } else {
                const text = await res.text().catch(() => "");
                toast.error(`Failed to cancel: ${text.trim() || res.statusText}`);
            }
        } catch (error) {
            console.error("Failed to cancel:", error);
            toast.error("Failed to cancel. Please check the server.");
        }
    };

    // Handle approve (needs_approval gate — backend supports approve only)
    const handleApprove = async () => {
        setConfirmAction(null);
        try {
            await approveAction(actionId);
            toast.success("Job approved — the worker will pick it up");
            fetchJob();
        } catch (err) {
            toast.error(`Failed to approve: ${(err as Error).message}`);
        }
    };

    const isQuickTest = job?.plugin_name === "java-quicktest" || job?.action === "java-quicktest";
    // Backend only allows retry for failed/cancelled jobs (409 otherwise).
    const canRetry = job?.status && ['failed', 'cancelled'].includes(job.status.toLowerCase());
    const canCancel = job?.status && ACTIVE_STATUSES.includes(job.status.toLowerCase());
    const needsApproval = job?.status === "needs_approval";
    const isFailed = job?.status === "failed";
    const durationMs = job?.duration_ms || 0;
    const duration = durationMs > 0 ? formatDuration(durationMs) : null;
    const badgeStatus = status === "connecting" && job ? job.status : status === "completed" && job ? job.status : job?.status || status;

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <ConnectionBanner />

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        Action Detail
                        {job?.run_id && <Badge variant="outline" className="text-lg font-normal py-1">{job.run_id}</Badge>}
                    </h2>
                    {job?.commit && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <GitCommit className="h-4 w-4" />
                            <span className="font-mono">{job.commit.hash?.substring(0, 7) || 'unknown'}</span>
                            <span>{job.commit.message || 'No commit message'}</span>
                        </div>
                    )}
                    {job?.commit_sha && !job?.commit && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <GitCommit className="h-4 w-4" />
                            <span className="font-mono">{job.commit_sha?.substring(0, 7)}</span>
                            {job?.branch && <Badge variant="secondary" className="text-xs">{job.branch}</Badge>}
                            {job?.tag && <Badge variant="secondary" className="text-xs">{job.tag}</Badge>}
                        </div>
                    )}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {needsApproval && (
                        <Button
                            size="sm"
                            onClick={() => setConfirmAction("approve")}
                            data-testid="approve-button"
                        >
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Approve
                        </Button>
                    )}
                    {canCancel && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setConfirmAction("cancel")}
                        >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Cancel
                        </Button>
                    )}
                    {canRetry && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmAction("retry")}
                            disabled={retrying}
                        >
                            <RefreshCcw className={`h-4 w-4 mr-2 ${retrying ? 'animate-spin' : ''}`} />
                            Retry
                        </Button>
                    )}
                    <StatusBadge status={badgeStatus} />
                </div>
            </div>

            {/* Live progress from SSE (0-100) */}
            {(progress != null || job?.progress) && status === "streaming" && (
                <div className="space-y-1.5">
                    {progress != null && (
                        <div className="flex items-center gap-3">
                            <Progress value={progress} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                                {Math.round(progress)}%
                            </span>
                        </div>
                    )}
                    {job?.progress && (
                        <p className="text-xs text-muted-foreground truncate">{job.progress}</p>
                    )}
                </div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Clock className="h-4 w-4" />
                            Duration
                        </div>
                        <div className="text-2xl font-bold mt-1">
                            {duration || "—"}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Package className="h-4 w-4" />
                            Plugin
                        </div>
                        <div className="text-lg font-semibold mt-1 truncate">
                            {job?.plugin_name || job?.action || "—"}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            Repository
                        </div>
                        <div className="text-lg font-semibold mt-1 truncate">
                            {job?.repo || "—"}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            Trigger
                        </div>
                        <div className="text-lg font-semibold mt-1">
                            {job?.trigger_reason || job?.event_type || "—"}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Retry lineage timeline */}
            {job && (job.retry_of || job.retry_count != null) && <RetryTimeline job={job} />}

            {/* Commit status as reported to LGH (proxied via ActionD) */}
            {job && (job.commit?.hash || job.commit_sha) && (
                <CommitStatusCard repo={job.repo} sha={(job.commit?.hash || job.commit_sha)!} />
            )}

            {/* Error Summary */}
            {job?.error && (
                <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2 text-base">
                            <AlertCircle className="h-4 w-4" />
                            Error
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap overflow-auto max-h-40">
                            {job.error_summary || job.error}
                        </pre>
                    </CardContent>
                </Card>
            )}

            {/* One-click failure diagnosis */}
            {isFailed && <DiagnoseCard actionId={actionId} />}

            {/* Structured result — generic renderer (quicktest keeps its Overview panel) */}
            {job?.result && !isQuickTest && <ResultCard result={job.result} />}

            {/* Hints (quicktest runs; others get the generic ResultCard above) */}
            {isQuickTest && job?.result?.hints && job.result.hints.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-yellow-700 dark:text-yellow-400 flex items-center gap-2 text-base">
                            <Lightbulb className="h-4 w-4" />
                            Suggestions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                            {job.result.hints.map((hint: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-yellow-600 dark:text-yellow-500">•</span>
                                    {hint}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Artifacts */}
            {job?.artifacts && job.artifacts.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Download className="h-4 w-4" />
                            Artifacts ({job.artifacts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {job.artifacts.map((artifact: string, i: number) => (
                                <a
                                    key={i}
                                    href={apiUrl(`/api/actions/${job.id}/artifacts/${encodeURIComponent(artifact)}`)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs hover:bg-muted"
                                >
                                    {artifact}
                                </a>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue={isQuickTest ? "overview" : "logs"} className="space-y-4">
                <TabsList>
                    {isQuickTest && (
                        <TabsTrigger value="overview">
                            <LayoutDashboard className="h-4 w-4 mr-2" />
                            Overview
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="logs">
                        <Terminal className="h-4 w-4 mr-2" />
                        Console Output
                    </TabsTrigger>
                </TabsList>

                {isQuickTest && (
                    <TabsContent value="overview" className="space-y-4">
                        <QuickTestPanel actionId={actionId} />
                    </TabsContent>
                )}

                <TabsContent value="logs" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Terminal className="h-5 w-5" />
                                Live Output
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                    {actionId}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{logs.length} lines</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-zinc-950 rounded-lg p-4 font-mono text-sm max-h-[60vh] overflow-y-auto font-ligatures-none">
                                {logs.length === 0 && status === "connecting" && (
                                    <div className="text-zinc-500 animate-pulse">Connecting...</div>
                                )}
                                {logs.length === 0 && status === "streaming" && (
                                    <div className="text-zinc-500">Waiting for output...</div>
                                )}
                                {logs.length === 0 && (status === "completed" || status === "error") && job && (
                                    historyLog ? (
                                        <pre className="whitespace-pre-wrap text-zinc-400" data-testid="history-log">
                                            {historyLog}
                                        </pre>
                                    ) : (
                                        <div className="text-zinc-500">
                                            {status === "completed"
                                                ? "No live output captured for this run (stream is only available while the job is active)."
                                                : "Stream unavailable for this run."}
                                        </div>
                                    )
                                )}
                                {logs.map((log, i) => (
                                    <div
                                        key={i}
                                        className={`py-0.5 whitespace-pre-wrap ${log.is_error ? "text-red-400" : "text-zinc-200"}`}
                                    >
                                        <span className="text-zinc-600 mr-2 select-none">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                        {log.line}
                                    </div>
                                ))}
                                <div ref={logEndRef} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Retry / Cancel / Approve confirmations */}
            <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <AlertDialogContent>
                    {confirmAction === "approve" ? (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Approve this action?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    The gate will open and the worker continues the job. The backend
                                    supports approval only — to stop the job instead, cancel it.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Not now</AlertDialogCancel>
                                <AlertDialogAction onClick={handleApprove}>Approve</AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    ) : confirmAction === "retry" ? (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Retry this action?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    A new job will be created from the same trigger and you will be
                                    taken to its page.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleRetry}>Retry</AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    ) : (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Cancel this running action?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    The job will be stopped and marked as cancelled. This cannot be
                                    undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Keep running</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-white hover:bg-destructive/90"
                                    onClick={handleCancel}
                                >
                                    Cancel action
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    )}
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
