/**
 * Canonical types for the ActionD backend REST API.
 *
 * Field names (snake_case) mirror the Go structs' json tags exactly:
 * - ActionJob / ActionResult / Status → ActionD/internal/job/job.go
 * - PluginConfig                      → ActionD/internal/server/config.go
 * - SSE ProgressMessage               → ActionD/internal/pubsub/pubsub.go
 */

/** All job statuses emitted by the backend (internal/job/job.go). */
export type ActionRunStatus =
    | 'pending'
    | 'queued'
    | 'running'
    | 'done'
    | 'failed'
    | 'cancelled'
    | 'retrying'
    | 'blocked'
    | 'needs_approval'
    | 'retryable';

/** States after which no further progress or SSE updates are expected. */
export const TERMINAL_STATUSES: readonly ActionRunStatus[] = [
    'done',
    'failed',
    'cancelled',
];

export interface ActionRunCommit {
    hash?: string;
    message?: string;
    author?: string;
}

/** Structured result written by plugins (internal/job/job.go ActionResult). */
export interface ActionResult {
    action_id?: string;
    run_id?: string;
    profile?: string;
    trigger?: string;
    repo?: string;
    module?: string;
    started_at?: string;
    finished_at?: string;
    status: 'success' | 'failure' | 'error' | string;
    decision?: 'approved' | 'rejected' | 'blocked' | 'passed' | string;
    summary: string;
    failed_step?: string;
    hints?: string[];
    signals?: string[];
    next_actions?: string[];
    artifacts?: string[];
    raw_outputs?: Record<string, unknown>;
    metrics?: Record<string, unknown>;
    details?: Record<string, unknown>;
}

/** One CI job as returned by GET /api/actions (backend ActionJob). */
export interface ActionRun {
    id: string;
    run_id?: string; // Visual ID: run-{date}-{hash}
    event_id?: string;

    repo: string;
    event_type?: string; // git.push, git.tag, etc.
    trigger_reason?: string; // push, tag, manual, retry, webhook

    action: string; // Plugin name (e.g. go-lint, deepwiki)
    plugin_name?: string; // Same as action, for compatibility

    status: ActionRunStatus;
    progress?: string; // Current step description; SSE frames carry the numeric 0-100 percentage separately

    commit?: ActionRunCommit;
    branch?: string;
    tag?: string;
    commit_sha?: string;
    commit_message?: string;
    commit_author?: string;

    created_at: string;
    started_at?: string;
    ended_at?: string;
    completed_at?: string;
    duration_ms?: number;

    error?: string;
    error_summary?: string; // AI-friendly short error
    exit_code?: number;
    artifacts?: string[];
    raw_log_path?: string;

    result?: ActionResult;

    model?: string;
    tokens?: number;

    retry_count?: number;
    retry_of?: string; // Original job ID if this is a retry
    original_run?: string; // Original run ID if this is a retry
}

export interface Plugin {
    name: string;
    version?: string;
    enabled: boolean;
    type: 'go' | 'exec';
    triggers: string[];
    languages?: string[];
    filter?: string; // Optional ref filter (e.g. tags)
    repoFilter?: string;
    description?: string;
    command?: string;
    args?: string[];
    timeout?: string;
    workingDir?: string;
    isCustom?: boolean; // true if user-defined via config
}

export interface PluginCreateRequest {
    name: string;
    command: string;
    args?: string[];
    triggers: string[];
    languages?: string[];
    timeout?: string;
    workingDir?: string;
    refFilter?: string;
    repoFilter?: string;
}

/** Profile values accepted by POST /api/profile (internal/server/config.go). */
export type ActionProfile = 'fast' | 'full' | 'release';

/** Per-plugin commit status reported to LGH (lgh internal/git CommitStatus). */
export interface LghCommitStatus {
    commit_sha: string;
    plugin: string;
    status: 'pending' | 'success' | 'failure' | 'error' | 'cancelled' | string;
    summary?: string;
    timestamp: string;
}

/** Aggregate commit status report (LGH GET /api/repos/{repo}/commits/{sha}/status). */
export interface CommitStatusReport {
    commit_sha: string;
    overall: 'pending' | 'success' | 'failure' | 'error' | string;
    statuses: LghCommitStatus[];
    [key: string]: unknown; // tolerate extra report fields (updated_at etc.)
}

/** Failure analysis from GET /api/actions/{id}/diagnose (interpreter.FailureAnalysis). */
export interface FailureAnalysis {
    category: string; // build | test | lint | dependency | permission | timeout | resource | unknown
    type: string; // pattern id, e.g. go_build_failed
    summary: string;
    cause: string;
    hints: string[];
    related_file?: string;
    severity: string; // critical | warning | info
}

export interface DiagnoseReport {
    job_id: string;
    plugin: string;
    repo: string;
    status: string;
    duration_ms: number;
    error_summary?: string;
    analysis: FailureAnalysis | null; // null when the job has no error text
    related_files?: string[];
}

type UnknownRecord = Record<string, unknown>;

/** Parsed quicktest-analysis.json artifact (java-quicktest plugin). */
export interface QuickTestAnalysis {
    schemaVersion: string;
    meta: {
        generatedAt: string;
        tool: string;
        toolVersion: string;
        mode: string;
    };
    context: {
        repo: { path: string; commit: UnknownRecord };
        environment: UnknownRecord;
        trigger: UnknownRecord;
        module?: { name: string; path: string };
    };
    changeSummary: {
        changedFiles: string[];
        changedClasses: Array<{
            className: string;
            changeType: string;
            details: {
                methodsAdded: string[];
                methodsModified: string[];
                methodsRemoved: string[];
            };
        }>;
    };
    analysis: {
        astDiff: { summary: string; status: string };
        dependencyExpansion: {
            callers: Array<{ className: string; reason: string }>;
            strategy?: string;
        };
        riskAssessment: { highRisk: boolean; reasons: string[] };
    };
    decision: {
        runMode: string;
        runFullTests: boolean;
        selectedTestsReason: string;
    };
    tests: Array<{
        testClass: string;
        reason: string;
    }>;
    metrics: {
        analysisTimeMs: number;
        testsSelected: number;
        testsTotal: number;
        reductionRate: number;
    };
}
