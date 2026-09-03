"use client"

import * as React from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

const ORDER = ["light", "dark", "system"] as const
type Theme = (typeof ORDER)[number]

const LABELS: Record<Theme, string> = {
    light: "Light",
    dark: "Dark",
    system: "System",
}

/**
 * Cycles light → dark → system. The third state matters: without it a manual
 * switch could never return to following the OS preference.
 */
export function ModeToggle() {
    const { theme, setTheme } = useTheme()

    const cycle = React.useCallback(() => {
        const current = ORDER.includes(theme as Theme) ? (theme as Theme) : "system"
        const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]
        setTheme(next)
    }, [theme, setTheme])

    // Avoid hydration mismatch by waiting for mount.
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => setMounted(true), [])

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" disabled>
                <Sun className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        )
    }

    const current: Theme = ORDER.includes(theme as Theme) ? (theme as Theme) : "system"
    const title = `Theme: ${LABELS[current]} — click to switch`

    return (
        <Button variant="ghost" size="icon" onClick={cycle} title={title} data-testid="mode-toggle">
            {current === "light" && <Sun className="h-[1.2rem] w-[1.2rem]" />}
            {current === "dark" && <Moon className="h-[1.2rem] w-[1.2rem]" />}
            {current === "system" && <Monitor className="h-[1.2rem] w-[1.2rem]" />}
            <span className="sr-only">{title}</span>
        </Button>
    )
}
