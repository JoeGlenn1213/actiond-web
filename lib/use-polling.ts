"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `fn` immediately and then every `intervalMs` while the page is visible.
 * Ticks are skipped while the tab is hidden; one fires promptly on return.
 */
export function usePolling(fn: () => void | Promise<unknown>, intervalMs: number, enabled = true) {
    const fnRef = useRef(fn);

    // Keep the ref fresh without updating it during render.
    useEffect(() => {
        fnRef.current = fn;
    }, [fn]);

    useEffect(() => {
        if (!enabled) return;

        const id = setInterval(() => {
            if (document.visibilityState === "visible") {
                void fnRef.current();
            }
        }, intervalMs);

        const onVisibility = () => {
            if (document.visibilityState === "visible") {
                void fnRef.current();
            }
        };
        document.addEventListener("visibilitychange", onVisibility);

        void fnRef.current();

        return () => {
            clearInterval(id);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [intervalMs, enabled]);
}
