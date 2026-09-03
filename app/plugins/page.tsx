"use client";

import { startTransition, useEffect, useState } from "react";
import { AlertCircle, Package, Power, RefreshCcw, Terminal, PlayCircle, Plus, Pencil, Trash2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getPlugins, createPlugin, deletePlugin, reloadPlugins, togglePlugin, updatePlugin } from "@/lib/api";
import { Plugin, PluginCreateRequest } from "@/lib/types";
import { PluginForm } from "@/components/plugin-form";
import { toast } from "sonner";

export default function PluginsPage() {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [reloading, setReloading] = useState(false);

    const handleReload = async () => {
        setReloading(true);
        try {
            const result = await reloadPlugins();
            toast.success(`Plugins reloaded — ${result.count} loaded`);
            fetchData();
        } catch (err) {
            toast.error(`Reload failed: ${(err as Error).message}`);
        } finally {
            setReloading(false);
        }
    };

    const fetchData = async () => {
        try {
            const data = await getPlugins();
            startTransition(() => {
                setPlugins(data);
                setError(null);
            });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (plugin: PluginCreateRequest) => {
        try {
            await createPlugin(plugin);
            toast.success(`Plugin "${plugin.name}" created`);
            setShowForm(false);
            fetchData();
        } catch (err) {
            toast.error(`Failed to create plugin: ${(err as Error).message}`);
        }
    };

    const handleEdit = async (plugin: PluginCreateRequest) => {
        try {
            await updatePlugin(plugin.name, {
                triggers: plugin.triggers,
                languages: plugin.languages,
                command: plugin.command,
                args: plugin.args,
                timeout: plugin.timeout,
                workingDir: plugin.workingDir,
                filter: plugin.refFilter,
                repoFilter: plugin.repoFilter,
            });
            toast.success(`Plugin "${plugin.name}" updated`);
            setEditingPlugin(null);
            fetchData();
        } catch (err) {
            toast.error(`Failed to update plugin: ${(err as Error).message}`);
        }
    };

    const handleDelete = async (name: string) => {
        setDeleteTarget(null);
        try {
            await deletePlugin(name);
            toast.success(`Plugin "${name}" deleted`);
            fetchData();
        } catch (err) {
            toast.error(`Failed to delete plugin: ${(err as Error).message}`);
        }
    };

    const handleToggle = async (name: string, enabled: boolean) => {
        try {
            await togglePlugin(name, enabled);
        } catch (err) {
            toast.error(`Failed to toggle plugin: ${(err as Error).message}`);
        }
        fetchData();
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Plugin Management</h2>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleReload}
                        disabled={reloading}
                        data-testid="reload-plugins"
                    >
                        <RefreshCcw className={`h-4 w-4 mr-2 ${reloading ? "animate-spin" : ""}`} />
                        Reload
                    </Button>
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Plugin
                    </Button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setError(null)}
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Plugins</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{plugins.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <Power className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {plugins.filter((p) => p.enabled).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Built-in</CardTitle>
                        <Terminal className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {plugins.filter((p) => !p.isCustom).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custom</CardTitle>
                        <PlayCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {plugins.filter((p) => p.isCustom).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Installed Plugins</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow data-testid="plugins-table">
                                <TableHead className="w-[200px]">Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Triggers</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : (
                                plugins.map((plugin) => (
                                    <TableRow key={plugin.name} data-testid="plugin-row">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {plugin.type === "go" ? (
                                                    <Terminal className="h-4 w-4 text-blue-500" />
                                                ) : (
                                                    <PlayCircle className="h-4 w-4 text-orange-500" />
                                                )}
                                                <span>{plugin.name}</span>
                                                {plugin.isCustom && (
                                                    <Badge variant="outline" className="text-xs">custom</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{plugin.type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex gap-1 flex-wrap">
                                                    {plugin.triggers?.map((t) => (
                                                        <Badge key={t} variant="outline">
                                                            {t}
                                                        </Badge>
                                                    ))}
                                                </div>
                                                {plugin.languages && plugin.languages.length > 0 && (
                                                    <div className="flex gap-1 flex-wrap">
                                                        {plugin.languages.map((lang) => (
                                                            <Badge key={lang} variant="secondary">
                                                                {lang}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                                {plugin.filter && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Ref: {plugin.filter}
                                                    </span>
                                                )}
                                                {plugin.repoFilter && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Repo: {plugin.repoFilter}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={plugin.enabled}
                                                    onCheckedChange={(checked) => handleToggle(plugin.name, checked)}
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    {plugin.enabled ? "Active" : "Disabled"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setEditingPlugin(plugin)}
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                {plugin.isCustom && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeleteTarget(plugin.name)}
                                                        title="Delete"
                                                        className="text-red-500 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {showForm && (
                <PluginForm
                    onSubmit={handleCreate}
                    onCancel={() => setShowForm(false)}
                />
            )}

            {editingPlugin && (
                <PluginForm
                    onSubmit={handleEdit}
                    onCancel={() => setEditingPlugin(null)}
                    initialData={{
                        name: editingPlugin.name,
                        command: editingPlugin.command,
                        args: editingPlugin.args,
                        triggers: editingPlugin.triggers,
                        languages: editingPlugin.languages,
                        timeout: editingPlugin.timeout,
                        workingDir: editingPlugin.workingDir,
                        refFilter: editingPlugin.filter,
                        repoFilter: editingPlugin.repoFilter,
                    }}
                    isEdit
                />
            )}

            {/* Delete confirmation */}
            <AlertDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete plugin &ldquo;{deleteTarget}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The plugin will be removed from the config. Built-in plugins cannot be
                            deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => deleteTarget && handleDelete(deleteTarget)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
