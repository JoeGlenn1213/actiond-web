import { parseArgs } from "@/lib/parse-args";

describe("parseArgs", () => {
    it("splits on whitespace and drops empties", () => {
        expect(parseArgs("  make   check  ")).toEqual(["make", "check"]);
        expect(parseArgs("")).toEqual([]);
        expect(parseArgs("   ")).toEqual([]);
    });

    it("keeps double-quoted groups together", () => {
        expect(parseArgs('run --msg "hello world" done')).toEqual([
            "run",
            "--msg",
            "hello world",
            "done",
        ]);
    });

    it("keeps single-quoted groups together", () => {
        expect(parseArgs("git commit -m 'fix: a b c'")).toEqual([
            "git",
            "commit",
            "-m",
            "fix: a b c",
        ]);
    });

    it("escapes the next character with a backslash", () => {
        expect(parseArgs("a\\ b c")).toEqual(["a b", "c"]);
        // An escaped quote is literal — it does not start a quoted group and
        // the preceding space still separates tokens (shell behavior).
        expect(parseArgs('say \\"hi\\"')).toEqual(["say", '"hi"']);
    });

    it("produces an empty-string token for bare quotes", () => {
        expect(parseArgs('a "" b')).toEqual(["a", "", "b"]);
    });

    it("handles adjacent quoted and bare parts", () => {
        expect(parseArgs('pre"mid dle"post tail')).toEqual(["premid dlepost", "tail"]);
    });
});
