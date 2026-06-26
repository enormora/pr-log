import assert from 'node:assert';
import { filterPullRequestsByTargetFiles } from './filter-pull-requests-by-target-files.ts';
import type { PullRequest } from './collect-merged-pull-requests.ts';

const pullRequests: readonly PullRequest[] = [
    { id: 1, title: 'Fix target' },
    { id: 2, title: 'Fix unrelated' },
    { id: 3, title: 'Update changelog' }
];
const unrelatedPullRequestId = 2;
const changelogPullRequestId = 3;

test('keeps pull requests that changed target source files', function () {
    const changedFilesByPullRequest = new Map<number, readonly string[]>([
        [ 1, [ 'source/index.ts' ] ],
        [ unrelatedPullRequestId, [ 'test/index.test.ts' ] ]
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
    const changedFilesByPullRequest = new Map<number, readonly string[]>([ [ 1, [ '.\\source\\index.ts' ] ] ]);

    const filteredPullRequests = filterPullRequestsByTargetFiles({
        targetName: 'target',
        targetSourceFiles: [ './source/index.ts' ],
        pullRequests: [ { id: 1, title: 'Fix target' } ],
        changedFilesByPullRequest,
        ignoredAttributionPaths: []
    });

    assert.deepStrictEqual(filteredPullRequests, [ { id: 1, title: 'Fix target' } ]);
});

test('ignores supplied attribution paths', function () {
    const changedFilesByPullRequest = new Map<number, readonly string[]>([
        [ 1, [ 'source/index.ts' ] ],
        [ changelogPullRequestId, [ 'CHANGELOG.md' ] ]
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
