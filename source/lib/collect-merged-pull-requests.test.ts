import assert from 'node:assert';
import { fake } from 'sinon';
import { collectMergedPullRequests } from './collect-merged-pull-requests.ts';

const secondPullRequestId = 2;

test('collects merged pull requests for a base ref', async function () {
    const getFirstParentCommitLogs = fake.resolves([
        { hash: 'hash-1', subject: 'Merge pull request #1 from branch', body: 'Use commit body title' },
        { hash: 'hash-2', subject: 'Merge pull request #2 from other', body: undefined }
    ]);
    const getTitle = fake.resolves('Use GitHub title');

    const pullRequests = await collectMergedPullRequests({
        githubRepo: 'owner/repo',
        baseRef: 'base-ref',
        git: { getFirstParentCommitLogs },
        pullRequestTitleReader: { getTitle }
    });

    assert.deepStrictEqual(getFirstParentCommitLogs.firstCall.args, [ 'base-ref' ]);
    assert.deepStrictEqual(getTitle.firstCall.args, [ 'owner/repo', secondPullRequestId ]);
    assert.deepStrictEqual(pullRequests, [
        { id: 1, title: 'Use commit body title' },
        { id: secondPullRequestId, title: 'Use GitHub title' }
    ]);
});

test('removes a merge and its revert when both are in the range', async function () {
    const revertedMergeCommitHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            subject: 'Revert "Merge pull request #1 from branch"',
            body: `This reverts commit ${revertedMergeCommitHash}.`
        },
        { hash: revertedMergeCommitHash, subject: 'Merge pull request #1 from branch', body: 'Use commit body title' }
    ]);

    const pullRequests = await collectMergedPullRequests({
        githubRepo: 'owner/repo',
        baseRef: 'base-ref',
        git: { getFirstParentCommitLogs },
        pullRequestTitleReader: { getTitle: fake.resolves('Use GitHub title') }
    });

    assert.deepStrictEqual(pullRequests, []);
});

test('keeps a revert when the reverted merge is outside the range', async function () {
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            subject: 'Revert "Merge pull request #1 from branch"',
            body: 'This reverts commit aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.'
        }
    ]);
    const getTitle = fake.resolves('Use GitHub title');

    const pullRequests = await collectMergedPullRequests({
        githubRepo: 'owner/repo',
        baseRef: 'base-ref',
        git: { getFirstParentCommitLogs },
        pullRequestTitleReader: { getTitle }
    });

    assert.deepStrictEqual(getTitle.firstCall.args, [ 'owner/repo', 1 ]);
    assert.deepStrictEqual(pullRequests, [ { id: 1, title: 'Revert "Use GitHub title"' } ]);
});

test('throws when the reverted pull request cannot be extracted from the commit message', async function () {
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            subject: 'Revert "Merge pull request foo from branch"',
            body: 'This reverts commit aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.'
        }
    ]);

    await assert.rejects(
        collectMergedPullRequests({
            githubRepo: 'owner/repo',
            baseRef: 'base-ref',
            git: { getFirstParentCommitLogs },
            pullRequestTitleReader: { getTitle: fake.resolves('Use GitHub title') }
        }),
        { message: 'Failed to extract pull request id from reverted merge commit log' }
    );
});
