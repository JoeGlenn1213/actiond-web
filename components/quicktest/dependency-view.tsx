"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QuickTestAnalysis } from "@/lib/types";
import { ArrowRight, Box } from "lucide-react";

interface DependencyViewProps {
    report: QuickTestAnalysis;
}

export function DependencyView({ report }: DependencyViewProps) {
    const callers = report.analysis.dependencyExpansion.callers;
    const strategy = report.analysis.dependencyExpansion.strategy || "one-hop";

    if (!callers || callers.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Dependency Impact</CardTitle>
                    <CardDescription>No dependent components identified.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Dependency Impact</CardTitle>
                <CardDescription>
                    Strategy: <span className="font-mono text-xs bg-muted px-1 rounded">{strategy}</span>
                    {' • '}
                    Found {callers.length} dependent components
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {callers.map((caller, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-muted/30 rounded-md border text-sm">
                        <div className="flex items-center gap-2 font-medium">
                            <Box className="h-4 w-4 text-purple-500" />
                            {caller.className}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="text-muted-foreground text-xs italic">
                            {caller.reason}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
