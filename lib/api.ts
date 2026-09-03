import { apiUrl } from './api-base';
import {
    ActionProfile,
    ActionRun,
    CommitStatusReport,
    DiagnoseReport,
    Plugin,
    PluginCreateRequest,
} from './types';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

/**
 * Single fetch entry point: always goes through apiUrl() (honors
 * NEXT_PUBLIC_ACTIOND_BASE_URL) and turns failures into thrown Errors
 * carrying the backend message, so callers can surface them in the UI.
 */
async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
        res = await fetch(apiUrl(path), init);
    } catch (error) {
        throw new Error(`Cannot reach ActionD at ${apiUrl(path)}: ${(error as Error).message}`);
    }
    if (!res.ok) {
        // Backend errors are plain text (http.Error in internal/server).
        const body = await res.text().catch(() => '');
        throw new Error(body.trim() || `HTTP ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
}

/** List recent action runs (backend returns ActionJob[] as-is). */
export function getActions(): Promise<ActionRun[]> {
    return apiRequest<ActionRun[]>('/api/actions');
}

/** Job detail. */
export function getAction(id: string): Promise<ActionRun> {
    return apiRequest<ActionRun>(`/api/actions/${encodeURIComponent(id)}`);
}

/** All jobs triggered by one event (one push/tag), newest first. */
export function getActionsByEvent(eventId: string): Promise<ActionRun[]> {
    return apiRequest<ActionRun[]>(`/api/actions/by-event/${encodeURIComponent(eventId)}`);
}

/** Structured failure analysis for a job. */
export function diagnoseAction(id: string): Promise<DiagnoseReport> {
    return apiRequest<DiagnoseReport>(`/api/actions/${encodeURIComponent(id)}/diagnose`);
}

/**
 * Approve a needs_approval job (writes approval-status.json; the worker picks
 * it up). Requires the job to have an artifact directory (404 otherwise).
 * The backend supports approval only — there is no reject endpoint.
 */
export function approveAction(id: string): Promise<{ status: string; message: string; job_id: string }> {
    return apiRequest<{ status: string; message: string; job_id: string }>(
        `/api/actions/${encodeURIComponent(id)}/approve`,
        { method: 'POST' },
    );
}

/** Current execution profile. */
export function getProfile(): Promise<{ profile: ActionProfile }> {
    return apiRequest<{ profile: ActionProfile }>('/api/profile');
}

/** Switch execution profile (fast | full | release). */
export function setProfile(profile: ActionProfile): Promise<{ profile: ActionProfile; status: string }> {
    return apiRequest<{ profile: ActionProfile; status: string }>('/api/profile', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ profile }),
    });
}

/** Hot-reload plugin definitions on the running ActionD instance. */
export function reloadPlugins(): Promise<{ status: string; message: string; count: number; pluginList: string[] }> {
    return apiRequest<{ status: string; message: string; count: number; pluginList: string[] }>(
        '/api/plugins/reload',
        { method: 'POST' },
    );
}

/** Probe LGH through the ActionD proxy (404 = backend predates the proxy). */
export function lghPing(): Promise<{ status: 'online' | 'offline'; error?: string }> {
    return apiRequest<{ status: 'online' | 'offline'; error?: string }>('/api/lgh/ping');
}

/** Aggregate commit status for a commit, proxied from LGH. */
export function getLghCommitStatus(repo: string, sha: string): Promise<CommitStatusReport> {
    return apiRequest<CommitStatusReport>(
        `/api/lgh/status/${encodeURIComponent(repo)}/${encodeURIComponent(sha)}`,
    );
}

export function getPlugins(): Promise<Plugin[]> {
    return apiRequest<Plugin[]>('/api/plugins');
}

export function createPlugin(plugin: PluginCreateRequest): Promise<{ status: string; name: string }> {
    return apiRequest<{ status: string; name: string }>('/api/plugins', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(plugin),
    });
}

export function updatePlugin(name: string, config: Partial<Plugin>): Promise<{ status: string; name: string }> {
    // Plugin.filter is the UI-facing name; the backend expects refFilter.
    const { filter, ...rest } = config;
    const payload = { ...rest, refFilter: filter };
    return apiRequest<{ status: string; name: string }>(`/api/plugins/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
    });
}

export function deletePlugin(name: string): Promise<{ status: string; name: string }> {
    return apiRequest<{ status: string; name: string }>(`/api/plugins/${encodeURIComponent(name)}`, {
        method: 'DELETE',
    });
}

export function togglePlugin(name: string, enabled: boolean): Promise<{ status: string; name: string; enabled: boolean }> {
    return apiRequest<{ status: string; name: string; enabled: boolean }>(
        `/api/plugins/${encodeURIComponent(name)}/toggle`,
        {
            method: 'POST',
            headers: JSON_HEADERS,
            body: JSON.stringify({ enabled }),
        },
    );
}
