import assert from 'node:assert';
import { fake } from 'sinon';
import { resolvePullRequestLabels } from './resolve-pull-request-labels.ts';
import { defaultValidLabels } from './valid-labels.ts';

const labelLookupIntervalMilliseconds = 250;
const secondPullRequestId = 2;

test('resolves labels for pull requests sequentially', async () => {
    const getLabel = fake(async (_githubRepo, _validLabels, pullRequestId: number) => {
        return pullRequestId === 1 ? 'bug' : 'documentation';
    });
    const waitForMilliseconds = fake.resolves(undefined);

    const pullRequests = await resolvePullRequestLabels({
        githubRepo: 'owner/repo',
        validLabels: defaultValidLabels,
        pullRequests: [
            { id: 1, title: 'Fix bug' },
            { id: secondPullRequestId, title: 'Update docs' }
        ],
        pullRequestLabelReader: { getLabel },
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
