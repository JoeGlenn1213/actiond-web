/**
 * Unit tests for the Phase 2 API surface: job detail, by-event grouping,
 * diagnose, approve and profile switching.
 */
import {
    getAction,
    getActionsByEvent,
    diagnoseAction,
    approveAction,
    getProfile,
    setProfile,
} from "@/lib/api";

function mockFetch(status: number, body?: unknown, text?: string) {
    return jest.fn(async () => ({
        ok: status >= 200 && status < 300,
        status,
        statusText: "Status",
        json: async () => body,
        text: async () => text ?? (body != null ? JSON.stringify(body) : ""),
    }) as unknown as typeof fetch) as jest.Mock;
}

describe("getAction", () => {
    it("fetches a single job", async () => {
        const fetchMock = mockFetch(200, { id: "job-1", status: "running", repo: "r", action: "a", created_at: "2026-08-20T10:00:00Z" });
        global.fetch = fetchMock;

        const job = await getAction("job-1");
        expect(job.id).toBe("job-1");
        expect(fetchMock.mock.calls[0][0]).toBe("/api/actions/job-1");
    });

    it("propagates 404 as an error", async () => {
        global.fetch = mockFetch(404, undefined, "Job not found");
        await expect(getAction("missing")).rejects.toThrow("Job not found");
    });
});

describe("getActionsByEvent", () => {
    it("requests the event grouping endpoint", async () => {
        const fetchMock = mockFetch(200, []);
        global.fetch = fetchMock;

        await getActionsByEvent("evt-42");
        expect(fetchMock.mock.calls[0][0]).toBe("/api/actions/by-event/evt-42");
    });

    it("surfaces the empty-event_id validation error", async () => {
        global.fetch = mockFetch(400, undefined, "event_id required");
        await expect(getActionsByEvent(" ")).rejects.toThrow("event_id required");
    });
});

describe("diagnoseAction", () => {
    it("returns the structured report with analysis", async () => {
        const report = {
            job_id: "job-9",
            plugin: "go-lint",
            repo: "r",
            status: "failed",
            duration_ms: 5_000,
            error_summary: "build failed",
            analysis: {
                category: "build",
                type: "go_build_failed",
                summary: "Compilation failed",
                cause: "Undefined variable",
                hints: ["Run go vet"],
                severity: "critical",
            },
            related_files: ["main.go:42"],
        };
        global.fetch = mockFetch(200, report);

        const result = await diagnoseAction("job-9");
        expect(result.analysis?.category).toBe("build");
        expect(result.related_files).toEqual(["main.go:42"]);
    });

    it("handles a null analysis (no error text)", async () => {
        global.fetch = mockFetch(200, { job_id: "job-9", analysis: null });
        const result = await diagnoseAction("job-9");
        expect(result.analysis).toBeNull();
    });
});

describe("approveAction", () => {
    it("POSTs without a body and returns the success payload", async () => {
        const fetchMock = mockFetch(200, { status: "success", message: "Job approved", job_id: "job-1" });
        global.fetch = fetchMock;

        const result = await approveAction("job-1");

        expect(result.message).toBe("Job approved");
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/actions/job-1/approve");
        expect(init.method).toBe("POST");
        expect(init.body).toBeUndefined(); // backend reads no body
    });

    it("surfaces the missing-artifact-dir 404", async () => {
        global.fetch = mockFetch(404, undefined, "Job artifact directory not found");
        await expect(approveAction("job-1")).rejects.toThrow("Job artifact directory not found");
    });
});

describe("profile", () => {
    it("reads the current profile", async () => {
        global.fetch = mockFetch(200, { profile: "fast" });
        await expect(getProfile()).resolves.toEqual({ profile: "fast" });
    });

    it("switches the profile with a JSON body", async () => {
        const fetchMock = mockFetch(200, { profile: "full", status: "updated" });
        global.fetch = fetchMock;

        await expect(setProfile("full")).resolves.toEqual({ profile: "full", status: "updated" });

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/profile");
        expect(init.method).toBe("POST");
        expect(JSON.parse(init.body)).toEqual({ profile: "full" });
    });

    it("propagates the invalid-profile 400", async () => {
        global.fetch = mockFetch(400, undefined, "invalid profile, must be one of: fast, full, release");
        await expect(setProfile("turbo" as never)).rejects.toThrow(/invalid profile/);
    });
});
