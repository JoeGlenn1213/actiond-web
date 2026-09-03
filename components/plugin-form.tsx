"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PluginCreateRequest } from "@/lib/types";
import { parseArgs } from "@/lib/parse-args";

interface PluginFormProps {
    onSubmit: (plugin: PluginCreateRequest) => void;
    onCancel: () => void;
    initialData?: Partial<PluginCreateRequest>;
    isEdit?: boolean;
}

const SUGGESTED_TRIGGERS = ["git.push", "git.tag", "repo.added", "manual"];

export function PluginForm({ onSubmit, onCancel, initialData, isEdit }: PluginFormProps) {
    const [name, setName] = useState(initialData?.name || "");
    const [command, setCommand] = useState(initialData?.command || "python3");
    const [args, setArgs] = useState(initialData?.args?.join(" ") || "");
    const [triggers, setTriggers] = useState<string[]>(initialData?.triggers || ["git.push"]);
    const [customTrigger, setCustomTrigger] = useState("");
    const [languages, setLanguages] = useState(initialData?.languages?.join(", ") || "");
    const [timeout, setTimeout] = useState(initialData?.timeout || "5m");
    const [workingDir, setWorkingDir] = useState(initialData?.workingDir || "");
    const [refFilter, setRefFilter] = useState(initialData?.refFilter || "");
    const [repoFilter, setRepoFilter] = useState(initialData?.repoFilter || "");

    const toggleTrigger = (trigger: string) => {
        if (triggers.includes(trigger)) {
            setTriggers(triggers.filter(t => t !== trigger));
        } else {
            setTriggers([...triggers, trigger]);
        }
    };

    const addCustomTrigger = () => {
        const value = customTrigger.trim();
        if (value && !triggers.includes(value)) {
            setTriggers([...triggers, value]);
        }
        setCustomTrigger("");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name,
            command,
            // Shell-style parsing: quoted arguments stay together.
            args: parseArgs(args),
            triggers,
            languages: languages.split(",").map(lang => lang.trim()).filter(Boolean),
            timeout,
            workingDir,
            refFilter,
            repoFilter,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                        {isEdit ? "Edit Plugin" : "Add New Plugin"}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Plugin Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="my-plugin"
                            disabled={isEdit}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="command">Command</Label>
                        <Input
                            id="command"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            placeholder="python3"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="args">Arguments</Label>
                        <Input
                            id="args"
                            value={args}
                            onChange={(e) => setArgs(e.target.value)}
                            placeholder="run.py --message &quot;hello world&quot;"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Space-separated; quote arguments containing spaces.
                        </p>
                    </div>

                    <div>
                        <Label>Triggers</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {SUGGESTED_TRIGGERS.map(trigger => (
                                <Badge
                                    key={trigger}
                                    variant={triggers.includes(trigger) ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => toggleTrigger(trigger)}
                                >
                                    {trigger}
                                </Badge>
                            ))}
                            {triggers
                                .filter(t => !SUGGESTED_TRIGGERS.includes(t))
                                .map(trigger => (
                                    <Badge
                                        key={trigger}
                                        variant="default"
                                        className="cursor-pointer gap-1"
                                        onClick={() => toggleTrigger(trigger)}
                                        title="Click to remove"
                                    >
                                        {trigger}
                                        <X className="h-3 w-3" />
                                    </Badge>
                                ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                            <Input
                                value={customTrigger}
                                onChange={(e) => setCustomTrigger(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addCustomTrigger();
                                    }
                                }}
                                placeholder="Custom trigger (e.g. schedule.nightly)"
                                className="h-8 text-xs"
                                aria-label="Add custom trigger"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addCustomTrigger}
                                disabled={!customTrigger.trim()}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="languages">Languages</Label>
                            <Input
                                id="languages"
                                value={languages}
                                onChange={(e) => setLanguages(e.target.value)}
                                placeholder="web, typescript"
                            />
                        </div>
                        <div>
                            <Label htmlFor="timeout">Timeout</Label>
                            <Input
                                id="timeout"
                                value={timeout}
                                onChange={(e) => setTimeout(e.target.value)}
                                placeholder="5m"
                            />
                        </div>
                        <div>
                            <Label htmlFor="workingDir">Working Directory</Label>
                            <Input
                                id="workingDir"
                                value={workingDir}
                                onChange={(e) => setWorkingDir(e.target.value)}
                                placeholder="plugins/my-plugin"
                            />
                        </div>
                        <div>
                            <Label htmlFor="refFilter">Ref Filter</Label>
                            <Input
                                id="refFilter"
                                value={refFilter}
                                onChange={(e) => setRefFilter(e.target.value)}
                                placeholder="refs/tags/*"
                            />
                        </div>
                        <div>
                            <Label htmlFor="repoFilter">Repo Filter</Label>
                            <Input
                                id="repoFilter"
                                value={repoFilter}
                                onChange={(e) => setRepoFilter(e.target.value)}
                                placeholder="town-runtime.git"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {isEdit ? "Save Changes" : "Create Plugin"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
