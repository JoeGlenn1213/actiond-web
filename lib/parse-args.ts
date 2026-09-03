/**
 * Shell-style argument splitting: whitespace-separated tokens with single-,
 * double-quote grouping and backslash escaping.
 *
 *   parseArgs('check --msg "hello world"')  → ['check', '--msg', 'hello world']
 *   parseArgs("a 'b c' d\\ e")              → ['a', 'b c', 'd e']
 */
export function parseArgs(input: string): string[] {
    const args: string[] = [];
    let current = "";
    let quote: '"' | "'" | null = null;
    let hasToken = false;

    for (let i = 0; i < input.length; i += 1) {
        const ch = input[i];

        if (quote) {
            if (ch === quote) {
                quote = null;
            } else {
                current += ch;
            }
        } else if (ch === '"' || ch === "'") {
            quote = ch;
            hasToken = true; // empty quotes still produce a token
        } else if (ch === "\\" && i + 1 < input.length) {
            current += input[++i];
            hasToken = true;
        } else if (/\s/.test(ch)) {
            if (hasToken || current) {
                args.push(current);
                current = "";
                hasToken = false;
            }
        } else {
            current += ch;
            hasToken = true;
        }
    }

    if (hasToken || current) args.push(current);
    return args;
}
