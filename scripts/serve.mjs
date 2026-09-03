// Minimal static file server for the static export in ./out.
// `next start` does not work with output: "export"; production serving is
// normally handled by ActionD's --web-dir flag — this script is for local
// preview of a built bundle (npm start) and for e2e tests. It mirrors
// ActionD's serving behavior, including the /actions/* SPA fallback.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "out");
const port = Number(process.env.PORT ?? 3001);

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".map": "application/json",
};

async function resolveFile(urlPath, acceptHeader = "text/html") {
    let filePath = join(root, normalize(urlPath));
    if (!filePath.startsWith(root)) return null; // path traversal

    let body = await readFile(filePath).catch(() => null);
    if (body) return { body, filePath };

    // Directory index (e.g. "/" or "/actions")
    const stats = await stat(filePath).catch(() => null);
    if (stats?.isDirectory()) {
        filePath = join(filePath, "index.html");
        body = await readFile(filePath).catch(() => null);
        if (body) return { body, filePath };
    }

    // Export-layout candidates (flat .html and directory index), mirroring
    // ActionD's --web-dir handler.
    for (const candidate of [join(root, urlPath, "index.html"), join(root, `${urlPath}.html`)]) {
        body = await readFile(candidate).catch(() => null);
        if (body) return { body, filePath: candidate };
    }

    // SPA fallback for dynamic routes (deploy.sh also drops flat placeholder
    // copies for the legacy ActionD fallback).
    for (const prefix of ["/actions/", "/events/"]) {
        if (urlPath.startsWith(prefix)) {
            const base = prefix.replaceAll("/", "").trim(); // "actions" | "events"
            for (const candidate of [
                join(root, base, "placeholder.html"),
                join(root, base, "placeholder", "index.html"),
            ]) {
                body = await readFile(candidate).catch(() => null);
                if (body) return { body, filePath: candidate };
            }
        }
    }

    // Generic SPA fallback: extensionless page paths accepting HTML get the
    // app shell (client router resolves or 404s the route).
    if (!extname(urlPath) && acceptHeader.includes("text/html")) {
        const candidate = join(root, "index.html");
        body = await readFile(candidate).catch(() => null);
        if (body) return { body, filePath: candidate };
    }
    return null;
}

createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const resolved = await resolveFile(decodeURIComponent(url.pathname), req.headers.accept ?? "");

    if (!resolved) {
        res.writeHead(404).end("Not found");
        return;
    }
    const type = MIME[extname(resolved.filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type }).end(resolved.body);
}).listen(port, () => {
    console.log(`Serving ${root} at http://localhost:${port}`);
});
