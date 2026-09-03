"use client";

import { useState } from "react";
import { Stethoscope, Loader2, AlertTriangle, FileCode2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { diagnoseAction } from "@/lib/api";
import { DiagnoseReport } from "@/lib/types";
import { formatDuration } from "@/lib/format";
import { toast } from "sonner";

function severityClass(severity: string): string {
    switch (severity) {
        case "critical":
            return "border-red-500/60 text-red-600 dark:text-red-400";
        case "warning":
            return "border-yellow-500/60 text-yellow-700 dark:text-yellow-400";
        default:
            return "border-blue-500/60 text-blue-600 dark:text-blue-400";
    }
}

/**
 * One-click failure diagnosis for a job: GET /api/actions/{id}/diagnose,
 * rendered as category / cause / fix steps / related files.
 */
export function DiagnoseCard({ actionId }: { actionId: string }) {
    const [report, setReport] = useState<DiagnoseReport | null>(null);
    const [loading, setLoading] = useState(false);

    const runDiagnosis = async () => {
        setLoading(true);
        try {
            const data = await diagnoseAction(actionId);
            setReport(data);
        } catch (err) {
            toast.error(`Diagnosis failed: ${(err as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!report) {
        return (
            <Button variant="outline" size="sm" onClick={runDiagnosis} disabled={loading}>
                {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Stethoscope className="h-4 w-4 mr-2" />
                )}
                Diagnose Failure
            </Button>
        );
    }

    const { analysis } = report;

    return (
        <Card data-testid="diagnose-card" className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
            <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <Stethoscope className="h-4 w-4" />
                    Failure Diagnosis
                    {analysis && (
                        <>
                            <Badge variant="outline" className="font-mono text-xs">{analysis.category}</Badge>
                            <Badge variant="outline" className={severityClass(analysis.severity)}>
                                {analysis.severity}
                            </Badge>
                            <Badge variant="outline" className="font-mono text-xs">{analysis.type}</Badge>
                        </>
                    )}
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={runDiagnosis} disabled={loading}>
                        <RefreshLabel loading={loading} />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {!analysis ? (
                    <p className="text-sm text-muted-foreground">
                        No failure analysis available — the job record contains no error text.
                    </p>
                ) : (
                    <>
                        <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Summary</div>
                            <p className="text-sm">{analysis.summary}</p>
                        </div>
                        <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Likely cause</div>
                            <p className="text-sm">{analysis.cause}</p>
                        </div>
                        {analysis.hints?.length > 0 && (
                            <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">Fix steps</div>
                                <ol className="text-sm space-y-1 list-decimal list-inside">
                                    {analysis.hints.map((hint, i) => (
                                        <li key={i}>{hint}</li>
                                    ))}
                                </ol>
                            </div>
                        )}
                        {analysis.related_file && (
                            <div className="flex items-center gap-2 text-sm">
                                <FileCode2 className="h-4 w-4 text-muted-foreground" />
                                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                                    {analysis.related_file}
                                </code>
                            </div>
                        )}
                    </>
                )}

                {report.related_files?.length ? (
                    <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Files mentioned in output</div>
                        <div className="flex flex-wrap gap-1.5">
                            {report.related_files.map((file, i) => (
                                <code
                                    key={i}
                                    className="rounded border px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                                >
                                    {file}
                                </code>
                            ))}
                        </div>
                    </div>
                ) : null}

                <p className="text-xs text-muted-foreground">
                    Analyzed in {formatDuration(report.duration_ms)} of run time · plugin {report.plugin || "—"}
                </p>
            </CardContent>
        </Card>
    );
}

function RefreshLabel({ loading }: { loading: boolean }) {
    if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;
    return <AlertTriangle className="h-4 w-4" />;
}
