import { apiUrl } from "@/lib/api-base";

describe("apiUrl (no base URL configured)", () => {
    it("returns the path unchanged for relative paths", () => {
        expect(apiUrl("/api/actions")).toBe("/api/actions");
    });

    it("returns relative paths unchanged when no leading slash (base-URL branch normalizes)", () => {
        expect(apiUrl("api/actions")).toBe("api/actions");
    });
});

describe("apiUrl with NEXT_PUBLIC_ACTIOND_BASE_URL", () => {
    afterEach(() => {
        jest.resetModules();
        delete process.env.NEXT_PUBLIC_ACTIOND_BASE_URL;
    });

    function loadWithBase(base: string) {
        process.env.NEXT_PUBLIC_ACTIOND_BASE_URL = base;
        jest.resetModules();
        // Re-required so the module-level constant picks up the env var.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require("@/lib/api-base") as typeof import("@/lib/api-base");
    }

    it("prefixes the base URL and strips its trailing slash", () => {
        const { apiUrl } = loadWithBase("http://localhost:3000/");
        expect(apiUrl("/api/actions")).toBe("http://localhost:3000/api/actions");
    });

    it("does not double the slash when base has none", () => {
        const { apiUrl } = loadWithBase("http://localhost:3000");
        expect(apiUrl("/api/plugins")).toBe("http://localhost:3000/api/plugins");
    });

    it("labels the endpoint accordingly", () => {
        const { apiLabel } = loadWithBase("http://localhost:3000");
        expect(apiLabel()).toBe("http://localhost:3000/api");
    });
});
