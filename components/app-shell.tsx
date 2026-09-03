"use client";

import { useEffect, useState } from "react";
import { Menu, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/app-sidebar";

/**
 * Layout shell: fixed sidebar on lg+, slide-in drawer with overlay on
 * smaller screens (Escape or overlay click closes, links navigate and close).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    return (
        <div className="flex h-screen overflow-hidden">
            {open && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => setOpen(false)}
                    aria-hidden
                />
            )}
            <AppSidebar open={open} onNavigate={() => setOpen(false)} />
            <main className="flex-1 overflow-y-auto bg-background">
                {/* Mobile top bar */}
                <div className="flex h-12 items-center gap-2 border-b px-3 lg:hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpen(true)}
                        aria-label="Open navigation"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                    <span className="flex items-center gap-2 text-sm font-semibold">
                        <Terminal className="h-4 w-4" />
                        ActionD
                    </span>
                </div>
                {children}
            </main>
        </div>
    );
}
