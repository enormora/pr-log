import assert from 'node:assert';
import {
    determineLatestPackageVersionTag,
    filterTargetChangelogPullRequests,
    formatPackageTag,
    selectNextPatchVersion,
    selectNextPrLogVersion,
    selectReleaseTargetFiles,
    type ReleaseTarget
} from './release-plan.ts';
import {
    cliReleaseTarget,
    coreReleaseTarget,
    prepareRelease,
    type CoreReleaseMetadata,
    type ReleasePreparation
} from './prepare-release.ts';

const releaseTarget: ReleaseTarget = {
    packageName: '@pr-log/core',
    changelogPath: 'source/packages/core/CHANGELOG.md',
    sourcePathPrefixes: ['source/core/', 'source/lib/'],
    sourceFilePaths: ['package.json', 'packages/core/README.md'],
    ignoredAttributionPaths: ['source/packages/core/CHANGELOG.md']
};
const cliPullRequestId = 1;
const corePullRequestId = 2;
const unrelatedPullRequestId = 3;

function renderChangelogTitleList(input: Parameters<ReleasePreparation['renderChangelog']>[0]): string {
    return `${input.versionNumber}:${input.mergedPullRequests
        .map((pullRequest) => {
            return pullRequest.title;
        })
        .join(',')}`;
}

function createChangedFilesByPullRequest(hasCoreChange: boolean): ReadonlyMap<number, readonly string[]> {
    if (hasCoreChange) {
        return new Map([
            [corePullRequestId, ['source/core/pr-log-engine.ts']],
            [unrelatedPullRequestId, ['packages/pr-log/README.md']]
        ]);
    }

    return new Map([[corePullRequestId, ['packages/pr-log/README.md']]]);
}

function createReleasePreparation(options: {
    readonly hasCoreChange: boolean;
    readonly writes: string[];
    readonly metadata: CoreReleaseMetadata[];
    readonly resolvedTargets: (string | undefined)[];
}): ReleasePreparation {
    return {
        packageInfo: {},
        githubRepo: 'owner/repository',
        validLabels: new Map([['bug', 'Bug Fixes']]),
        currentDate: new Date('2026-06-15T00:00:00.000Z'),
        tags: ['pr-log@1.0.0', '@pr-log/core@0.0.1'],
        trackedFiles: ['source/core/pr-log-engine.ts'],
        async collectMergedPullRequests(input) {
            if (input.baseRef === 'pr-log@1.0.0') {
                return [{ id: cliPullRequestId, title: 'Fix CLI' }];
            }

            if (options.hasCoreChange) {
                return [
                    { id: corePullRequestId, title: 'Fix core' },
                    { id: unrelatedPullRequestId, title: 'Fix unrelated docs' }
                ];
            }

            return [{ id: corePullRequestId, title: 'Fix docs' }];
        },
        async resolvePullRequestLabels(input) {
            options.resolvedTargets.push(input.targetName);
            return input.pullRequests.map((pullRequest) => {
                return { ...pullRequest, label: 'bug' };
            });
        },
        async readPullRequestChangedFiles() {
            return createChangedFilesByPullRequest(options.hasCoreChange);
        },
        renderChangelog: renderChangelogTitleList,
        async prependChangelog(changelogPath, changelog) {
            options.writes.push(`${changelogPath}:${changelog}`);
        },
        async writePrLogVersion(version) {
            options.writes.push(`version:${version}`);
        },
        async writeCoreReleaseMetadata(coreMetadata) {
            options.metadata.push(coreMetadata);
        }
    };
}

test('determineLatestPackageVersionTag() reads the highest stable package tag', () => {
    const latestTag = determineLatestPackageVersionTag(
        ['pr-log@6.1.0', 'pr-log@6.2.0-alpha.1', '@pr-log/core@1.0.0', 'pr-log@6.2.0'],
        'pr-log'
    );

    assert.deepStrictEqual(latestTag, { tagName: 'pr-log@6.2.0', version: '6.2.0' });
});

test('determineLatestPackageVersionTag() supports scoped package names', () => {
    const latestTag = determineLatestPackageVersionTag(
        ['@pr-log/core@0.0.2', '@pr-log/core@0.0.10', 'pr-log@6.2.0'],
        '@pr-log/core'
    );

    assert.deepStrictEqual(latestTag, { tagName: '@pr-log/core@0.0.10', version: '0.0.10' });
});

test('determineLatestPackageVersionTag() rejects missing package tags', () => {
    assert.throws(
        () => {
            determineLatestPackageVersionTag(['1.0.0', 'pr-log@invalid'], 'pr-log');
        },
        { message: 'Failed to determine latest "pr-log" git tag' }
    );
});

test('selectNextPrLogVersion() uses configured bump labels', () => {
    const version = selectNextPrLogVersion({
        latestVersion: '6.2.0',
        packageInfo: {
            'pr-log': {
                versionBumps: {
                    major: ['breaking'],
                    minor: ['feature'],
                    patch: ['bug']
                }
            }
        },
        validLabels: new Map([
            ['breaking', 'Breaking Changes'],
            ['feature', 'Features'],
            ['bug', 'Bug Fixes']
        ]),
        pullRequests: [
            { id: 1, title: 'Fix bug', label: 'bug' },
            { id: corePullRequestId, title: 'Add feature', label: 'feature' }
        ]
    });

    assert.strictEqual(version, '6.3.0');
});

test('selectNextPatchVersion() increments a patch version', () => {
    assert.strictEqual(selectNextPatchVersion('0.0.1'), '0.0.2');
});

test('selectNextPatchVersion() rejects invalid versions', () => {
    assert.throws(
        () => {
            selectNextPatchVersion('invalid');
        },
        { message: 'Failed to increment version "invalid"' }
    );
});

test('formatPackageTag() formats package-aware tags', () => {
    assert.strictEqual(formatPackageTag('@pr-log/core', '0.0.2'), '@pr-log/core@0.0.2');
});

test('selectReleaseTargetFiles() keeps files owned by a release target', () => {
    const files = selectReleaseTargetFiles(
        [
            'source/core/pr-log-engine.ts',
            './source/lib/create-changelog.ts',
            'packages/core/README.md',
            'packages/pr-log/README.md'
        ],
        releaseTarget
    );

    assert.deepStrictEqual(files, [
        'source/core/pr-log-engine.ts',
        './source/lib/create-changelog.ts',
        'packages/core/README.md'
    ]);
});

test('filterTargetChangelogPullRequests() filters pull requests through target files', () => {
    const pullRequests = [
        { id: 1, title: 'Update core' },
        { id: corePullRequestId, title: 'Update changelog' },
        { id: unrelatedPullRequestId, title: 'Update CLI' }
    ];
    const targetSourceFiles = selectReleaseTargetFiles(
        ['source/core/pr-log-engine.ts', 'source/packages/core/CHANGELOG.md', 'packages/core/README.md'],
        releaseTarget
    );
    const filteredPullRequests = filterTargetChangelogPullRequests({
        targetName: '@pr-log/core',
        targetSourceFiles,
        ignoredAttributionPaths: releaseTarget.ignoredAttributionPaths,
        pullRequests,
        changedFilesByPullRequest: new Map([
            [1, ['source/core/pr-log-engine.ts']],
            [corePullRequestId, ['source/packages/core/CHANGELOG.md']],
            [unrelatedPullRequestId, ['source/packages/command-line-interface/program.ts']]
        ])
    });

    assert.deepStrictEqual(filteredPullRequests, [{ id: 1, title: 'Update core' }]);
});

test('prepareRelease() writes pr-log metadata without a core release when core files did not change', async () => {
    const writes: string[] = [];
    const metadata: CoreReleaseMetadata[] = [];
    const resolvedTargets: (string | undefined)[] = [];

    await prepareRelease(createReleasePreparation({ hasCoreChange: false, writes, metadata, resolvedTargets }));

    assert.deepStrictEqual(writes, [`${cliReleaseTarget.changelogPath}:1.0.1:Fix CLI`, 'version:1.0.1']);
    assert.deepStrictEqual(metadata, [
        {
            type: 'no-release',
            predictedVersion: '',
            predictedTagName: ''
        }
    ]);
});

test('prepareRelease() writes core changelog and metadata when core files changed', async () => {
    const writes: string[] = [];
    const metadata: CoreReleaseMetadata[] = [];
    const resolvedTargets: (string | undefined)[] = [];

    await prepareRelease(createReleasePreparation({ hasCoreChange: true, writes, metadata, resolvedTargets }));

    assert.deepStrictEqual(resolvedTargets, [undefined, coreReleaseTarget.packageName]);
    assert.deepStrictEqual(writes, [
        `${cliReleaseTarget.changelogPath}:1.0.1:Fix CLI`,
        'version:1.0.1',
        `${coreReleaseTarget.changelogPath}:0.0.2:Fix core`
    ]);
    assert.deepStrictEqual(metadata, [
        {
            type: 'predicted-release',
            predictedVersion: '0.0.2',
            predictedTagName: '@pr-log/core@0.0.2'
        }
    ]);
});
