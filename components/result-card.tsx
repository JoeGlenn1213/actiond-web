"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Boxes } from "lucide-react";
import { ActionResult } from "@/lib/types";

function resultStatusClass(status: string): string {
    switch (status) {
        case "success":
            return "border-green-500/60 text-green-600 dark:text-green-400";
        case "failure":
        case "error":
            return "border-red-500/60 text-red-600 dark:text-red-400";
        default:
            return "border-muted-foreground/40 text-muted-foreground";
    }
}

function Section({ title, items }: { title: string; items?: string[] }) {
    if (!items?.length) return null;
    return (
        <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">{title}</div>
            <ul className="text-sm space-y-1">
                {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * Generic renderer for the structured ActionResult written by plugins —
 * replaces the previous hints-only rendering and the java-quicktest
 * special-casing (that plugin keeps its dedicated Overview panel).
 */
export function ResultCard({ result }: { result: ActionResult }) {
    const metrics = Object.entries(result.metrics ?? {});

    return (
        <Card data-testid="result-card">
            <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <Boxes className="h-4 w-4" />
                    Result
                    <Badge variant="outline" className={resultStatusClass(result.status)}>
                        {result.status}
                    </Badge>
                    {result.decision && (
                        <Badge variant="secondary">{result.decision}</Badge>
                    )}
                    {result.failed_step && (
                        <Badge variant="outline" className="border-red-500/60 text-red-600 dark:text-red-400 font-mono text-xs">
                            failed: {result.failed_step}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {result.summary && <p className="text-sm">{result.summary}</p>}
                <Section title="Hints" items={result.hints} />
                <Section title="Signals" items={result.signals} />
                <Section title="Next actions" items={result.next_actions} />
                {metrics.length > 0 && (
                    <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Metrics</div>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                            {metrics.map(([key, value]) => (
                                <div key={key} className="flex items-baseline justify-between gap-2 border-b border-dashed py-0.5">
                                    <dt className="text-muted-foreground truncate">{key}</dt>
                                    <dd className="font-mono text-xs">{String(value)}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
