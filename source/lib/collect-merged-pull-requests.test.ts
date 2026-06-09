import assert from 'node:assert';
import { fake } from 'sinon';
import { collectMergedPullRequests } from './collect-merged-pull-requests.ts';

const secondPullRequestId = 2;

test('collects merged pull requests for a base ref', async () => {
    const getMergeCommitLogs = fake.resolves([
        { subject: 'Merge pull request #1 from branch', body: 'Use commit body title' },
        { subject: 'Merge pull request #2 from other', body: undefined }
    ]);
    const getTitle = fake.resolves('Use GitHub title');

    const pullRequests = await collectMergedPullRequests({
        githubRepo: 'owner/repo',
        baseRef: 'base-ref',
        git: { getMergeCommitLogs },
        pullRequestTitleReader: { getTitle }
    });

    assert.deepStrictEqual(getMergeCommitLogs.firstCall.args, ['base-ref']);
    assert.deepStrictEqual(getTitle.firstCall.args, ['owner/repo', secondPullRequestId]);
    assert.deepStrictEqual(pullRequests, [
        { id: 1, title: 'Use commit body title' },
        { id: secondPullRequestId, title: 'Use GitHub title' }
    ]);
});
