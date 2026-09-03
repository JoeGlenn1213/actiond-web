"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    PlayCircle,
    Puzzle,
    Settings,
    Terminal,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import {
    startHealthPolling,
    stopHealthPolling,
    startLghPolling,
    stopLghPolling,
    useActiondHealth,
    useLghHealth,
} from "@/lib/use-health";

const navItems = [
    {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
    },
    {
        title: "Actions",
        href: "/actions",
        icon: PlayCircle,
    },
    {
        title: "Plugins",
        href: "/plugins",
        icon: Puzzle,
    },
    {
        title: "Settings",
        href: "/settings",
        icon: Settings,
    },
];

export function AppSidebar({ open, onNavigate }: { open?: boolean; onNavigate?: () => void }) {
    const pathname = usePathname();
    const health = useActiondHealth();
    const lgh = useLghHealth();

    // The sidebar is always mounted, so it owns the shared health polling.
    useEffect(() => {
        startHealthPolling();
        startLghPolling();
        return () => {
            stopHealthPolling();
            stopLghPolling();
        };
    }, []);

    const online = health.status === "online";

    return (
        <div
            className={cn(
                "fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r bg-muted/10 transition-transform duration-200 lg:static lg:translate-x-0",
                open ? "translate-x-0" : "-translate-x-full",
            )}
            aria-label="Main navigation"
        >
            <div className="flex h-14 items-center border-b px-4">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <Terminal className="h-5 w-5" />
                    <span>ActionD</span>
                </Link>
            </div>
            <div className="flex-1 overflow-auto py-4">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onNavigate}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                    isActive
                                        ? "bg-muted text-primary"
                                        : "text-muted-foreground"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="border-t p-4">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <div
                            className="flex items-center gap-2"
                            data-testid="actiond-health"
                            title={health.error ?? undefined}
                        >
                            <div
                                className={cn(
                                    "h-2 w-2 rounded-full",
                                    online && "bg-green-500 animate-pulse",
                                    health.status === "checking" && "bg-yellow-500 animate-pulse",
                                    health.status === "offline" && "bg-red-500",
                                )}
                            />
                            <span>
                                {online && "ActionD Online"}
                                {health.status === "checking" && "Checking ActionD…"}
                                {health.status === "offline" && "ActionD Offline"}
                            </span>
                        </div>
                        {lgh !== "unknown" && (
                            <div className="flex items-center gap-2" data-testid="lgh-health">
                                <div
                                    className={cn(
                                        "h-2 w-2 rounded-full",
                                        lgh === "online" && "bg-green-500",
                                        lgh === "checking" && "bg-yellow-500 animate-pulse",
                                        lgh === "offline" && "bg-red-500",
                                    )}
                                />
                                <span>
                                    {lgh === "online" && "LGH Online"}
                                    {lgh === "checking" && "Checking LGH…"}
                                    {lgh === "offline" && "LGH Offline"}
                                </span>
                            </div>
                        )}
                    </div>
                    <ModeToggle />
                </div>
            </div>
        </div>
    );
}
