import assert from 'node:assert';
import { filterPullRequestsByTargetFiles } from '../lib/filter-pull-requests-by-target-files.ts';
import { resolvePrLogReleaseVersion, type PrLogReleaseVersionInput } from './pr-log-release-version.ts';

const bugPullRequestId = 1;
const featurePullRequestId = 2;
const targetSourceFiles = ['source/packages/command-line-interface/program.ts', 'source/lib/create-changelog.ts'];

function createInput(options: {
    readonly currentVersion: string | undefined;
    readonly resolvedLabels: readonly string[];
    readonly collectedBaseRefs: string[];
    readonly changedFilesByPullRequest: ReadonlyMap<number, readonly string[]>;
}): PrLogReleaseVersionInput {
    return {
        tags: ['pr-log@1.0.0'],
        currentVersion: options.currentVersion,
        packageInfo: {
            'pr-log': {
                versionBumps: {
                    major: ['breaking'],
                    minor: ['feature'],
                    patch: ['bug']
                }
            }
        },
        githubRepo: 'owner/repository',
        validLabels: new Map([
            ['breaking', 'Breaking Changes'],
            ['feature', 'Features'],
            ['bug', 'Bug Fixes']
        ]),
        ignoredLabels: ['release'],
        targetSourceFiles,
        ignoredAttributionPaths: [],
        async collectMergedPullRequests(input) {
            options.collectedBaseRefs.push(input.baseRef);
            return [
                { id: bugPullRequestId, title: 'Fix bug' },
                { id: featurePullRequestId, title: 'Add feature' }
            ];
        },
        async readPullRequestChangedFiles() {
            return options.changedFilesByPullRequest;
        },
        filterPullRequestsByTargetFiles,
        async resolvePullRequestLabels(input) {
            return options.resolvedLabels.map((label, index) => {
                const pullRequest = input.pullRequests[index];

                assert.ok(pullRequest !== undefined);
                return { ...pullRequest, label };
            });
        }
    };
}

test('resolvePrLogReleaseVersion() selects the next label-based version', async () => {
    const collectedBaseRefs: string[] = [];
    const version = await resolvePrLogReleaseVersion(
        createInput({
            currentVersion: '1.0.0',
            resolvedLabels: ['bug', 'feature'],
            collectedBaseRefs,
            changedFilesByPullRequest: new Map([
                [bugPullRequestId, ['source/packages/command-line-interface/program.ts']],
                [featurePullRequestId, ['source/lib/create-changelog.ts']]
            ])
        })
    );

    assert.strictEqual(version, '1.1.0');
    assert.deepStrictEqual(collectedBaseRefs, ['pr-log@1.0.0']);
});

test('resolvePrLogReleaseVersion() keeps the latest version when all pull requests are ignored', async () => {
    const version = await resolvePrLogReleaseVersion(
        createInput({
            currentVersion: undefined,
            resolvedLabels: [],
            collectedBaseRefs: [],
            changedFilesByPullRequest: new Map([
                [bugPullRequestId, ['source/packages/command-line-interface/program.ts']],
                [featurePullRequestId, ['source/lib/create-changelog.ts']]
            ])
        })
    );

    assert.strictEqual(version, '1.0.0');
});

test('resolvePrLogReleaseVersion() keeps the latest version when pull requests miss package sources', async () => {
    const version = await resolvePrLogReleaseVersion(
        createInput({
            currentVersion: '1.0.0',
            resolvedLabels: [],
            collectedBaseRefs: [],
            changedFilesByPullRequest: new Map([
                [bugPullRequestId, ['.github/workflows/continuous-integration.yml']],
                [featurePullRequestId, ['packtory.config.js', 'package-lock.json']]
            ])
        })
    );

    assert.strictEqual(version, '1.0.0');
});

test('resolvePrLogReleaseVersion() keeps the latest version when pull request files are missing', async () => {
    const version = await resolvePrLogReleaseVersion(
        createInput({
            currentVersion: '1.0.0',
            resolvedLabels: [],
            collectedBaseRefs: [],
            changedFilesByPullRequest: new Map([[bugPullRequestId, ['.github/workflows/continuous-integration.yml']]])
        })
    );

    assert.strictEqual(version, '1.0.0');
});
