"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickTestAnalysis } from "@/lib/types";
import { Zap, AlertTriangle, ListChecks, Clock } from "lucide-react";

interface DecisionCardProps {
    report: QuickTestAnalysis;
}

export function DecisionCard({ report }: DecisionCardProps) {
    const { decision, metrics, analysis } = report;
    const isHighRisk = analysis.riskAssessment.highRisk;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Run Mode</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold capitalize">{decision.runMode}</div>
                    <p className="text-xs text-muted-foreground">
                        {decision.runFullTests ? "Full test suite executed" : "Selective testing active"}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Risk Assessment</CardTitle>
                    <AlertTriangle className={`h-4 w-4 ${isHighRisk ? 'text-red-500' : 'text-green-500'}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{isHighRisk ? "High Risk" : "Normal"}</div>
                    <p className="text-xs text-muted-foreground">
                        {analysis.riskAssessment.reasons.length > 0
                            ? analysis.riskAssessment.reasons[0]
                            : "No high risk factors detected"}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tests Selected</CardTitle>
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {metrics.testsSelected} <span className="text-sm font-normal text-muted-foreground">/ {metrics.testsTotal || '?'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {decision.selectedTestsReason}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Analysis Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.analysisTimeMs}ms</div>
                    <p className="text-xs text-muted-foreground">
                        AST parsing & diffing
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
