import assert from 'node:assert';
import { fake } from 'sinon';
import {
    collectMergedPullRequests,
    createGitHubPullRequestChangedFilesReader,
    createGitHubPullRequestLabelReader,
    defaultValidLabels as exportedDefaultValidLabels,
    fetchPullRequestChangedFiles,
    formatPackageVersionTag,
    getPullRequestLabels,
    renderChangelogMarkdown,
    resolveChangelogBaseRef,
    resolveLatestSemverTagBaseRef,
    resolvePullRequestLabels,
    type GitHubPullRequestLabelReaderDependencies,
    type PullRequest,
    type ReleasePlanPackage
} from './index.ts';
import { defaultValidLabels } from './lib/valid-labels.ts';

const pullRequestId = 1;
const pullRequests: readonly PullRequest[] = [{ id: pullRequestId, title: 'title' }];

test('exports base ref resolvers', async () => {
    assert.deepStrictEqual(resolveLatestSemverTagBaseRef({ tags: ['1.0.0'] }), { ref: '1.0.0' });
    assert.strictEqual(
        formatPackageVersionTag({ packageName: 'pkg', version: '1.0.0', packageTagFormat: undefined }),
        'pkg@1.0.0'
    );

    const baseRef = await resolveChangelogBaseRef(
        {
            packageName: 'pkg',
            previousVersion: undefined,
            previousGitHead: undefined,
            packageTagFormat: undefined,
            explicitBaseRef: 'base'
        },
        { hasRef: fake.resolves(true) }
    );

    assert.deepStrictEqual(baseRef, { ref: 'base' });
});

test('exports pull request collection and label resolution', async () => {
    const collectedPullRequests = await collectMergedPullRequests({
        githubRepo: 'owner/repo',
        baseRef: 'base',
        git: {
            getFirstParentCommitLogs: fake.resolves([
                { hash: 'hash-1', subject: 'Merge pull request #1 from branch', body: 'title' }
            ])
        },
        pullRequestTitleReader: { getTitle: fake.resolves('fallback title') }
    });

    assert.deepStrictEqual(collectedPullRequests, pullRequests);
    assert.deepStrictEqual(
        await resolvePullRequestLabels({
            githubRepo: 'owner/repo',
            validLabels: defaultValidLabels,
            pullRequests,
            pullRequestLabelReader: { getLabels: fake.resolves(['bug']) },
            waitForMilliseconds: fake.resolves(undefined),
            labelLookupIntervalMilliseconds: 0,
            targetName: undefined,
            targetScopedLabelPattern: undefined
        }),
        [{ id: pullRequestId, title: 'title', label: 'bug' }]
    );
});

test('exports pull request label collection', async () => {
    const listLabelsOnIssue = fake.resolves({ data: [{ name: 'bug' }] });
    const githubClientValue: unknown = { issues: { listLabelsOnIssue } };
    const dependencies: GitHubPullRequestLabelReaderDependencies = {
        githubClient: githubClientValue as GitHubPullRequestLabelReaderDependencies['githubClient'],
        waitForMilliseconds: fake.resolves(undefined),
        getCurrentDate: fake.returns(new Date(0)),
        maximumRateLimitRetryCount: 0
    };
    const pullRequestLabelReader = createGitHubPullRequestLabelReader(dependencies);

    assert.deepStrictEqual(await pullRequestLabelReader.getLabels('owner/repo', pullRequestId), ['bug']);
    assert.deepStrictEqual(await getPullRequestLabels('owner/repo', pullRequestId, dependencies), ['bug']);
});

test('exports changed file collection', async () => {
    const changedFilesReader = createGitHubPullRequestChangedFilesReader({
        paginate: fake.resolves([{ filename: 'source/index.ts' }]),
        pulls: { listFiles: fake() }
    } as never);

    assert.deepStrictEqual(await changedFilesReader.getChangedFiles('owner/repo', pullRequestId), ['source/index.ts']);

    const changedFilesByPullRequest = await fetchPullRequestChangedFiles({
        githubRepo: 'owner/repo',
        pullRequests,
        pullRequestChangedFilesReader: { getChangedFiles: fake.resolves(['source/index.ts']) }
    });

    assert.deepStrictEqual(Array.from(changedFilesByPullRequest.entries()), [[pullRequestId, ['source/index.ts']]]);
});

test('exports changelog rendering', () => {
    const changelog = renderChangelogMarkdown({
        packageInfo: {},
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        mergedPullRequests: [{ id: pullRequestId, title: 'title', label: 'bug' }],
        githubRepo: 'owner/repo',
        unreleased: false,
        versionNumber: '1.0.0'
    });

    assert.ok(changelog.includes('## 1.0.0'));
});

test('exports the release plan package type', () => {
    const releasePlanPackage: ReleasePlanPackage = {
        name: 'pkg',
        previousVersion: undefined,
        nextVersion: '1.0.0',
        changed: true,
        previousGitHead: undefined,
        currentGitHead: 'abc123',
        sourceFiles: ['source/index.ts'],
        changedArtifactFiles: ['target/index.js']
    };

    assert.strictEqual(releasePlanPackage.name, 'pkg');
});

test('exports default valid labels', () => {
    assert.strictEqual(exportedDefaultValidLabels.get('bug'), 'Bug Fixes');
});
