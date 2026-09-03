"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Clock,
  PlayCircle,
  Activity,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { ConnectionBanner } from "@/components/connection-banner";
import { DashboardCharts } from "@/components/dashboard-charts";

import { getActions, getPlugins } from "@/lib/api";
import { ActionRun, Plugin } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";
import { useActiondHealth } from "@/lib/use-health";

export default function Dashboard() {
  const router = useRouter();
  const [actions, setActions] = useState<ActionRun[]>([]);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const health = useActiondHealth();

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [actionsData, pluginsData] = await Promise.all([
        getActions(),
        getPlugins(),
      ]);
      setActions(actionsData);
      setPlugins(pluginsData);
      setError(null);
    } catch (err) {
      if (!silent) setError((err as Error).message);
    } finally {
      // Always clear: the initial load happens through a silent poll tick.
      setLoading(false);
    }
  }, []);

  // Immediate fetch + 5s refresh while the tab is visible.
  usePolling(() => fetchData(true), 5_000);

  const runningCount = actions.filter((a) => a.status === "running").length;
  const activePlugins = plugins.filter((p) => p.enabled).length;
  const totalActions = actions.length;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <ConnectionBanner />
      {error && health.status !== "offline" && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load dashboard data: {error}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-running">{runningCount}</div>
            <p className="text-xs text-muted-foreground">
              {runningCount > 0 ? "System is active" : "Idle"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">{totalActions}</div>
            <p className="text-xs text-muted-foreground">
              Across all plugins
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plugins</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-plugins">{activePlugins}</div>
            <p className="text-xs text-muted-foreground">
              {plugins.length} installed
            </p>
          </CardContent>
        </Card>
      </div>

      <DashboardCharts runs={actions} />

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Repo</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Plugin</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : actions.length === 0 && !error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No actions yet — trigger a push or create a manual run.
                    </TableCell>
                  </TableRow>
                ) : (
                  actions.map((run) => (
                    <TableRow
                      key={run.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/actions/${run.id}`)}
                    >
                      <TableCell>
                        <StatusBadge status={run.status} />
                      </TableCell>
                      <TableCell className="font-medium">{run.repo}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{run.event_type || run.trigger_reason || run.action}</Badge>
                      </TableCell>
                      <TableCell>{run.plugin_name || run.action}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {run.progress || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Date(run.started_at || run.created_at).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
