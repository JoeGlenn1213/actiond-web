"use client";

import { useMemo } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3, Clock, Hourglass } from "lucide-react";
import { ActionRun } from "@/lib/types";
import {
    busyHours,
    dailyPassRate,
    durationDistribution,
    pluginSuccess,
} from "@/lib/stats";

// Colors resolve through the chart tokens in globals.css (light + dark sets).
const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const AXIS_COLOR = "var(--muted-foreground)";
const GRID_COLOR = "var(--border)";

const tooltipStyle = {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
    fontSize: 12,
};

function EmptyChart({ label }: { label: string }) {
    return (
        <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
            No data yet — {label}
        </div>
    );
}

export function DashboardCharts({ runs }: { runs: ActionRun[] }) {
    const passRate = useMemo(() => dailyPassRate(runs), [runs]);
    const pluginRates = useMemo(() => pluginSuccess(runs), [runs]);
    const durations = useMemo(() => durationDistribution(runs), [runs]);
    const hours = useMemo(() => busyHours(runs), [runs]);

    const hasFinished = passRate.some((d) => d.total > 0);
    const hourData = useMemo(
        () => hours.map((h) => ({ hour: `${String(h.hour).padStart(2, "0")}`, count: h.count })),
        [hours],
    );

    return (
        <div className="grid gap-4 md:grid-cols-2" data-testid="dashboard-charts">
            {/* Pass rate trend */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        Pass Rate — last 14 days
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {hasFinished ? (
                        <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={passRate} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                                    <defs>
                                        <linearGradient id="passRateFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} />
                                            <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={{ stroke: GRID_COLOR }}
                                        interval="preserveStartEnd"
                                        minTickGap={24}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v: number) => `${v}%`}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(value) => [`${value ?? 0}%`, "Pass rate"]}
                                        labelFormatter={(label) => {
                                            const day = passRate.find((d) => d.label === String(label));
                                            return day ? `${label} · ${day.passed}/${day.total} passed` : label;
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="rate"
                                        stroke={CHART_COLORS[0]}
                                        strokeWidth={2}
                                        fill="url(#passRateFill)"
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart label="no finished runs" />
                    )}
                </CardContent>
            </Card>

            {/* Per-plugin success rate */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        Success Rate by Plugin
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {pluginRates.length > 0 ? (
                        <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pluginRates} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
                                    <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        domain={[0, 100]}
                                        tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={{ stroke: GRID_COLOR }}
                                        tickFormatter={(v: number) => `${v}%`}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="plugin"
                                        width={110}
                                        tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(_value, _name, item) => {
                                            const { passed, total, rate } = item.payload;
                                            return [`${rate}% (${passed}/${total})`, "Success"];
                                        }}
                                    />
                                    <Bar dataKey="rate" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                                        {pluginRates.map((entry) => (
                                            <Cell
                                                key={entry.plugin}
                                                fill={entry.rate >= 80 ? CHART_COLORS[0] : entry.rate >= 50 ? CHART_COLORS[4] : CHART_COLORS[1]}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart label="no finished runs" />
                    )}
                </CardContent>
            </Card>

            {/* Duration distribution */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Hourglass className="h-4 w-4 text-muted-foreground" />
                        Run Duration Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {durations.some((d) => d.count > 0) ? (
                        <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={durations} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                                    <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="bucket"
                                        tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={{ stroke: GRID_COLOR }}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value ?? 0, "Runs"]} />
                                    <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart label="no finished runs" />
                    )}
                </CardContent>
            </Card>

            {/* Busy hours */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Runs by Hour of Day
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {hourData.some((h) => h.count > 0) ? (
                        <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                                    <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="hour"
                                        tick={{ fill: AXIS_COLOR, fontSize: 10 }}
                                        tickLine={false}
                                        axisLine={{ stroke: GRID_COLOR }}
                                        interval={2}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value ?? 0, "Runs"]} />
                                    <Bar dataKey="count" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart label="no runs recorded" />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
