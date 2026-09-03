/**
 * Generate README screenshots from the static export with mocked API data —
 * no ActionD backend required.
 *
 * Usage: npm run build && node scripts/screenshots.mjs
 * Output: docs/screenshots/*.png (1440x900 @2x)
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const OUT_DIR = path.resolve('docs/screenshots');
mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const REPOS = ['JoeGlenn1213/ActionD', 'JoeGlenn1213/lgh', 'JoeGlenn1213/actiond-web'];
const PLUGINS = ['go-lint', 'go-test-fast', 'python-pytest', 'web-build', 'web-lint', 'java-quicktest'];
const STATUS_CYCLE = ['done', 'done', 'done', 'failed', 'done', 'cancelled', 'done', 'done'];

const runs = [];
let n = 0;
for (let d = 13; d >= 0; d--) {
    const per = 2 + ((d * 7) % 3); // 2..4 runs per day
    for (let k = 0; k < per; k++) {
        n += 1;
        const st = STATUS_CYCLE[(d + k) % STATUS_CYCLE.length];
        const plugin = PLUGINS[(d + k) % PLUGINS.length];
        const date = new Date(Date.now() - d * 86400000);
        date.setHours(9 + ((d + k) % 8), (k * 17) % 60, 0, 0);
        runs.push({
            id: `job-${String(n).padStart(3, '0')}`,
            run_id: `run-${date.toISOString().slice(0, 10)}-${String(n).padStart(3, '0')}`,
            repo: REPOS[(d + k) % REPOS.length],
            action: plugin,
            plugin_name: plugin,
            status: st,
            created_at: date.toISOString(),
            duration_ms: 4000 + ((d * 13 + k * 29) % 60000),
            event_id: `evt-${200 + n}`,
            event_type: 'git.push',
            branch: 'main',
            commit: {
                hash: (0x1000000 + n * 7919).toString(16).slice(0, 7),
                message: 'fix: tighten PATH injection for plugin environments',
                author: 'Joe Glenn',
            },
        });
    }
}
// A couple of live/blocked entries so the list shows colored statuses.
const now = new Date().toISOString();
runs.push(
    { ...runs[runs.length - 1], id: 'job-running-1', status: 'running', action: 'go-test-fast', plugin_name: 'go-test-fast', created_at: now, duration_ms: 12000, progress: 'go test ./internal/...' },
    { ...runs[runs.length - 1], id: 'job-approval-1', status: 'needs_approval', action: 'approval-gate', plugin_name: 'approval-gate', created_at: now, duration_ms: 3000 },
);

const pluginList = [
    ...PLUGINS.map((name, i) => ({
        name,
        enabled: name !== 'web-lint',
        type: name.startsWith('go-') ? 'go' : name.startsWith('python-') ? 'python' : name.startsWith('web-') ? 'web' : 'java',
        triggers: ['git.push'],
    })),
    { name: 'my-tool', enabled: false, type: 'exec', command: 'make', triggers: ['manual'], isCustom: true },
];

const failedJob = {
    ...runs.find((r) => r.status === 'failed'),
    id: 'job-failed-1',
    status: 'failed',
    error: 'exit status 1',
    raw_log_path: 'raw_log.txt',
    artifacts: ['test-report.xml', 'raw_log.txt'],
    duration_ms: 23400,
    result: {
        action_id: 'job-failed-1',
        plugin_id: 'go-test-fast',
        capability: 'test',
        language: 'go',
        status: 'failure',
        summary: '1 of 24 tests failed',
        failed_step: 'TestResolveFromMappings',
        hints: ['Run go test ./internal/repopath/ -run TestResolveFromMappings to reproduce'],
        signals: ['tests_passed=false', 'tests_run=24'],
        artifacts: ['test-report.xml'],
    },
};

const diagnoseReport = {
    job_id: 'job-failed-1',
    plugin: 'go-test-fast',
    repo: 'JoeGlenn1213/ActionD',
    status: 'failed',
    duration_ms: 23400,
    error_summary: '--- FAIL: TestResolveFromMappings',
    analysis: {
        category: 'test',
        type: 'go_test_failed',
        summary: 'Go test failure',
        cause: 'TestResolveFromMappings expects resolve() to return the exact directory, but the fixture no longer matches the normalized-name semantics.',
        hints: ['Run the failing test locally to reproduce', 'Update the fixture to match resolve() semantics'],
        related_file: 'internal/repopath/resolve_test.go',
        severity: 'critical',
    },
    related_files: ['internal/repopath/resolve_test.go'],
};

const RAW_LOG = `go test ./...
?   github.com/JoeGlenn1213/actiond/cmd/actiond    [no test files]
ok  github.com/JoeGlenn1213/actiond/internal/app    0.673s
ok  github.com/JoeGlenn1213/actiond/internal/dispatcher    4.310s
--- FAIL: TestResolvePrefersExactDirectory (0.00s)
    resolve_test.go:17: Resolve() = "/var/folders/.../actiond", want "/var/folders/.../demo-api"
--- FAIL: TestResolveFromMappings (0.00s)
    resolve_test.go:48: resolveFromMappings() = "", want a mapped path
FAIL
FAIL    github.com/JoeGlenn1213/actiond/internal/repopath    5.322s
FAIL
`;

// ---------------------------------------------------------------------------
// Server (static export) + browser
// ---------------------------------------------------------------------------
const server = spawn('node', ['scripts/serve.mjs'], {
    env: { ...process.env, PORT: String(PORT), NEXT_PUBLIC_ACTIOND_BASE_URL: '' },
    stdio: 'ignore',
});

async function waitForServer(url, tries = 60) {
    for (let i = 0; i < tries; i++) {
        try {
            await fetch(url);
            return;
        } catch {
            await new Promise((r) => setTimeout(r, 500));
        }
    }
    throw new Error(`server did not come up at ${url}`);
}

const json = (body) => (route) => route.fulfill({ json: body });

async function main() {
    await waitForServer(`${BASE}/`);
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        colorScheme: 'light',
    });
    const page = await context.newPage();

    // Register generic routes first, specific ones after (Playwright is LIFO).
    await page.route('**/api/actions', json(runs));
    await page.route('**/api/plugins', json(pluginList));
    await page.route('**/api/health', json({ status: 'ok', service: 'actiond', time: now }));
    await page.route('**/api/lgh/ping', json({ status: 'online' }));
    await page.route('**/api/actions/job-failed-1', json(failedJob));
    await page.route('**/api/actions/*/diagnose', json(diagnoseReport));
    await page.route('**/api/actions/*/artifacts/raw_log.txt', (route) =>
        route.fulfill({ contentType: 'text/plain; charset=utf-8', body: RAW_LOG }),
    );

    const settle = (ms = 900) => page.waitForTimeout(ms);

    // The app shell is a fixed-height layout scrolling inside <main>, so
    // Playwright's fullPage never grows beyond the viewport. Measure where
    // <main>'s content actually ends (last child's bottom edge) and enlarge
    // the viewport to fit, capped so README images keep a sane aspect ratio.
    const fitViewportToContent = async (cap = 2400) => {
        const height = await page.evaluate(() => {
            const main = document.querySelector('main');
            if (!main) return document.documentElement.scrollHeight;
            const children = [...main.querySelectorAll(':scope > *')];
            const last = children[children.length - 1];
            const bottom = last ? last.getBoundingClientRect().bottom : main.scrollHeight;
            return Math.ceil(bottom + 16); // small bottom padding
        });
        await page.setViewportSize({ width: 1440, height: Math.min(cap, height) });
        await settle(700); // responsive charts re-render on resize
    };

    // 1. Dashboard
    await page.goto(`${BASE}/`);
    await page.waitForSelector('svg.recharts-surface', { timeout: 15000 });
    await page.waitForSelector('table tbody tr', { timeout: 15000 });
    await settle(1200); // let the charts animate in
    await fitViewportToContent();
    await page.screenshot({ path: path.join(OUT_DIR, 'dashboard.png') });

    // 2. Actions list
    await page.goto(`${BASE}/actions`);
    await page.waitForSelector('table tbody tr', { timeout: 15000 });
    await settle();
    await fitViewportToContent();
    await page.screenshot({ path: path.join(OUT_DIR, 'actions.png') });

    // 3. Failed job detail with the in-browser diagnosis card — wait for the
    //    replayed raw log and the expanded analysis card before capturing.
    await page.goto(`${BASE}/actions/job-failed-1`);
    await page.waitForSelector('text=FAIL    github.com/JoeGlenn1213/actiond/internal/repopath', { timeout: 15000 });
    await settle(800);
    const diagnoseBtn = page.getByRole('button', { name: /diagnose/i }).first();
    if (await diagnoseBtn.count()) {
        await diagnoseBtn.click();
    }
    await page.waitForSelector('text=Likely cause', { timeout: 15000 });
    await settle(800);
    await fitViewportToContent();
    await page.screenshot({ path: path.join(OUT_DIR, 'action-detail.png') });

    // 4. Plugin management
    await page.goto(`${BASE}/plugins`);
    await settle(1500);
    await fitViewportToContent();
    await page.screenshot({ path: path.join(OUT_DIR, 'plugins.png') });

    await browser.close();
    console.log(`✓ screenshots written to ${OUT_DIR}`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => server.kill('SIGTERM'));
