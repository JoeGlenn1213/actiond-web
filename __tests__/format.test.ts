import { formatDuration, shortCommit } from "@/lib/format";

describe("formatDuration", () => {
    it.each([
        [undefined, "—"],
        [null, "—"],
        [0, "0ms"],
        [450, "450ms"],
        [999, "999ms"],
        [1_500, "1.5s"],
        [59_900, "59.9s"],
        [60_000, "1m"],
        [90_000, "1m 30s"],
        [600_000, "10m"],
        [3_600_000, "1h"],
        [7_323_000, "2h 2m"],
    ])("formats %p ms as %p", (ms, expected) => {
        expect(formatDuration(ms as number | null | undefined)).toBe(expected);
    });
});

describe("shortCommit", () => {
    it("takes the first 7 chars", () => {
        expect(shortCommit("9af76e2c1b3d4e5f6a7b8c9d")).toBe("9af76e2");
    });

    it("passes through short hashes", () => {
        expect(shortCommit("abc")).toBe("abc");
    });

    it("returns null for missing hashes", () => {
        expect(shortCommit(undefined)).toBeNull();
        expect(shortCommit(null)).toBeNull();
        expect(shortCommit("")).toBeNull();
    });
});
