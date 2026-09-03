"use client";

import { AlertTriangle } from "lucide-react";
import { useActiondHealth } from "@/lib/use-health";
import { apiLabel } from "@/lib/api-base";

/**
 * Page-level banner shown when the shared health probe cannot reach ActionD.
 */
export function ConnectionBanner() {
    const health = useActiondHealth();
    if (health.status !== "offline") return null;

    return (
        <div
            className="flex items-center gap-2 rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
            data-testid="connection-banner"
        >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
                Cannot reach ActionD at {apiLabel()}. Live updates are paused —
                data shown may be stale.
            </span>
        </div>
    );
}
