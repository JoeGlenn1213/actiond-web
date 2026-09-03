"use client";

// Module-level ActionD health probe shared by the sidebar and page banners.
// The backend has no /api/health endpoint, so GET /api/plugins doubles as the
// ping (any 2xx means the server is up).

import { useSyncExternalStore } from "react";
import { apiUrl } from "@/lib/api-base";

export type HealthStatus = "checking" | "online" | "offline";

export interface HealthSnapshot {
    status: HealthStatus;
    error: string | null;
}

let status: HealthStatus = "checking";
let lastError: string | null = null;
let snapshot: HealthSnapshot = { status, error: null };
let timer: ReturnType<typeof setInterval> | null = null;

const listeners = new Set<() => void>();

function publish(next: HealthStatus, error: string | null) {
    if (status === next && lastError === error) return;
    status = next;
    lastError = error;
    snapshot = { status, error };
    listeners.forEach((listener) => listener());
}

async function probe() {
    try {
        // Prefer the dedicated health endpoint; fall back to /api/plugins
        // when running against a backend that predates /api/health.
        let res = await fetch(apiUrl("/api/health"));
        if (res.status === 404) {
            res = await fetch(apiUrl("/api/plugins"));
        }
        if (res.ok) {
            publish("online", null);
        } else {
            publish("offline", `HTTP ${res.status} ${res.statusText}`);
        }
    } catch (error) {
        publish("offline", (error as Error).message);
    }
}

/** Begin polling (idempotent). Call once from the always-mounted sidebar. */
export function startHealthPolling(intervalMs = 30_000) {
    if (timer) return;
    void probe();
    timer = setInterval(() => {
        if (document.visibilityState === "visible") {
            void probe();
        }
    }, intervalMs);
}

export function stopHealthPolling() {
    if (timer) clearInterval(timer);
    timer = null;
}

/** Reactive health snapshot for any client component. */
export function useActiondHealth(): HealthSnapshot {
    return useSyncExternalStore(
        (onChange) => {
            listeners.add(onChange);
            return () => listeners.delete(onChange);
        },
        () => snapshot,
        () => snapshot,
    );
}

// --- LGH connectivity (through the ActionD proxy) -------------------------

export type LghHealthStatus = "checking" | "online" | "offline" | "unknown";

let lghStatus: LghHealthStatus = "checking";
let lghSnapshotVal: LghHealthStatus = lghStatus;
let lghTimer: ReturnType<typeof setInterval> | null = null;
const lghListeners = new Set<() => void>();

function publishLgh(next: LghHealthStatus) {
    if (lghStatus === next) return;
    lghStatus = next;
    lghSnapshotVal = next;
    lghListeners.forEach((listener) => listener());
}

async function probeLgh() {
    try {
        const res = await fetch(apiUrl("/api/lgh/ping"));
        if (res.status === 404) {
            publishLgh("unknown"); // backend predates the proxy
            return;
        }
        const body = (await res.json().catch(() => null)) as { status?: string } | null;
        publishLgh(body?.status === "online" ? "online" : "offline");
    } catch {
        publishLgh("offline");
    }
}

/** Begin LGH polling (idempotent). No-op-safe on old backends (→ unknown). */
export function startLghPolling(intervalMs = 30_000) {
    if (lghTimer) return;
    void probeLgh();
    lghTimer = setInterval(() => {
        if (document.visibilityState === "visible") {
            void probeLgh();
        }
    }, intervalMs);
}

export function stopLghPolling() {
    if (lghTimer) clearInterval(lghTimer);
    lghTimer = null;
}

/** "unknown" means the backend has no /api/lgh proxy — hide the indicator. */
export function useLghHealth(): LghHealthStatus {
    return useSyncExternalStore(
        (onChange) => {
            lghListeners.add(onChange);
            return () => lghListeners.delete(onChange);
        },
        () => lghSnapshotVal,
        () => lghSnapshotVal,
    );
}
