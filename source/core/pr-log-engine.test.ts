import assert from 'node:assert';
import type { Octokit } from '@octokit/rest';
import { fake } from 'sinon';
import { defaultValidLabels } from '../lib/valid-labels.ts';
import type { GitCommandRunner } from '../lib/git-command-runner.ts';
import type { GetPullRequestLabels } from '../lib/get-pull-request-label.ts';
import type { PullRequestChangedFilesReader } from '../lib/pull-request-changed-files.ts';
import { createPrLogEngineWithDependencies } from './pr-log-engine.ts';

const githubRepo = 'owner/repo';
const pullRequestId = 1;
const documentationPullRequestId = 2;
const waitDurationMilliseconds = 25;

function createEngine(
    overrides: {
        readonly gitCommandRunner?: GitCommandRunner;
        readonly githubClient?: Octokit;
        readonly pullRequestChangedFilesReader?: PullRequestChangedFilesReader;
        readonly getPullRequestLabels?: GetPullRequestLabels;
        readonly waitForMilliseconds?: (durationMilliseconds: number) => Promise<void>;
        readonly labelLookupIntervalMilliseconds?: number;
    } = {}
): ReturnType<typeof createPrLogEngineWithDependencies> {
    const gitCommandRunner =
        overrides.gitCommandRunner ??
        ({
            listTags: fake.resolves(['1.0.0']),
            hasRef: fake.resolves(true),
            getFirstParentCommitLogs: fake.resolves([
                { hash: 'hash-1', subject: 'Merge pull request #1 from branch', body: 'Fix bug' }
            ])
        } as unknown as GitCommandRunner);
    const githubClient =
        overrides.githubClient ??
        ({
            pulls: {
                get: fake.resolves({ data: { title: 'GitHub title' } })
            }
        } as unknown as Octokit);
    const pullRequestChangedFilesReader =
        overrides.pullRequestChangedFilesReader ??
        ({
            getChangedFiles: fake.resolves(['source/index.ts'])
        } satisfies PullRequestChangedFilesReader);

    return createPrLogEngineWithDependencies({
        gitCommandRunner,
        githubClient,
        pullRequestChangedFilesReader,
        getPullRequestLabels: overrides.getPullRequestLabels ?? fake.resolves(['bug']),
        waitForMilliseconds: overrides.waitForMilliseconds ?? fake.resolves(undefined),
        getCurrentDate: fake.returns(new Date(0)),
        labelLookupIntervalMilliseconds: overrides.labelLookupIntervalMilliseconds ?? waitDurationMilliseconds,
        maximumRateLimitRetryCount: 0
    });
}

test('resolves the latest semver changelog base ref', async () => {
    const engine = createEngine();

    assert.deepStrictEqual(await engine.resolveLatestSemverChangelogBaseRef(), { ref: '1.0.0' });
});

test('resolves package changelog base refs', async () => {
    const engine = createEngine();

    assert.deepStrictEqual(
        await engine.resolveChangelogBaseRef({
            packageName: 'pkg',
            previousVersion: undefined,
            previousGitHead: 'abc123',
            packageTagFormat: undefined,
            explicitBaseRef: undefined
        }),
        { ref: 'abc123' }
    );
});

test('collects merged pull requests', async () => {
    const engine = createEngine();

    assert.deepStrictEqual(await engine.collectMergedPullRequests({ githubRepo, baseRef: '1.0.0' }), [
        { id: pullRequestId, title: 'Fix bug' }
    ]);
});

test('reads fallback pull request titles from github', async () => {
    const getPullRequest = fake.resolves({ data: { title: 'GitHub title' } });
    const githubClient = {
        pulls: {
            get: getPullRequest
        }
    } as unknown as Octokit;
    const engine = createEngine({
        githubClient,
        gitCommandRunner: {
            getFirstParentCommitLogs: fake.resolves([
                { hash: 'hash-1', subject: 'Merge pull request #1 from branch', body: undefined }
            ])
        } as unknown as GitCommandRunner
    });

    assert.deepStrictEqual(await engine.collectMergedPullRequests({ githubRepo, baseRef: '1.0.0' }), [
        { id: pullRequestId, title: 'GitHub title' }
    ]);
    assert.deepStrictEqual(getPullRequest.firstCall.args, [
        { owner: 'owner', repo: 'repo', pull_number: pullRequestId }
    ]);
});

test('rejects fallback pull request titles without repo details', async () => {
    const engine = createEngine({
        gitCommandRunner: {
            getFirstParentCommitLogs: fake.resolves([
                { hash: 'hash-1', subject: 'Merge pull request #1 from branch', body: undefined }
            ])
        } as unknown as GitCommandRunner
    });

    await assert.rejects(engine.collectMergedPullRequests({ githubRepo: 'repo', baseRef: '1.0.0' }), {
        message: 'Could not find a repository'
    });
});

test('reads pull request changed files', async () => {
    const engine = createEngine();

    assert.deepStrictEqual(
        await engine.readPullRequestChangedFiles({
            githubRepo,
            pullRequests: [{ id: pullRequestId, title: 'Fix bug' }]
        }),
        new Map([[pullRequestId, ['source/index.ts']]])
    );
});

test('filters pull requests by target files', () => {
    const engine = createEngine();

    assert.deepStrictEqual(
        engine.filterPullRequestsByTargetFiles({
            targetName: 'pkg',
            targetSourceFiles: ['source/index.ts'],
            pullRequests: [
                { id: pullRequestId, title: 'Fix bug' },
                { id: documentationPullRequestId, title: 'Add docs' }
            ],
            changedFilesByPullRequest: new Map([
                [pullRequestId, ['source/index.ts']],
                [documentationPullRequestId, ['README.md']]
            ]),
            ignoredAttributionPaths: []
        }),
        [{ id: pullRequestId, title: 'Fix bug' }]
    );
});

test('reads pull request labels', async () => {
    const engine = createEngine();

    assert.deepStrictEqual(
        await engine.readPullRequestLabels({
            githubRepo,
            pullRequests: [{ id: pullRequestId, title: 'Fix bug' }]
        }),
        new Map([[pullRequestId, ['bug']]])
    );
});

test('waits between raw pull request label reads', async () => {
    const waitForMilliseconds = fake.resolves(undefined);
    const engine = createEngine({ waitForMilliseconds, labelLookupIntervalMilliseconds: waitDurationMilliseconds });

    await engine.readPullRequestLabels({
        githubRepo,
        pullRequests: [
            { id: pullRequestId, title: 'Fix bug' },
            { id: documentationPullRequestId, title: 'Add feature' }
        ]
    });

    assert.deepStrictEqual(waitForMilliseconds.firstCall.args, [waitDurationMilliseconds]);
});

test('resolves pull request labels', async () => {
    const engine = createEngine();

    assert.deepStrictEqual(
        await engine.resolvePullRequestLabels({
            githubRepo,
            validLabels: defaultValidLabels,
            pullRequests: [{ id: pullRequestId, title: 'Fix bug' }],
            targetName: undefined,
            targetScopedLabelPattern: undefined
        }),
        [{ id: pullRequestId, title: 'Fix bug', label: 'bug' }]
    );
});

test('resolves target scoped pull request labels', async () => {
    const engine = createEngine({
        getPullRequestLabels: fake.resolves(['feature', 'pkg-a:bug'])
    });

    assert.deepStrictEqual(
        await engine.resolvePullRequestLabels({
            githubRepo,
            validLabels: defaultValidLabels,
            pullRequests: [{ id: pullRequestId, title: 'Fix bug' }],
            targetName: 'pkg-a',
            targetScopedLabelPattern: undefined
        }),
        [{ id: pullRequestId, title: 'Fix bug', label: 'bug' }]
    );
});

test('renders changelog markdown', () => {
    const engine = createEngine();

    const changelog = engine.renderChangelog({
        packageInfo: {},
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        mergedPullRequests: [{ id: pullRequestId, title: 'Fix bug', label: 'bug' }],
        githubRepo,
        unreleased: false,
        versionNumber: '1.0.0'
    });

    assert.ok(changelog.includes('## 1.0.0 (January 1, 1970)'));
});
test('renders target changelog markdown', () => {
    const engine = createEngine();

    const changelog = engine.renderTargetChangelog({
        packageInfo: {},
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        targetName: 'pkg-a',
        mergedPullRequests: [{ id: pullRequestId, title: 'Fix bug', label: 'bug' }],
        githubRepo,
        unreleased: true,
        versionNumber: undefined
    });

    assert.ok(changelog.includes('### Bug Fixes'));
});

test('renders grouped target changelog markdown', () => {
    const engine = createEngine();

    const changelog = engine.renderGroupedTargetChangelog({
        packageInfo: {},
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        targets: [
            {
                targetName: 'pkg-a',
                mergedPullRequests: [{ id: pullRequestId, title: 'Fix bug', label: 'bug' }],
                unreleased: false,
                versionNumber: '1.0.0'
            },
            {
                targetName: 'pkg-b',
                mergedPullRequests: [{ id: documentationPullRequestId, title: 'Add docs', label: 'documentation' }],
                unreleased: false,
                versionNumber: '2.0.0'
            }
        ],
        githubRepo
    });

    assert.ok(changelog.includes('## pkg-a 1.0.0 (January 1, 1970)'));
    assert.ok(changelog.includes('## pkg-b 2.0.0 (January 1, 1970)'));
});

test('updates changelog markdown', () => {
    const engine = createEngine();

    const changelog = engine.updateChangelog({
        existingChangelogMarkdown: '## 0.9.0\n\n* Older change\n',
        generatedChangelogMarkdown: '## 1.0.0\n\n* New change\n'
    });

    assert.strictEqual(changelog, '## 1.0.0\n\n* New change\n\n## 0.9.0\n\n* Older change\n');
});
