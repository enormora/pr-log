import assert from 'node:assert';
import { fake } from 'sinon';
import { ok } from 'true-myth/result';
import { defaultPrLogConfig, type PrLogConfig } from '../lib/pr-log-config.ts';
import type { GitCommandRunner } from '../lib/git-command-runner.ts';
import type { GetPullRequestLabels } from '../lib/get-pull-request-label.ts';
import type { PullRequestChangedFile, PullRequestChangedFilesReader } from '../lib/pull-request-changed-files.ts';
import {
    createPrLogEngineWithDependencies,
    type PrLogEngine,
    type PrLogEngineDependencies
} from './pr-log-engine.ts';

const githubRepo = 'owner/repo';
const pullRequestId = 1;
const documentationPullRequestId = 2;
const waitDurationMilliseconds = 25;

function changedFile(path: string): PullRequestChangedFile {
    return {
        path,
        previousPath: undefined,
        status: 'modified',
        additions: 1,
        deletions: 0,
        changes: 1
    };
}

type EngineOverrides = {
    readonly gitCommandRunner?: GitCommandRunner;
    readonly githubClient?: PrLogEngineDependencies['githubClient'];
    readonly pullRequestChangedFilesReader?: PullRequestChangedFilesReader;
    readonly getPullRequestLabels?: GetPullRequestLabels;
    readonly waitForMilliseconds?: (durationMilliseconds: number) => Promise<void>;
    readonly config?: PrLogConfig;
};

function createGitCommandRunner(overrides: Partial<GitCommandRunner> = {}): GitCommandRunner {
    return {
        async getShortStatus() {
            return '';
        },
        async getCurrentBranchName() {
            return 'main';
        },
        async fetchRemote() {
            return undefined;
        },
        async getSymmetricDifferencesBetweenBranches() {
            return [];
        },
        async getRemoteAliases() {
            return [];
        },
        async listTags() {
            return [ '1.0.0' ];
        },
        async hasRef() {
            return true;
        },
        async getMergeCommitLogs() {
            return [];
        },
        async getFirstParentCommitLogs() {
            return [
                {
                    hash: 'hash-1',
                    parents: [ 'parent-1', 'parent-2' ],
                    subject: 'Merge pull request #1 from branch',
                    body: 'Fix bug'
                }
            ];
        },
        ...overrides
    };
}

function createDefaultEngineOverrides(): Required<EngineOverrides> {
    return {
        gitCommandRunner: createGitCommandRunner(),
        githubClient: {
            pulls: {
                get: fake.resolves({
                    data: {
                        title: 'GitHub title',
                        merged: true,
                        merge_commit_sha: 'hash-1',
                        labels: [ { name: 'bug' } ]
                    }
                })
            },
            issues: {
                listLabelsOnIssue: fake.resolves({ data: [] })
            }
        },
        pullRequestChangedFilesReader: {
            getChangedFiles: fake.resolves([ changedFile('source/index.ts') ])
        },
        async getPullRequestLabels() {
            return [ 'bug' ];
        },
        async waitForMilliseconds() {
            return undefined;
        },
        config: {
            ...defaultPrLogConfig,
            labelLookupIntervalMilliseconds: waitDurationMilliseconds,
            maximumRateLimitRetryCount: 0
        }
    };
}

function createEngine(overrides: EngineOverrides = {}): PrLogEngine {
    const dependencies = {
        ...createDefaultEngineOverrides(),
        ...overrides
    };

    return createPrLogEngineWithDependencies({
        gitCommandRunner: dependencies.gitCommandRunner,
        githubClient: dependencies.githubClient,
        pullRequestChangedFilesReader: dependencies.pullRequestChangedFilesReader,
        getPullRequestLabels: dependencies.getPullRequestLabels,
        waitForMilliseconds: dependencies.waitForMilliseconds,
        getCurrentDate: fake.returns(new Date(0)),
        config: dependencies.config
    });
}

test('resolves the latest semver changelog base ref', async function () {
    const engine = createEngine();

    assert.deepStrictEqual(await engine.resolveLatestSemverChangelogBaseRef(), { ref: '1.0.0' });
});

test('resolves package changelog base refs', async function () {
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

test('collects merged pull requests', async function () {
    const engine = createEngine();

    assert.deepStrictEqual(await engine.collectMergedPullRequests({ githubRepo, baseRef: '1.0.0' }), [
        { id: pullRequestId, title: 'Fix bug' }
    ]);
});

test('reads fallback pull request titles from github', async function () {
    const getPullRequest = fake.resolves({
        data: {
            title: 'GitHub title',
            merged: true,
            merge_commit_sha: 'hash-1',
            labels: [ { name: 'bug' } ]
        }
    });
    const githubClient: PrLogEngineDependencies['githubClient'] = {
        pulls: {
            get: getPullRequest
        },
        issues: {
            listLabelsOnIssue: fake.resolves({ data: [] })
        }
    };
    const engine = createEngine({
        githubClient,
        gitCommandRunner: createGitCommandRunner({
            getFirstParentCommitLogs: fake.resolves([
                {
                    hash: 'hash-1',
                    parents: [ 'parent-1', 'parent-2' ],
                    subject: 'Merge pull request #1 from branch',
                    body: undefined
                }
            ])
        })
    });

    assert.deepStrictEqual(await engine.collectMergedPullRequests({ githubRepo, baseRef: '1.0.0' }), [
        { id: pullRequestId, title: 'GitHub title' }
    ]);
    assert.deepStrictEqual(getPullRequest.firstCall.args, [
        { owner: 'owner', repo: 'repo', pull_number: pullRequestId }
    ]);
});

test('reuses verified pull request data when reading labels', async function () {
    const getPullRequestLabels = fake.resolves([ 'bug' ]);
    const engine = createEngine({
        getPullRequestLabels,
        gitCommandRunner: createGitCommandRunner({
            getFirstParentCommitLogs: fake.resolves([
                {
                    hash: 'hash-1',
                    parents: [ 'parent-1' ],
                    subject: 'Open the starlit gate (#731)',
                    body: undefined
                }
            ])
        })
    });

    const pullRequests = await engine.collectMergedPullRequests({ githubRepo, baseRef: '1.0.0' });

    assert.deepStrictEqual(
        await engine.readPullRequestLabels({ githubRepo, pullRequests }),
        new Map([ [ 731, [ 'bug' ] ] ])
    );
    assert.strictEqual(getPullRequestLabels.callCount, 0);
});

test('rejects fallback pull request titles without repo details', async function () {
    const engine = createEngine({
        gitCommandRunner: createGitCommandRunner({
            getFirstParentCommitLogs: fake.resolves([
                {
                    hash: 'hash-1',
                    parents: [ 'parent-1', 'parent-2' ],
                    subject: 'Merge pull request #1 from branch',
                    body: undefined
                }
            ])
        })
    });

    await assert.rejects(engine.collectMergedPullRequests({ githubRepo: 'repo', baseRef: '1.0.0' }), {
        message: 'Could not find a repository'
    });
});

test('reads pull request changed files', async function () {
    const engine = createEngine();

    assert.deepStrictEqual(
        await engine.readPullRequestChangedFiles({
            githubRepo,
            pullRequests: [ { id: pullRequestId, title: 'Fix bug' } ]
        }),
        new Map([ [ pullRequestId, [ changedFile('source/index.ts') ] ] ])
    );
});

test('filters pull requests by target files', function () {
    const engine = createEngine();

    assert.deepStrictEqual(
        engine.filterPullRequestsByTargetFiles({
            targetName: 'pkg',
            targetSourceFiles: [ 'source/index.ts' ],
            pullRequests: [
                { id: pullRequestId, title: 'Fix bug' },
                { id: documentationPullRequestId, title: 'Add docs' }
            ],
            changedFilesByPullRequest: new Map([
                [ pullRequestId, [ changedFile('source/index.ts') ] ],
                [ documentationPullRequestId, [ changedFile('README.md') ] ]
            ]),
            ignoredAttributionPaths: []
        }),
        [ { id: pullRequestId, title: 'Fix bug' } ]
    );
});

test('reads pull request labels', async function () {
    const engine = createEngine();

    assert.deepStrictEqual(
        await engine.readPullRequestLabels({
            githubRepo,
            pullRequests: [ { id: pullRequestId, title: 'Fix bug' } ]
        }),
        new Map([ [ pullRequestId, [ 'bug' ] ] ])
    );
});

test('waits between raw pull request label reads', async function () {
    const waitForMilliseconds = fake.resolves(undefined);
    const config = { ...defaultPrLogConfig, labelLookupIntervalMilliseconds: waitDurationMilliseconds };
    const engine = createEngine({ waitForMilliseconds, config });

    await engine.readPullRequestLabels({
        githubRepo,
        pullRequests: [
            { id: pullRequestId, title: 'Fix bug' },
            { id: documentationPullRequestId, title: 'Add feature' }
        ]
    });

    assert.deepStrictEqual(waitForMilliseconds.firstCall.args, [ waitDurationMilliseconds ]);
});

test('resolves pull request labels', async function () {
    const engine = createEngine();

    assert.deepStrictEqual(
        await engine.resolvePullRequestLabels({
            githubRepo,
            config: defaultPrLogConfig,
            pullRequests: [ { id: pullRequestId, title: 'Fix bug' } ],
            targetName: undefined,
            targetScopedLabelPattern: undefined
        }),
        [ { id: pullRequestId, title: 'Fix bug', label: 'bug' } ]
    );
});

test('resolves target scoped pull request labels', async function () {
    const engine = createEngine({
        getPullRequestLabels: fake.resolves([ 'feature', 'pkg-a:bug' ])
    });

    assert.deepStrictEqual(
        await engine.resolvePullRequestLabels({
            githubRepo,
            config: defaultPrLogConfig,
            pullRequests: [ { id: pullRequestId, title: 'Fix bug' } ],
            targetName: 'pkg-a',
            targetScopedLabelPattern: undefined
        }),
        [ { id: pullRequestId, title: 'Fix bug', label: 'bug' } ]
    );
});

test('resolves pull request labels with custom config labels', async function () {
    const customConfig: PrLogConfig = {
        ...defaultPrLogConfig,
        validLabels: new Map([ [ 'custom', 'Custom Changes' ] ]),
        versionBumps: { major: [], minor: [], patch: [ 'custom' ] }
    };
    const engine = createEngine({
        getPullRequestLabels: fake.resolves([ 'custom' ])
    });

    assert.deepStrictEqual(
        await engine.resolvePullRequestLabels({
            githubRepo,
            config: customConfig,
            pullRequests: [ { id: pullRequestId, title: 'Custom change' } ],
            targetName: undefined,
            targetScopedLabelPattern: undefined
        }),
        [ { id: pullRequestId, title: 'Custom change', label: 'custom' } ]
    );
});

test('resolves pull request labels with ignored config labels', async function () {
    const config: PrLogConfig = { ...defaultPrLogConfig, ignoredLabels: [ 'release' ] };
    const engine = createEngine({
        getPullRequestLabels: fake.resolves([ 'release', 'bug' ])
    });

    assert.deepStrictEqual(
        await engine.resolvePullRequestLabels({
            githubRepo,
            config,
            pullRequests: [ { id: pullRequestId, title: 'Release prep' } ],
            targetName: undefined,
            targetScopedLabelPattern: undefined
        }),
        []
    );
});

test('renders changelog markdown', function () {
    const engine = createEngine();

    const changelog = engine.renderChangelog({
        config: defaultPrLogConfig,
        currentDate: new Date(0),
        mergedPullRequests: [ { id: pullRequestId, title: 'Fix bug', label: 'bug' } ],
        githubRepo,
        unreleased: false,
        versionNumber: '1.0.0'
    });

    assert.ok(changelog.includes('## 1.0.0 (January 1, 1970)'));
});

test('renders changelog markdown with configured date format', function () {
    const engine = createEngine();

    const changelog = engine.renderChangelog({
        config: { ...defaultPrLogConfig, dateFormat: 'dd.MM.yyyy' },
        currentDate: new Date(0),
        mergedPullRequests: [ { id: pullRequestId, title: 'Fix bug', label: 'bug' } ],
        githubRepo,
        unreleased: false,
        versionNumber: '1.0.0'
    });

    assert.ok(changelog.includes('## 1.0.0 (01.01.1970)'));
});

test('renders changelog markdown with configured collapse rules', function () {
    const engine = createEngine();
    const config: PrLogConfig = {
        ...defaultPrLogConfig,
        validLabels: new Map([ [ 'upgrade', 'Dependency Upgrades' ] ]),
        versionBumps: { major: [], minor: [], patch: [ 'upgrade' ] },
        collapseRules: [
            {
                label: 'upgrade',
                pattern: /^Update (?<dependency>.+) from (?<from>.+) to (?<to>.+)$/u,
                replace: 'Update $<dependency> from $<from> to $<to>',
                keyGroup: 'dependency',
                fromGroup: 'from',
                toGroup: 'to'
            }
        ]
    };

    const changelog = engine.renderChangelog({
        config,
        currentDate: new Date(0),
        mergedPullRequests: [
            { id: 3, title: 'Update foo from 2 to 3', label: 'upgrade' },
            { id: 2, title: 'Update foo from 1 to 2', label: 'upgrade' }
        ],
        githubRepo,
        unreleased: true,
        versionNumber: undefined
    });

    assert.ok(
        changelog.includes(
            '* Update foo from 1 to 3 ([#3](https://github.com/owner/repo/pull/3), [#2](https://github.com/owner/repo/pull/2))'
        )
    );
});

test('resolves version number with configured version bump labels', function () {
    const engine = createEngine();
    const config: PrLogConfig = {
        ...defaultPrLogConfig,
        validLabels: new Map([ [ 'documentation', 'Documentation' ] ]),
        versionBumps: { major: [], minor: [ 'documentation' ], patch: [] }
    };

    const versionNumber = engine.resolveVersionNumber({
        latestVersionTag: '1.2.3',
        mergedPullRequests: [ { id: pullRequestId, title: 'Docs', label: 'documentation' } ],
        config
    });

    assert.strictEqual(versionNumber, '1.3.0');
});

test('uses configured label lookup interval and maximum rate-limit retry count', async function () {
    const waitForMilliseconds = fake.resolves(undefined);
    const config: PrLogConfig = {
        ...defaultPrLogConfig,
        labelLookupIntervalMilliseconds: 123,
        maximumRateLimitRetryCount: 5
    };
    const getPullRequestLabels = fake.resolves([ 'bug' ]);
    const engine = createEngine({ waitForMilliseconds, getPullRequestLabels });

    await engine.resolvePullRequestLabels({
        githubRepo,
        config,
        pullRequests: [
            { id: pullRequestId, title: 'Fix bug' },
            { id: documentationPullRequestId, title: 'Fix another bug' }
        ],
        targetName: undefined,
        targetScopedLabelPattern: undefined
    });

    assert.deepStrictEqual(waitForMilliseconds.firstCall.args, [ 123 ]);
    const labelReaderDependencies = getPullRequestLabels.firstCall.args[2] as {
        readonly maximumRateLimitRetryCount: number;
    };
    assert.strictEqual(labelReaderDependencies.maximumRateLimitRetryCount, 5);
});

test('renders target changelog markdown', function () {
    const engine = createEngine();

    const changelog = engine.renderTargetChangelog({
        config: defaultPrLogConfig,
        currentDate: new Date(0),
        targetName: 'pkg-a',
        mergedPullRequests: [ { id: pullRequestId, title: 'Fix bug', label: 'bug' } ],
        githubRepo,
        unreleased: true,
        versionNumber: undefined
    });

    assert.ok(changelog.includes('### Bug Fixes'));
});

test('renders grouped target changelog markdown', function () {
    const engine = createEngine();

    const changelog = engine.renderGroupedTargetChangelog({
        config: defaultPrLogConfig,
        currentDate: new Date(0),
        targets: [
            {
                targetName: 'pkg-a',
                mergedPullRequests: [ { id: pullRequestId, title: 'Fix bug', label: 'bug' } ],
                unreleased: false,
                versionNumber: '1.0.0'
            },
            {
                targetName: 'pkg-b',
                mergedPullRequests: [ { id: documentationPullRequestId, title: 'Add docs', label: 'documentation' } ],
                unreleased: false,
                versionNumber: '2.0.0'
            }
        ],
        githubRepo
    });

    assert.ok(changelog.includes('## pkg-a 1.0.0 (January 1, 1970)'));
    assert.ok(changelog.includes('## pkg-b 2.0.0 (January 1, 1970)'));
});

test('updates changelog markdown', function () {
    const engine = createEngine();

    const changelog = engine.updateChangelog({
        existingChangelogMarkdown: '## 0.9.0\n\n* Older change\n',
        generatedChangelogMarkdown: '## 1.0.0\n\n* New change\n'
    });

    assert.strictEqual(changelog, '## 1.0.0\n\n* New change\n\n## 0.9.0\n\n* Older change\n');
});

test('extracts changelog release sections', function () {
    const engine = createEngine();

    const releaseSection = engine.extractChangelogReleaseSection({
        changelogMarkdown:
            '## 1.0.0 (January 1, 1970)\n\n* New change\n\n## 0.9.0 (December 31, 1969)\n\n* Older change\n',
        targetName: undefined,
        versionNumber: '1.0.0'
    });

    assert.deepStrictEqual(releaseSection, ok('## 1.0.0 (January 1, 1970)\n\n* New change'));
});
