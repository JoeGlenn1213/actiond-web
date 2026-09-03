const RAW_BASE_URL = process.env.NEXT_PUBLIC_ACTIOND_BASE_URL?.trim() ?? "";

export function apiUrl(path: string): string {
    if (!RAW_BASE_URL) {
        return path;
    }
    const base = RAW_BASE_URL.endsWith("/") ? RAW_BASE_URL.slice(0, -1) : RAW_BASE_URL;
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalized}`;
}

export function apiLabel(): string {
    if (!RAW_BASE_URL) {
        return "Same origin (/api)";
    }
    return `${RAW_BASE_URL}/api`;
}
