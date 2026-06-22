import assert from 'node:assert';
import { determineLatestPackageVersionTag, formatPackageTag, selectNextPrLogVersion } from './release-plan.ts';

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
            { id: 2, title: 'Add feature', label: 'feature' }
        ]
    });

    assert.strictEqual(version, '6.3.0');
});

test('formatPackageTag() formats package-aware tags', () => {
    assert.strictEqual(formatPackageTag('@pr-log/core', '0.0.2'), '@pr-log/core@0.0.2');
});
