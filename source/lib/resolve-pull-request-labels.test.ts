import assert from 'node:assert';
import { fake } from 'sinon';
import { resolvePullRequestLabels } from './resolve-pull-request-labels.ts';
import { defaultValidLabels } from './valid-labels.ts';

const labelLookupIntervalMilliseconds = 250;
const secondPullRequestId = 2;

test('resolves labels for pull requests sequentially', async () => {
    const getLabels = fake(async (_githubRepo, pullRequestId: number) => {
        return [pullRequestId === 1 ? 'bug' : 'documentation'];
    });
    const waitForMilliseconds = fake.resolves(undefined);

    const pullRequests = await resolvePullRequestLabels({
        githubRepo: 'owner/repo',
        validLabels: defaultValidLabels,
        pullRequests: [
            { id: 1, title: 'Fix bug' },
            { id: secondPullRequestId, title: 'Update docs' }
        ],
        pullRequestLabelReader: { getLabels },
        waitForMilliseconds,
        labelLookupIntervalMilliseconds
    });

    assert.strictEqual(waitForMilliseconds.callCount, 1);
    assert.deepStrictEqual(waitForMilliseconds.firstCall.args, [labelLookupIntervalMilliseconds]);
    assert.deepStrictEqual(pullRequests, [
        { id: 1, title: 'Fix bug', label: 'bug' },
        { id: secondPullRequestId, title: 'Update docs', label: 'documentation' }
    ]);
});

test('ignores raw labels that are not valid labels', async () => {
    const pullRequests = await resolvePullRequestLabels({
        githubRepo: 'owner/repo',
        validLabels: defaultValidLabels,
        pullRequests: [{ id: 1, title: 'Fix bug' }],
        pullRequestLabelReader: { getLabels: fake.resolves(['bug', 'not-for-changelog']) },
        waitForMilliseconds: fake.resolves(undefined),
        labelLookupIntervalMilliseconds: 0
    });

    assert.deepStrictEqual(pullRequests, [{ id: 1, title: 'Fix bug', label: 'bug' }]);
});

test('rejects missing pull request level labels', async () => {
    await assert.rejects(
        resolvePullRequestLabels({
            githubRepo: 'owner/repo',
            validLabels: defaultValidLabels,
            pullRequests: [{ id: 1, title: 'Fix bug' }],
            pullRequestLabelReader: { getLabels: fake.resolves(['not-for-changelog']) },
            waitForMilliseconds: fake.resolves(undefined),
            labelLookupIntervalMilliseconds: 0
        }),
        {
            message:
                'Pull Request #1 has no label of breaking, bug, feature, enhancement, documentation, upgrade, refactor, build'
        }
    );
});

test('rejects multiple pull request level labels', async () => {
    await assert.rejects(
        resolvePullRequestLabels({
            githubRepo: 'owner/repo',
            validLabels: defaultValidLabels,
            pullRequests: [{ id: 1, title: 'Fix bug' }],
            pullRequestLabelReader: { getLabels: fake.resolves(['bug', 'documentation']) },
            waitForMilliseconds: fake.resolves(undefined),
            labelLookupIntervalMilliseconds: 0
        }),
        {
            message:
                'Pull Request #1 has multiple labels of breaking, bug, feature, enhancement, documentation, upgrade, refactor, build'
        }
    );
});
