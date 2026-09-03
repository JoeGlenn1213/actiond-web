"use client";

import { useEffect, useState } from "react";
import { QuickTestAnalysis } from "@/lib/types";
import { DecisionCard } from "./decision-card";
import { ChangeSummary } from "./change-summary";
import { DependencyView } from "./dependency-view";
import { TestSelectionTable } from "./test-selection-table";
import { Loader2, AlertCircle } from "lucide-react";
import { apiUrl } from "@/lib/api-base";

interface QuickTestPanelProps {
    actionId: string;
}

export function QuickTestPanel({ actionId }: QuickTestPanelProps) {
    const [report, setReport] = useState<QuickTestAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchReport() {
            try {
                const res = await fetch(apiUrl(`/api/actions/${actionId}/artifacts/quicktest-analysis.json`));
                if (!res.ok) {
                    if (res.status === 404) {
                        setLoading(false); // No report yet
                        return;
                    }
                    throw new Error("Failed to fetch analysis report");
                }
                const data = await res.json();
                setReport(data);
            } catch (err) {
                console.error(err);
                setError("Could not load QuickTest analysis data");
            } finally {
                setLoading(false);
            }
        }

        fetchReport();
    }, [actionId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading QuickTest Analysis...
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                <AlertCircle className="h-5 w-5" />
                <div>
                    <h4 className="font-medium">Analysis Not Available</h4>
                    <p className="text-sm opacity-90">
                        QuickTest analysis data is not available for this run yet.
                        It might still be running or failed to generate the report.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold tracking-tight">QuickTest Analysis</h3>

            <DecisionCard report={report} />

            <div className="grid gap-6 md:grid-cols-2">
                <ChangeSummary report={report} />
                <DependencyView report={report} />
            </div>

            <TestSelectionTable report={report} />
        </div>
    );
}
