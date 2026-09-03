import {
    dailyPassRate,
    durationDistribution,
    busyHours,
    pluginSuccess,
} from "@/lib/stats";
import { ActionRun } from "@/lib/types";

function run(overrides: Partial<ActionRun>): ActionRun {
    return {
        id: Math.random().toString(36).slice(2),
        repo: "r",
        action: "go-lint",
        plugin_name: "go-lint",
        status: "done",
        created_at: new Date().toISOString(),
        ...overrides,
    };
}

describe("dailyPassRate", () => {
    it("aggregates done/failed per day and computes the rate", () => {
        const today = new Date();
        const iso = (offsetDays: number) =>
            new Date(today.getFullYear(), today.getMonth(), today.getDate() - offsetDays, 12).toISOString();

        const series = dailyPassRate(
            [
                run({ status: "done", created_at: iso(0) }),
                run({ status: "done", created_at: iso(0) }),
                run({ status: "failed", created_at: iso(0) }),
                run({ status: "failed", created_at: iso(1) }),
                run({ status: "running", created_at: iso(0) }), // excluded from rate
            ],
            3,
        );

        expect(series).toHaveLength(3);
        const [day2, day1, day0] = series;
        expect(day2.total).toBe(0); // two days ago, nothing
        expect(day1.total).toBe(1);
        expect(day1.rate).toBe(0);
        expect(day0.total).toBe(3);
        expect(day0.passed).toBe(2);
        expect(day0.rate).toBe(67);
    });
});

describe("pluginSuccess", () => {
    it("groups by plugin, sorts by volume, caps the list", () => {
        const runs = [
            ...Array.from({ length: 3 }, () => run({ plugin_name: "a", action: "a", status: "done" })),
            run({ plugin_name: "a", action: "a", status: "failed" }),
            run({ plugin_name: "b", action: "b", status: "failed" }),
            run({ plugin_name: "b", action: "b", status: "running" }), // excluded
        ];
        const result = pluginSuccess(runs);
        expect(result[0]).toEqual({ plugin: "a", total: 4, passed: 3, rate: 75 });
        expect(result[1]).toEqual({ plugin: "b", total: 1, passed: 0, rate: 0 });
    });

    it("falls back to action when plugin_name is missing", () => {
        const result = pluginSuccess([run({ plugin_name: undefined, action: "legacy" })]);
        expect(result[0].plugin).toBe("legacy");
    });
});

describe("durationDistribution", () => {
    it("buckets finished runs and skips active ones", () => {
        const dist = durationDistribution([
            run({ duration_ms: 2_000 }),
            run({ duration_ms: 9_999 }),
            run({ duration_ms: 30_000 }),
            run({ duration_ms: 120_000 }),
            run({ duration_ms: 600_000 }),
            run({ duration_ms: 3_600_000 }),
            run({ duration_ms: 999_999, status: "running" }), // excluded
            run({ duration_ms: undefined }), // excluded
        ]);
        expect(dist.map((d) => d.count)).toEqual([2, 1, 1, 1, 1]);
    });
});

describe("busyHours", () => {
    it("counts runs per local hour using started_at when present", () => {
        const hours = busyHours([
            run({ started_at: "2026-08-20T10:05:00", created_at: "2026-08-20T09:00:00" }),
            run({ started_at: "2026-08-19T10:59:00" }),
            run({ created_at: "2026-08-20T23:30:00" }),
        ]);
        expect(hours).toHaveLength(24);
        // Local timezone: the exact hours depend on TZ, so assert via the same parser.
        const localHour = (iso: string) => new Date(iso).getHours();
        expect(hours[localHour("2026-08-20T10:05:00")].count).toBe(2);
        expect(hours[localHour("2026-08-20T23:30:00")].count).toBe(1);
        expect(hours.reduce((sum, h) => sum + h.count, 0)).toBe(3);
    });
});
