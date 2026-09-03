/**
 * E2E tests for actiond-web (Playwright).
 *
 * All /api traffic is intercepted with page.route mocks — no ActionD backend
 * is required. Flows covered: dashboard overview, actions list + pagination,
 * plugin list + toggle request.
 */
import { test, expect, Route } from '@playwright/test';
import { ActionRun, Plugin } from '../lib/types';

const mockRuns: ActionRun[] = Array.from({ length: 15 }, (_, i) => ({
    id: `job-${i + 1}`,
    run_id: `run-2026-08-20-${String(i + 1).padStart(3, '0')}`,
    repo: i % 2 === 0 ? 'JoeGlenn1213/ActionD' : 'JoeGlenn1213/lgh',
    action: i % 3 === 0 ? 'go-lint' : 'java-quicktest',
    plugin_name: i % 3 === 0 ? 'go-lint' : 'java-quicktest',
    status: (['done', 'failed', 'running'] as const)[i % 3],
    created_at: new Date(Date.UTC(2026, 7, 20, 10, i, 0)).toISOString(),
    duration_ms: 5_000 + i * 1_000,
    event_id: `evt-${100 + i}`,
}));

const mockPlugins: Plugin[] = [
    {
        name: 'go-lint',
        enabled: true,
        type: 'go',
        triggers: ['git.push'],
    },
    {
        name: 'my-tool',
        enabled: false,
        type: 'exec',
        command: 'make',
        triggers: ['manual'],
        isCustom: true,
    },
];

async function fulfillJson(route: Route, body: unknown) {
    await route.fulfill({ json: body });
}

async function chardsSvgCount(page: import('@playwright/test').Page): Promise<number> {
    return page.getByTestId('dashboard-charts').locator('svg.recharts-surface').count();
}

test.beforeEach(async ({ page }) => {
    await page.route('**/api/actions', (route) => fulfillJson(route, mockRuns));
    await page.route('**/api/plugins', (route) => fulfillJson(route, mockPlugins));
});

test.describe('Dashboard', () => {
    test('shows stats and recent activity from the API', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByTestId('stat-total')).toHaveText('15');
        // 15 runs cycling done/failed/running → every 3rd is running
        await expect(page.getByTestId('stat-running')).toHaveText('5');
        await expect(page.getByTestId('stat-plugins')).toHaveText('1'); // 1 of 2 enabled

        await expect(page.getByRole('cell', { name: 'JoeGlenn1213/ActionD' }).first()).toBeVisible();
    });

    test('renders the charts from run history', async ({ page }) => {
        await page.goto('/');

        const charts = page.getByTestId('dashboard-charts');
        await expect(charts).toBeVisible();
        // Four chart cards, each backed by a recharts svg when data exists
        // (the mock has done/failed runs with durations across hours).
        expect(await chardsSvgCount(page)).toBeGreaterThan(0);
        await expect(page.getByText('Pass Rate — last 14 days')).toBeVisible();
        await expect(page.getByText('Success Rate by Plugin')).toBeVisible();
        await expect(page.getByText('Run Duration Distribution')).toBeVisible();
        await expect(page.getByText('Runs by Hour of Day')).toBeVisible();
    });

    test('shows an error banner when the backend is unreachable', async ({ page }) => {
        await page.route('**/api/actions', (route) => route.fulfill({ status: 503, body: 'down' }));
        await page.route('**/api/plugins', (route) => route.fulfill({ status: 503, body: 'down' }));

        await page.goto('/');

        // The shared health probe fails too, so the connection banner takes over.
        await expect(page.getByTestId('connection-banner')).toBeVisible();
        await expect(page.getByTestId('actiond-health')).toHaveText('ActionD Offline');
    });
});

test.describe('Actions list', () => {
    test('renders run rows with status and paginates 10 per page', async ({ page }) => {
        await page.goto('/actions');

        const rows = page.getByTestId('run-row');
        await expect(rows).toHaveCount(10);
        await expect(page.getByText('Page 1 of 2')).toBeVisible();
        await expect(page.getByText('Showing 1-10 of 15 runs')).toBeVisible();

        await page.getByRole('button', { name: 'Next' }).click();
        await expect(rows).toHaveCount(5);
        await expect(page.getByText('Page 2 of 2')).toBeVisible();
    });

    test('expands a row to show details', async ({ page }) => {
        await page.goto('/actions');

        await page.getByTestId('run-row').first().click();
        await expect(page.getByText('Full ID')).toBeVisible();
        // Newest run first (default sort): job-15 → evt-114.
        await expect(page.getByText('evt-114')).toBeVisible();
    });
});

test.describe('Plugins', () => {
    test('lists plugins and sends the toggle request', async ({ page }) => {
        const toggleRequests: { url: string; body: string }[] = [];
        await page.route('**/api/plugins/*/toggle', async (route) => {
            toggleRequests.push({
                url: route.request().url(),
                body: route.request().postData() ?? '',
            });
            await fulfillJson(route, { status: 'toggled', name: 'go-lint', enabled: false });
        });

        await page.goto('/plugins');

        await expect(page.getByTestId('plugin-row')).toHaveCount(2);
        await expect(page.getByRole('cell', { name: 'go-lint' })).toBeVisible();

        await page.getByRole('switch').first().click();

        await expect
            .poll(() => toggleRequests.length, { message: 'toggle request should fire' })
            .toBe(1);
        expect(toggleRequests[0].body).toContain('"enabled":false');
    });

    test('reload button hits the hot-reload endpoint', async ({ page }) => {
        const reloadRequests: string[] = [];
        await page.route('**/api/plugins/reload', async (route) => {
            reloadRequests.push(route.request().method());
            await fulfillJson(route, {
                status: 'success',
                message: 'Plugins reloaded successfully',
                count: 2,
                pluginList: ['go-lint', 'my-tool'],
            });
        });

        await page.goto('/plugins');

        await page.getByTestId('reload-plugins').click();

        await expect
            .poll(() => reloadRequests.length, { message: 'reload request should fire' })
            .toBe(1);
        expect(reloadRequests[0]).toBe('POST');
    });
});

test.describe('Event group view', () => {
    test('event_id in the expanded row links to the /events route', async ({ page }) => {
        await page.route('**/api/actions/by-event/*', (route) =>
            fulfillJson(route, mockRuns.filter((r) => r.event_id === 'evt-114')),
        );

        await page.goto('/actions');

        // Expand the newest run (job-15 / evt-114), click its event_id
        await page.getByTestId('run-row').first().click();
        await page.getByRole('link', { name: 'evt-114' }).click();

        await expect(page).toHaveURL(/\/events\/evt-114/);
        await expect(page.getByTestId('event-group')).toBeVisible();
        await expect(page.getByText('Trigger context')).toBeVisible();
        await expect(page.getByTestId('run-row')).toHaveCount(1);
    });
});

test.describe('Failure diagnosis', () => {
    test('failed job detail offers one-click diagnosis', async ({ page }) => {
        const failedRun = {
            ...mockRuns[1],
            status: 'failed' as const,
            error: 'exit status 1',
            error_summary: 'build failed',
            commit: { hash: '9af76e2c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f', message: 'break things', author: 't' },
            repo: 'JoeGlenn1213/ActionD',
        };
        await page.route('**/api/actions/job-2', (route) => fulfillJson(route, failedRun));
        await page.route('**/api/actions/job-2/diagnose', (route) =>
            fulfillJson(route, {
                job_id: 'job-2',
                plugin: failedRun.plugin_name,
                repo: failedRun.repo,
                status: 'failed',
                duration_ms: 31_000,
                error_summary: 'build failed',
                analysis: {
                    category: 'build',
                    type: 'go_build_failed',
                    summary: 'Compilation failed',
                    cause: 'undefined: Foo',
                    hints: ['Fix the reference to Foo'],
                    severity: 'critical',
                },
                related_files: ['main.go:42'],
            }),
        );
        await page.route('**/api/lgh/status/**', (route) =>
            fulfillJson(route, {
                commit_sha: failedRun.commit.hash,
                overall: 'failure',
                statuses: [
                    {
                        commit_sha: failedRun.commit.hash,
                        plugin: 'go-lint',
                        status: 'failure',
                        summary: 'build failed',
                        timestamp: '2026-08-20T10:01:00Z',
                    },
                ],
            }),
        );

        await page.goto('/actions/job-2');

        // Commit status card (proxied from LGH)
        const statusCard = page.getByTestId('commit-status-card');
        await expect(statusCard).toBeVisible();
        await expect(statusCard.getByText('failure').first()).toBeVisible();
        await expect(statusCard.getByText('go-lint', { exact: true })).toBeVisible();

        await page.getByRole('button', { name: /Diagnose Failure/ }).click();
        const card = page.getByTestId('diagnose-card');
        await expect(card).toBeVisible();
        await expect(card.getByText('Compilation failed')).toBeVisible();
        await expect(card.getByText('Fix the reference to Foo')).toBeVisible();
        await expect(card.getByText('main.go:42')).toBeVisible();
    });
});

test.describe('Settings / profile', () => {
    test('loads and switches the execution profile', async ({ page }) => {
        const profileRequests: string[] = [];
        await page.route('**/api/profile', async (route) => {
            if (route.request().method() === 'GET') {
                await fulfillJson(route, { profile: 'fast' });
                return;
            }
            profileRequests.push(route.request().postData() ?? '');
            await fulfillJson(route, { profile: 'full', status: 'updated' });
        });

        await page.goto('/settings');

        await expect(page.getByTestId('profile-card').getByText('Quick feedback', { exact: false })).toBeVisible();
        await expect(page.getByTestId('app-version')).toHaveText(/^v/);

        await page.getByRole('combobox').click();
        await page.getByRole('option', { name: 'Full' }).click();
        await page.getByTestId('profile-save').click();

        await expect
            .poll(() => profileRequests.length, { message: 'profile POST should fire' })
            .toBe(1);
        expect(profileRequests[0]).toContain('"profile":"full"');
    });
});
