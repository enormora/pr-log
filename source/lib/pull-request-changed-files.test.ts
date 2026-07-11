import assert from 'node:assert';
import { fake } from 'sinon';
import { fetchPullRequestChangedFiles, type PullRequestChangedFile } from './pull-request-changed-files.ts';

const secondPullRequestId = 2;

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

test('fetches changed files for pull requests', async function () {
    const getChangedFiles = fake(async function (_githubRepo, pullRequestId: number) {
        return pullRequestId === 1 ? [ changedFile('source/a.ts') ] : [ changedFile('source/b.ts') ];
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
        [ 1, [ changedFile('source/a.ts') ] ],
        [ secondPullRequestId, [ changedFile('source/b.ts') ] ]
    ]);
});
