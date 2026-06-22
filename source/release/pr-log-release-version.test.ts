import assert from 'node:assert';
import { resolvePrLogReleaseVersion, type PrLogReleaseVersionInput } from './pr-log-release-version.ts';

function createInput(options: {
    readonly resolvedLabels: readonly string[];
    readonly collectedBaseRefs: string[];
}): PrLogReleaseVersionInput {
    return {
        tags: ['pr-log@1.0.0'],
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
        async collectMergedPullRequests(input) {
            options.collectedBaseRefs.push(input.baseRef);
            return [
                { id: 1, title: 'Fix bug' },
                { id: 2, title: 'Add feature' }
            ];
        },
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
        createInput({ resolvedLabels: ['bug', 'feature'], collectedBaseRefs })
    );

    assert.strictEqual(version, '1.1.0');
    assert.deepStrictEqual(collectedBaseRefs, ['pr-log@1.0.0']);
});

test('resolvePrLogReleaseVersion() keeps the latest version when all pull requests are ignored', async () => {
    const version = await resolvePrLogReleaseVersion(createInput({ resolvedLabels: [], collectedBaseRefs: [] }));

    assert.strictEqual(version, '1.0.0');
});
