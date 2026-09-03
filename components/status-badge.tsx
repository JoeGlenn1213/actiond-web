"use client";

import {
    Activity,
    AlertTriangle,
    Ban,
    CheckCircle2,
    Clock,
    RefreshCw,
    ShieldQuestion,
    XCircle,
    type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for status presentation. Covers every backend status
 * (internal/job/job.go) plus the UI-only pseudo statuses (connecting/
 * streaming) previously handled by three divergent badge implementations.
 */

type Tone = "success" | "danger" | "warning" | "info" | "muted";

interface StatusConfig {
    label: string;
    tone: Tone;
    icon?: LucideIcon;
    pulse?: boolean;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
    // Backend statuses
    pending: { label: "Pending", tone: "muted", icon: Clock },
    queued: { label: "Queued", tone: "muted", icon: Clock },
    running: { label: "Running", tone: "info", icon: Activity, pulse: true },
    done: { label: "Done", tone: "success", icon: CheckCircle2 },
    failed: { label: "Failed", tone: "danger", icon: XCircle },
    cancelled: { label: "Cancelled", tone: "warning", icon: Ban },
    retrying: { label: "Retrying", tone: "info", icon: RefreshCw, pulse: true },
    blocked: { label: "Blocked", tone: "warning", icon: AlertTriangle },
    needs_approval: { label: "Needs Approval", tone: "warning", icon: ShieldQuestion },
    retryable: { label: "Retryable", tone: "warning", icon: RefreshCw },
    // UI-only pseudo statuses (detail page state machine / legacy aliases)
    connecting: { label: "Connecting…", tone: "warning", icon: Activity, pulse: true },
    streaming: { label: "Running", tone: "info", icon: Activity, pulse: true },
    completed: { label: "Completed", tone: "success", icon: CheckCircle2 },
    success: { label: "Completed", tone: "success", icon: CheckCircle2 },
    error: { label: "Failed", tone: "danger", icon: XCircle },
};

const TONE_CLASS: Record<Tone, string> = {
    success: "border-green-500/60 text-green-600 dark:text-green-400",
    danger: "border-red-500/60 text-red-600 dark:text-red-400",
    warning: "border-yellow-500/60 text-yellow-700 dark:text-yellow-400",
    info: "border-blue-500/60 text-blue-600 dark:text-blue-400",
    muted: "border-muted-foreground/40 text-muted-foreground",
};

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
    const key = status?.toLowerCase() ?? "";
    const config = STATUS_CONFIG[key] ?? { label: status || "Unknown", tone: "muted" as Tone };
    const Icon = config.icon;

    return (
        <Badge
            variant="outline"
            className={cn("flex w-fit gap-1", TONE_CLASS[config.tone], className)}
            data-status={key}
        >
            {Icon && <Icon className={cn("h-3 w-3", config.pulse && "animate-pulse")} />}
            {config.label}
        </Badge>
    );
}
