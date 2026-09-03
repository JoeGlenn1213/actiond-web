// Client-side aggregations for the dashboard charts. Pure functions over
// ActionRun[] so they can be unit-tested without any UI.

import { ActionRun } from "./types";

export interface DailyPassRate {
    date: string; // YYYY-MM-DD (local)
    label: string; // MM-DD
    total: number; // finished runs (done + failed)
    passed: number;
    failed: number;
    rate: number; // 0-100, null-safe (0 when no finished runs)
}

/** Pass rate per local day for the last `days` days (oldest first). */
export function dailyPassRate(runs: ActionRun[], days = 14): DailyPassRate[] {
    const byDay = new Map<string, { passed: number; failed: number }>();

    for (const run of runs) {
        if (run.status !== "done" && run.status !== "failed") continue;
        const date = localDateKey(run.created_at);
        const entry = byDay.get(date) ?? { passed: 0, failed: 0 };
        if (run.status === "done") entry.passed += 1;
        else entry.failed += 1;
        byDay.set(date, entry);
    }

    const out: DailyPassRate[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const date = dateKey(d);
        const { passed, failed } = byDay.get(date) ?? { passed: 0, failed: 0 };
        const total = passed + failed;
        out.push({
            date,
            label: `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
            total,
            passed,
            failed,
            rate: total > 0 ? Math.round((passed / total) * 100) : 0,
        });
    }
    return out;
}

export interface PluginSuccess {
    plugin: string;
    total: number;
    passed: number;
    rate: number; // 0-100
}

/** Success rate per plugin (finished runs only), busiest first. */
export function pluginSuccess(runs: ActionRun[], limit = 8): PluginSuccess[] {
    const byPlugin = new Map<string, { total: number; passed: number }>();
    for (const run of runs) {
        if (run.status !== "done" && run.status !== "failed") continue;
        const name = run.plugin_name || run.action;
        const entry = byPlugin.get(name) ?? { total: 0, passed: 0 };
        entry.total += 1;
        if (run.status === "done") entry.passed += 1;
        byPlugin.set(name, entry);
    }
    return Array.from(byPlugin.entries())
        .map(([plugin, { total, passed }]) => ({
            plugin,
            total,
            passed,
            rate: total > 0 ? Math.round((passed / total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
}

export const DURATION_BUCKETS = ["<10s", "10s–1m", "1–5m", "5–30m", ">30m"] as const;

export interface DurationDistribution {
    bucket: string;
    count: number;
}

/** Histogram of run durations (finished runs with a duration only). */
export function durationDistribution(runs: ActionRun[]): DurationDistribution[] {
    const counts = new Array(DURATION_BUCKETS.length).fill(0) as number[];
    for (const run of runs) {
        const ms = run.duration_ms;
        if (ms == null || run.status === "running" || run.status === "pending") continue;
        const seconds = ms / 1000;
        if (seconds < 10) counts[0] += 1;
        else if (seconds < 60) counts[1] += 1;
        else if (seconds < 300) counts[2] += 1;
        else if (seconds < 1800) counts[3] += 1;
        else counts[4] += 1;
    }
    return DURATION_BUCKETS.map((bucket, i) => ({ bucket, count: counts[i] }));
}

export interface BusyHours {
    hour: number; // 0-23 local
    count: number;
}

/** Run starts per local hour of day (all runs, any status). */
export function busyHours(runs: ActionRun[]): BusyHours[] {
    const counts = new Array(24).fill(0) as number[];
    for (const run of runs) {
        const t = run.started_at || run.created_at;
        const hour = new Date(t).getHours();
        if (Number.isFinite(hour)) counts[hour] += 1;
    }
    return counts.map((count, hour) => ({ hour, count }));
}

function localDateKey(iso: string): string {
    return dateKey(new Date(iso));
}

function dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
    ).padStart(2, "0")}`;
}
