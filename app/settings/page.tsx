"use client";

import { useEffect, useState } from "react";
import { Info, Database, Folder, Gauge, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { apiLabel } from "@/lib/api-base";
import { getProfile, setProfile } from "@/lib/api";
import type { ActionProfile } from "@/lib/types";
import { version } from "@/lib/app-version";
import { toast } from "sonner";

const PROFILE_OPTIONS: { value: ActionProfile; label: string; hint: string }[] = [
    { value: "fast", label: "Fast", hint: "Quick feedback — minimal steps per action" },
    { value: "full", label: "Full", hint: "Complete runs — every step executes" },
    { value: "release", label: "Release", hint: "Release gates — strictest checks" },
];

export default function SettingsPage() {
    const [profile, setProfileState] = useState<ActionProfile | null>(null);
    const [savedProfile, setSavedProfile] = useState<ActionProfile | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getProfile()
            .then(({ profile }) => {
                setProfileState(profile);
                setSavedProfile(profile);
            })
            .catch((err) => toast.error(`Failed to load profile: ${(err as Error).message}`));
    }, []);

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        try {
            const { profile: updated } = await setProfile(profile);
            setSavedProfile(updated);
            setProfileState(updated);
            toast.success(`Profile switched to "${updated}"`);
        } catch (err) {
            toast.error(`Failed to switch profile: ${(err as Error).message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">ActionD configuration and status</p>
            </div>
            <Separator />

            <div className="grid gap-4">
                <Card data-testid="profile-card">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Gauge className="h-5 w-5" />
                            <CardTitle>Execution Profile</CardTitle>
                        </div>
                        <CardDescription>
                            How much work each action performs. Applies to new runs immediately
                            (persisted in the ActionD config).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Select
                                value={profile ?? undefined}
                                onValueChange={(v) => setProfileState(v as ActionProfile)}
                            >
                                <SelectTrigger className="w-[180px]" aria-label="Execution profile">
                                    <SelectValue placeholder={profile === null ? "Loading…" : "Profile"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {PROFILE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={handleSave}
                                disabled={saving || profile === null || profile === savedProfile}
                                data-testid="profile-save"
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : null}
                                Apply
                            </Button>
                        </div>
                        {profile && (
                            <p className="text-sm text-muted-foreground">
                                {PROFILE_OPTIONS.find((opt) => opt.value === profile)?.hint}
                                {savedProfile === profile ? " · active" : " · unsaved change"}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Info className="h-5 w-5" />
                            <CardTitle>System Information</CardTitle>
                        </div>
                        <CardDescription>Current version and build details</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-1">
                            <span className="text-sm font-medium text-muted-foreground">Version</span>
                            <span data-testid="app-version">v{version}</span>
                        </div>
                        <div className="grid gap-1">
                            <span className="text-sm font-medium text-muted-foreground">API Endpoint</span>
                            <span>{apiLabel()}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            <CardTitle>Storage</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-1">
                            <span className="text-sm font-medium text-muted-foreground">Artifact Storage</span>
                            <div className="flex items-center gap-2">
                                <Folder className="h-4 w-4 text-orange-500" />
                                <code className="rounded bg-muted px-2 py-1">~/.localgithub/actions/</code>
                            </div>
                        </div>
                        <div className="grid gap-1">
                            <span className="text-sm font-medium text-muted-foreground">Job History</span>
                            <div className="flex items-center gap-2">
                                <Database className="h-4 w-4 text-blue-500" />
                                <span>SQLite + In-Memory (per-store backend)</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
