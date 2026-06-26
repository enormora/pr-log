import assert from 'node:assert';
import { fake } from 'sinon';
import { resolvePullRequestLabels } from './resolve-pull-request-labels.ts';
import { defaultValidLabels } from './valid-labels.ts';

const labelLookupIntervalMilliseconds = 250;
const secondPullRequestId = 2;

test('resolves labels for pull requests sequentially', async function () {
    const getLabels = fake(async function (_githubRepo, pullRequestId: number) {
        return [ pullRequestId === 1 ? 'bug' : 'documentation' ];
    });
    const waitForMilliseconds = fake.resolves(undefined);

    const pullRequests = await resolvePullRequestLabels({
        githubRepo: 'owner/repo',
        validLabels: defaultValidLabels,
        ignoredLabels: [],
        pullRequests: [
            { id: 1, title: 'Fix bug' },
            { id: secondPullRequestId, title: 'Update docs' }
        ],
        pullRequestLabelReader: { getLabels },
        waitForMilliseconds,
        labelLookupIntervalMilliseconds,
        targetName: undefined,
        targetScopedLabelPattern: undefined
    });

    assert.strictEqual(waitForMilliseconds.callCount, 1);
    assert.deepStrictEqual(waitForMilliseconds.firstCall.args, [ labelLookupIntervalMilliseconds ]);
    assert.deepStrictEqual(pullRequests, [
        { id: 1, title: 'Fix bug', label: 'bug' },
        { id: secondPullRequestId, title: 'Update docs', label: 'documentation' }
    ]);
});

test('applies target scoped labels over pull request level labels', async function () {
    const pullRequests = await resolvePullRequestLabels({
        githubRepo: 'owner/repo',
        validLabels: defaultValidLabels,
        ignoredLabels: [],
        pullRequests: [ { id: 1, title: 'Fix bug' } ],
        pullRequestLabelReader: { getLabels: fake.resolves([ 'bug', 'pkg-a:breaking' ]) },
        waitForMilliseconds: fake.resolves(undefined),
        labelLookupIntervalMilliseconds: 0,
        targetName: 'pkg-a',
        targetScopedLabelPattern: undefined
    });

    assert.deepStrictEqual(pullRequests, [ { id: 1, title: 'Fix bug', label: 'breaking' } ]);
});

test('ignores raw labels that are not valid labels', async function () {
    const pullRequests = await resolvePullRequestLabels({
        githubRepo: 'owner/repo',
        validLabels: defaultValidLabels,
        ignoredLabels: [],
        pullRequests: [ { id: 1, title: 'Fix bug' } ],
        pullRequestLabelReader: { getLabels: fake.resolves([ 'bug', 'not-for-changelog' ]) },
        waitForMilliseconds: fake.resolves(undefined),
        labelLookupIntervalMilliseconds: 0,
        targetName: undefined,
        targetScopedLabelPattern: undefined
    });

    assert.deepStrictEqual(pullRequests, [ { id: 1, title: 'Fix bug', label: 'bug' } ]);
});

test('rejects missing pull request level labels', async function () {
    await assert.rejects(
        resolvePullRequestLabels({
            githubRepo: 'owner/repo',
            validLabels: defaultValidLabels,
            ignoredLabels: [],
            pullRequests: [ { id: 1, title: 'Fix bug' } ],
            pullRequestLabelReader: { getLabels: fake.resolves([ 'not-for-changelog' ]) },
            waitForMilliseconds: fake.resolves(undefined),
            labelLookupIntervalMilliseconds: 0,
            targetName: undefined,
            targetScopedLabelPattern: undefined
        }),
        {
            message:
                'Pull Request #1 has no label of breaking, bug, feature, enhancement, documentation, upgrade, refactor, build'
        }
    );
});

test('rejects multiple pull request level labels', async function () {
    await assert.rejects(
        resolvePullRequestLabels({
            githubRepo: 'owner/repo',
            validLabels: defaultValidLabels,
            ignoredLabels: [],
            pullRequests: [ { id: 1, title: 'Fix bug' } ],
            pullRequestLabelReader: { getLabels: fake.resolves([ 'bug', 'documentation' ]) },
            waitForMilliseconds: fake.resolves(undefined),
            labelLookupIntervalMilliseconds: 0,
            targetName: undefined,
            targetScopedLabelPattern: undefined
        }),
        {
            message:
                'Pull Request #1 has multiple labels of breaking, bug, feature, enhancement, documentation, upgrade, refactor, build'
        }
    );
});

test('ignores scoped labels for other targets', async function () {
    const pullRequests = await resolvePullRequestLabels({
        githubRepo: 'owner/repo',
        validLabels: defaultValidLabels,
        ignoredLabels: [],
        pullRequests: [ { id: 1, title: 'Fix bug' } ],
        pullRequestLabelReader: { getLabels: fake.resolves([ 'bug', 'pkg-a:breaking' ]) },
        waitForMilliseconds: fake.resolves(undefined),
        labelLookupIntervalMilliseconds: 0,
        targetName: 'pkg-b',
        targetScopedLabelPattern: undefined
    });

    assert.deepStrictEqual(pullRequests, [ { id: 1, title: 'Fix bug', label: 'bug' } ]);
});

test('rejects conflicting target scoped labels', async function () {
    await assert.rejects(
        resolvePullRequestLabels({
            githubRepo: 'owner/repo',
            validLabels: defaultValidLabels,
            ignoredLabels: [],
            pullRequests: [ { id: 1, title: 'Fix bug' } ],
            pullRequestLabelReader: { getLabels: fake.resolves([ 'bug', 'pkg-a:breaking', 'pkg-a:feature' ]) },
            waitForMilliseconds: fake.resolves(undefined),
            labelLookupIntervalMilliseconds: 0,
            targetName: 'pkg-a',
            targetScopedLabelPattern: undefined
        }),
        { message: 'Pull Request #1 has multiple scoped labels for "pkg-a"' }
    );
});

test('rejects unknown target scoped labels', async function () {
    await assert.rejects(
        resolvePullRequestLabels({
            githubRepo: 'owner/repo',
            validLabels: defaultValidLabels,
            ignoredLabels: [],
            pullRequests: [ { id: 1, title: 'Fix bug' } ],
            pullRequestLabelReader: { getLabels: fake.resolves([ 'bug', 'pkg-a:not-real' ]) },
            waitForMilliseconds: fake.resolves(undefined),
            labelLookupIntervalMilliseconds: 0,
            targetName: 'pkg-a',
            targetScopedLabelPattern: undefined
        }),
        { message: 'Pull Request #1 has unknown label "pkg-a:not-real"' }
    );
});

test('supports scoped package names in target labels', async function () {
    const pullRequests = await resolvePullRequestLabels({
        githubRepo: 'owner/repo',
        validLabels: defaultValidLabels,
        ignoredLabels: [],
        pullRequests: [ { id: 1, title: 'Fix bug' } ],
        pullRequestLabelReader: { getLabels: fake.resolves([ 'bug', '@scope/pkg:documentation' ]) },
        waitForMilliseconds: fake.resolves(undefined),
        labelLookupIntervalMilliseconds: 0,
        targetName: '@scope/pkg',
        targetScopedLabelPattern: undefined
    });

    assert.deepStrictEqual(pullRequests, [ { id: 1, title: 'Fix bug', label: 'documentation' } ]);
});

test('skips ignored pull requests before changelog label validation', async function () {
    const pullRequests = await resolvePullRequestLabels({
        githubRepo: 'owner/repo',
        validLabels: defaultValidLabels,
        ignoredLabels: [ 'release' ],
        pullRequests: [ { id: 1, title: 'Prepare release' } ],
        pullRequestLabelReader: { getLabels: fake.resolves([ 'release' ]) },
        waitForMilliseconds: fake.resolves(undefined),
        labelLookupIntervalMilliseconds: 0,
        targetName: undefined,
        targetScopedLabelPattern: undefined
    });

    assert.deepStrictEqual(pullRequests, []);
});
