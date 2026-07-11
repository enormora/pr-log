import assert from 'node:assert';
import { filterPullRequestsByTargetFiles } from './filter-pull-requests-by-target-files.ts';
import type { PullRequest } from './collect-merged-pull-requests.ts';
import type { PullRequestChangedFile } from './pull-request-changed-files.ts';

const pullRequests: readonly PullRequest[] = [
    { id: 1, title: 'Fix target' },
    { id: 2, title: 'Fix unrelated' },
    { id: 3, title: 'Update changelog' }
];
const unrelatedPullRequestId = 2;
const changelogPullRequestId = 3;

function changedFile(path: string, previousPath?: string): PullRequestChangedFile {
    return {
        path,
        previousPath,
        status: previousPath === undefined ? 'modified' : 'renamed',
        additions: 1,
        deletions: 0,
        changes: 1
    };
}

test('keeps pull requests that changed target source files', function () {
    const changedFilesByPullRequest = new Map<number, readonly PullRequestChangedFile[]>([
        [ 1, [ changedFile('source/index.ts') ] ],
        [ unrelatedPullRequestId, [ changedFile('test/index.test.ts') ] ]
    ]);

    const filteredPullRequests = filterPullRequestsByTargetFiles({
        targetName: 'target',
        targetSourceFiles: [ 'source/index.ts' ],
        pullRequests,
        changedFilesByPullRequest,
        ignoredAttributionPaths: []
    });

    assert.deepStrictEqual(filteredPullRequests, [ { id: 1, title: 'Fix target' } ]);
});

test('normalizes repository paths before matching target files', function () {
    const changedFilesByPullRequest = new Map<number, readonly PullRequestChangedFile[]>([
        [ 1, [ changedFile('.\\source\\index.ts') ] ]
    ]);

    const filteredPullRequests = filterPullRequestsByTargetFiles({
        targetName: 'target',
        targetSourceFiles: [ './source/index.ts' ],
        pullRequests: [ { id: 1, title: 'Fix target' } ],
        changedFilesByPullRequest,
        ignoredAttributionPaths: []
    });

    assert.deepStrictEqual(filteredPullRequests, [ { id: 1, title: 'Fix target' } ]);
});

test('keeps pull requests that renamed target source files', function () {
    const changedFilesByPullRequest = new Map<number, readonly PullRequestChangedFile[]>([
        [ 1, [ changedFile('source/new.ts', 'source/index.ts') ] ]
    ]);

    const filteredPullRequests = filterPullRequestsByTargetFiles({
        targetName: 'target',
        targetSourceFiles: [ 'source/index.ts' ],
        pullRequests: [ { id: 1, title: 'Rename target' } ],
        changedFilesByPullRequest,
        ignoredAttributionPaths: []
    });

    assert.deepStrictEqual(filteredPullRequests, [ { id: 1, title: 'Rename target' } ]);
});

test('ignores supplied attribution paths', function () {
    const changedFilesByPullRequest = new Map<number, readonly PullRequestChangedFile[]>([
        [ 1, [ changedFile('source/index.ts') ] ],
        [ changelogPullRequestId, [ changedFile('CHANGELOG.md') ] ]
    ]);

    const filteredPullRequests = filterPullRequestsByTargetFiles({
        targetName: 'target',
        targetSourceFiles: [ 'source/index.ts', 'CHANGELOG.md' ],
        pullRequests,
        changedFilesByPullRequest,
        ignoredAttributionPaths: [ 'CHANGELOG.md' ]
    });

    assert.deepStrictEqual(filteredPullRequests, [ { id: 1, title: 'Fix target' } ]);
});
