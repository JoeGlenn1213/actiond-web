"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QuickTestAnalysis } from "@/lib/types";
import { FileCode, Plus, Minus, Edit2 } from "lucide-react";

interface ChangeSummaryProps {
    report: QuickTestAnalysis;
}

export function ChangeSummary({ report }: ChangeSummaryProps) {
    const { changeSummary } = report;

    if (changeSummary.changedClasses.length === 0 && changeSummary.changedFiles.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Change Summary</CardTitle>
                    <CardDescription>No significant code changes detected.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Change Summary</CardTitle>
                <CardDescription>
                    {changeSummary.changedFiles.length} files changed, {changeSummary.changedClasses.length} classes analyzed
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {changeSummary.changedClasses.map((cls, idx) => (
                    <div key={idx} className="border rounded-md p-3 space-y-2">
                        <div className="flex items-center gap-2 font-semibold">
                            <FileCode className="h-4 w-4 text-blue-500" />
                            <span>{cls.className}</span>
                            <span className="text-xs font-normal text-muted-foreground ml-auto px-2 py-0.5 rounded-full bg-muted border">
                                {cls.changeType}
                            </span>
                        </div>

                        {/* Added Methods */}
                        {cls.details.methodsAdded.length > 0 && (
                            <div className="pl-6 space-y-1">
                                {cls.details.methodsAdded.map(m => (
                                    <div key={m} className="text-xs flex items-center gap-1 text-green-600 dark:text-green-400">
                                        <Plus className="h-3 w-3" /> {m}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Modified Methods */}
                        {cls.details.methodsModified.length > 0 && (
                            <div className="pl-6 space-y-1">
                                {cls.details.methodsModified.map(m => (
                                    <div key={m} className="text-xs flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                                        <Edit2 className="h-3 w-3" /> {m}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Removed Methods */}
                        {cls.details.methodsRemoved.length > 0 && (
                            <div className="pl-6 space-y-1">
                                {cls.details.methodsRemoved.map(m => (
                                    <div key={m} className="text-xs flex items-center gap-1 text-red-600 dark:text-red-400">
                                        <Minus className="h-3 w-3" /> {m}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* Fallback for non-class changes */}
                {changeSummary.changedClasses.length === 0 && changeSummary.changedFiles.map((f, i) => (
                    <div key={i} className="text-sm text-muted-foreground pl-2">
                        • {f}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
