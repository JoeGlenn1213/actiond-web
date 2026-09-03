"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QuickTestAnalysis } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";

interface TestSelectionTableProps {
    report: QuickTestAnalysis;
}

export function TestSelectionTable({ report }: TestSelectionTableProps) {
    const { tests } = report;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" /> Test Selection Plan
                </CardTitle>
                <CardDescription>
                    Executing {tests.length} tests based on AST analysis and dependency graph.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Test Class</TableHead>
                            <TableHead>Selection Reason</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tests.map((test, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="font-medium font-mono">{test.testClass}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="font-normal">
                                        {test.reason}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {tests.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                    No tests selected (or full suite will run).
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
