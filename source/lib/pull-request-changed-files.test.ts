import assert from 'node:assert';
import { fake } from 'sinon';
import { fetchPullRequestChangedFiles } from './pull-request-changed-files.ts';

const secondPullRequestId = 2;

test('fetches changed files for pull requests', async function () {
    const getChangedFiles = fake(async function (_githubRepo, pullRequestId: number) {
        return pullRequestId === 1 ? [ 'source/a.ts' ] : [ 'source/b.ts' ];
    });

    const changedFiles = await fetchPullRequestChangedFiles({
        githubRepo: 'owner/repo',
        pullRequests: [
            { id: 1, title: 'Change a' },
            { id: secondPullRequestId, title: 'Change b' }
        ],
        pullRequestChangedFilesReader: { getChangedFiles }
    });

    assert.deepStrictEqual(Array.from(changedFiles), [
        [ 1, [ 'source/a.ts' ] ],
        [ secondPullRequestId, [ 'source/b.ts' ] ]
    ]);
});
