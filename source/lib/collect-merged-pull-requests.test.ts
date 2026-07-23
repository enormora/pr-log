import assert from 'node:assert';
import { fake } from 'sinon';
import { collectMergedPullRequests, type PullRequestDataReader } from './collect-merged-pull-requests.ts';

const secondPullRequestId = 2;

type TestPullRequestDataReader = {
    readonly pullRequestDataReader: PullRequestDataReader;
    readonly readPullRequestData: ReturnType<typeof fake>;
};

function createPullRequestDataReader(title: string): TestPullRequestDataReader {
    const readPullRequestData = fake.resolves({
        title,
        merged: true,
        mergeCommitSha: 'hash',
        labels: []
    });

    return {
        pullRequestDataReader: {
            readPullRequestData,
            readCachedPullRequestLabels: fake.returns(undefined)
        },
        readPullRequestData
    };
}

test('collects merged pull requests for a base ref', async function () {
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'hash-1',
            parents: [ 'parent-1', 'parent-2' ],
            subject: 'Merge pull request #1 from branch',
            body: 'Use commit body title'
        },
        {
            hash: 'hash-2',
            parents: [ 'parent-3', 'parent-4' ],
            subject: 'Merge pull request #2 from other',
            body: undefined
        }
    ]);
    const { pullRequestDataReader, readPullRequestData } = createPullRequestDataReader('Use GitHub title');

    const pullRequests = await collectMergedPullRequests({
        githubRepo: 'owner/repo',
        baseRef: 'base-ref',
        git: { getFirstParentCommitLogs },
        pullRequestDataReader
    });

    assert.deepStrictEqual(getFirstParentCommitLogs.firstCall.args, [ 'base-ref' ]);
    assert.deepStrictEqual(readPullRequestData.firstCall.args, [
        'owner/repo',
        secondPullRequestId
    ]);
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
            parents: [ 'parent-1' ],
            subject: 'Revert "Merge pull request #1 from branch"',
            body: `This reverts commit ${revertedMergeCommitHash}.`
        },
        {
            hash: revertedMergeCommitHash,
            parents: [ 'parent-2', 'parent-3' ],
            subject: 'Merge pull request #1 from branch',
            body: 'Use commit body title'
        }
    ]);

    const pullRequests = await collectMergedPullRequests({
        githubRepo: 'owner/repo',
        baseRef: 'base-ref',
        git: { getFirstParentCommitLogs },
        pullRequestDataReader: createPullRequestDataReader('Use GitHub title').pullRequestDataReader
    });

    assert.deepStrictEqual(pullRequests, []);
});

test('keeps a revert when the reverted merge is outside the range', async function () {
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            parents: [ 'parent-1' ],
            subject: 'Revert "Merge pull request #1 from branch"',
            body: 'This reverts commit aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.'
        }
    ]);
    const { pullRequestDataReader, readPullRequestData } = createPullRequestDataReader('Use GitHub title');

    const pullRequests = await collectMergedPullRequests({
        githubRepo: 'owner/repo',
        baseRef: 'base-ref',
        git: { getFirstParentCommitLogs },
        pullRequestDataReader
    });

    assert.deepStrictEqual(readPullRequestData.firstCall.args, [ 'owner/repo', 1 ]);
    assert.deepStrictEqual(pullRequests, [ { id: 1, title: 'Revert "Use GitHub title"' } ]);
});

test('throws when fallback pull request title data is missing', async function () {
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            parents: [ 'parent-1', 'parent-2' ],
            subject: 'Merge pull request #864 from branch',
            body: undefined
        }
    ]);

    await assert.rejects(
        collectMergedPullRequests({
            githubRepo: 'owner/repo',
            baseRef: 'base-ref',
            git: { getFirstParentCommitLogs },
            pullRequestDataReader: {
                readPullRequestData: fake.resolves(undefined),
                readCachedPullRequestLabels: fake.returns(undefined)
            }
        }),
        { message: 'Pull Request #864 was not found' }
    );
});

test('throws when the reverted pull request cannot be extracted from the commit message', async function () {
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            parents: [ 'parent-1' ],
            subject: 'Revert "Merge pull request foo from branch"',
            body: 'This reverts commit aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.'
        }
    ]);

    await assert.rejects(
        collectMergedPullRequests({
            githubRepo: 'owner/repo',
            baseRef: 'base-ref',
            git: { getFirstParentCommitLogs },
            pullRequestDataReader: createPullRequestDataReader('Use GitHub title').pullRequestDataReader
        }),
        { message: 'Failed to extract pull request id from reverted merge commit log' }
    );
});

test('collects single-parent pull request subject commits when the merge commit sha matches', async function () {
    const readPullRequestData = fake.resolves({
        title: 'Unused GitHub title',
        merged: true,
        mergeCommitSha: 'commit-hash',
        labels: []
    });
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'commit-hash',
            parents: [ 'parent-hash' ],
            subject: 'Open the starlit gate (#731)',
            body: 'Expanded commit body'
        }
    ]);

    const pullRequests = await collectMergedPullRequests({
        githubRepo: 'owner/repo',
        baseRef: 'base-ref',
        git: { getFirstParentCommitLogs },
        pullRequestDataReader: { readPullRequestData, readCachedPullRequestLabels: fake.returns(undefined) }
    });

    assert.deepStrictEqual(readPullRequestData.firstCall.args, [ 'owner/repo', 731 ]);
    assert.deepStrictEqual(pullRequests, [ { id: 731, title: 'Open the starlit gate' } ]);
});

test('ignores pull request subject commits with more than one parent without reading GitHub data', async function () {
    const readPullRequestData = fake.resolves({
        title: 'Unused GitHub title',
        merged: true,
        mergeCommitSha: 'commit-hash',
        labels: []
    });
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'commit-hash',
            parents: [ 'first-parent', 'second-parent' ],
            subject: 'Chart the hidden realm (#274)',
            body: undefined
        }
    ]);

    const pullRequests = await collectMergedPullRequests({
        githubRepo: 'owner/repo',
        baseRef: 'base-ref',
        git: { getFirstParentCommitLogs },
        pullRequestDataReader: { readPullRequestData, readCachedPullRequestLabels: fake.returns(undefined) }
    });

    assert.strictEqual(readPullRequestData.callCount, 0);
    assert.deepStrictEqual(pullRequests, []);
});

test('ignores single-parent pull request subject commits when GitHub has no matching pull request', async function () {
    const readPullRequestData = fake.resolves(undefined);
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'commit-hash',
            parents: [ 'parent-hash' ],
            subject: 'Forge the crystal key (#618)',
            body: undefined
        }
    ]);

    const pullRequests = await collectMergedPullRequests({
        githubRepo: 'owner/repo',
        baseRef: 'base-ref',
        git: { getFirstParentCommitLogs },
        pullRequestDataReader: { readPullRequestData, readCachedPullRequestLabels: fake.returns(undefined) }
    });

    assert.deepStrictEqual(pullRequests, []);
});

test('ignores single-parent pull request subject commits when the merge commit sha differs', async function () {
    const readPullRequestData = fake.resolves({
        title: 'Unused GitHub title',
        merged: true,
        mergeCommitSha: 'different-hash',
        labels: []
    });
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'commit-hash',
            parents: [ 'parent-hash' ],
            subject: 'Banish the mirrored crown (#386)',
            body: undefined
        }
    ]);

    const pullRequests = await collectMergedPullRequests({
        githubRepo: 'owner/repo',
        baseRef: 'base-ref',
        git: { getFirstParentCommitLogs },
        pullRequestDataReader: { readPullRequestData, readCachedPullRequestLabels: fake.returns(undefined) }
    });

    assert.deepStrictEqual(pullRequests, []);
});

test('throws when reading pull request subject commit data fails', async function () {
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'commit-hash',
            parents: [ 'parent-hash' ],
            subject: 'Summon the silver beacon (#942)',
            body: undefined
        }
    ]);

    await assert.rejects(
        collectMergedPullRequests({
            githubRepo: 'owner/repo',
            baseRef: 'base-ref',
            git: { getFirstParentCommitLogs },
            pullRequestDataReader: {
                readPullRequestData: fake.rejects(new Error('GitHub failed')),
                readCachedPullRequestLabels: fake.returns(undefined)
            }
        }),
        { message: 'GitHub failed' }
    );
});
