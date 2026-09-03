/**
 * Unit tests for the real API client (lib/api.ts).
 * global.fetch is mocked per test; assertions cover both the requests the
 * client makes and how responses / errors are surfaced to callers.
 */
import {
    getActions,
    getPlugins,
    createPlugin,
    updatePlugin,
    deletePlugin,
    togglePlugin,
} from "@/lib/api";
import { ActionRun, Plugin } from "@/lib/types";

type FetchCall = { input: RequestInfo | URL; init?: RequestInit };

function mockFetch(handler: (call: FetchCall) => { status: number; body?: unknown; text?: string }) {
    const calls: FetchCall[] = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const call = { input, init };
        calls.push(call);
        const { status, body, text } = handler(call);
        return {
            ok: status >= 200 && status < 300,
            status,
            statusText: "Status",
            json: async () => body,
            text: async () => text ?? (body != null ? JSON.stringify(body) : ""),
        } as unknown as Response;
    }) as unknown as typeof fetch;
    return calls;
}

const sampleRun: ActionRun = {
    id: "job-1",
    run_id: "run-2026-08-20-abc",
    event_id: "evt-42",
    repo: "JoeGlenn1213/ActionD",
    action: "go-lint",
    plugin_name: "go-lint",
    status: "done",
    created_at: "2026-08-20T10:00:00Z",
    duration_ms: 90_000,
    artifacts: ["report.json"],
    retry_count: 1,
    retry_of: "job-0",
};

describe("getActions", () => {
    it("returns backend rows as-is (keeps done, event_id, artifacts, retry fields)", async () => {
        const calls = mockFetch(() => ({ status: 200, body: [sampleRun] }));

        const runs = await getActions();

        expect(runs).toEqual([sampleRun]);
        expect(runs[0].status).toBe("done"); // no done→completed remapping
        expect(calls[0].input).toBe("/api/actions");
    });

    it("throws the backend plain-text message on non-2xx", async () => {
        mockFetch(() => ({ status: 500, text: "store failure" }));

        await expect(getActions()).rejects.toThrow("store failure");
    });

    it("throws a connection error when fetch rejects", async () => {
        global.fetch = jest.fn(async () => {
            throw new TypeError("fetch failed");
        }) as unknown as typeof fetch;

        await expect(getActions()).rejects.toThrow(/Cannot reach ActionD/);
    });
});

describe("getPlugins", () => {
    it("returns the plugin list", async () => {
        const plugins: Plugin[] = [
            { name: "go-lint", enabled: true, type: "go", triggers: ["git.push"] },
        ];
        mockFetch(() => ({ status: 200, body: plugins }));

        await expect(getPlugins()).resolves.toEqual(plugins);
    });

    it("surfaces backend errors instead of swallowing them", async () => {
        mockFetch(() => ({ status: 503, text: "unavailable" }));

        await expect(getPlugins()).rejects.toThrow("unavailable");
    });
});

describe("createPlugin", () => {
    it("POSTs the plugin payload as JSON", async () => {
        const calls = mockFetch(() => ({
            status: 201,
            body: { status: "created", name: "my-tool" },
        }));

        const result = await createPlugin({
            name: "my-tool",
            command: "make",
            args: ["check"],
            triggers: ["git.push"],
        });

        expect(result).toEqual({ status: "created", name: "my-tool" });
        expect(calls[0].input).toBe("/api/plugins");
        expect(calls[0].init?.method).toBe("POST");
        expect(new Headers(calls[0].init?.headers).get("Content-Type")).toBe("application/json");
        expect(JSON.parse(calls[0].init?.body as string)).toEqual({
            name: "my-tool",
            command: "make",
            args: ["check"],
            triggers: ["git.push"],
        });
    });
});

describe("updatePlugin", () => {
    it("PUTs the config and maps filter → refFilter", async () => {
        const calls = mockFetch(() => ({ status: 200, body: { status: "updated", name: "go-lint" } }));

        await updatePlugin("go-lint", { enabled: true, filter: "tags/*" });

        expect(calls[0].input).toBe("/api/plugins/go-lint");
        expect(calls[0].init?.method).toBe("PUT");
        const payload = JSON.parse(calls[0].init?.body as string);
        expect(payload).toEqual({ enabled: true, refFilter: "tags/*" });
    });

    it("rejects (instead of returning false) when the backend refuses", async () => {
        mockFetch(() => ({ status: 400, text: "Cannot modify built-in plugin fields" }));

        await expect(updatePlugin("go-lint", { command: "x" })).rejects.toThrow(
            "Cannot modify built-in plugin fields",
        );
    });
});

describe("deletePlugin", () => {
    it("sends DELETE and rejects on built-in protection", async () => {
        const calls = mockFetch(() => ({ status: 400, text: "Cannot delete built-in plugin" }));

        await expect(deletePlugin("echo")).rejects.toThrow("Cannot delete built-in plugin");
        expect(calls[0].init?.method).toBe("DELETE");
    });
});

describe("togglePlugin", () => {
    it("POSTs the enabled state", async () => {
        const calls = mockFetch(() => ({
            status: 200,
            body: { status: "toggled", name: "go-lint", enabled: false },
        }));

        await togglePlugin("go-lint", false);

        expect(calls[0].input).toBe("/api/plugins/go-lint/toggle");
        expect(calls[0].init?.method).toBe("POST");
        expect(JSON.parse(calls[0].init?.body as string)).toEqual({ enabled: false });
    });
});
