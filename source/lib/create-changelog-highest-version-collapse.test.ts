import assert from 'node:assert';
import { createChangelogFactory } from './create-changelog.ts';
import { createPrLogConfigFromPackageInfo } from './pr-log-config.ts';
import { createVersionNumber } from './version-number.ts';

test('collapses pull requests without from versions by highest captured version', function () {
    const config = createPrLogConfigFromPackageInfo({
        'pr-log': {
            collapseRules: [
                {
                    label: 'upgrade',
                    pattern: '^Update dependency (?<dependency>.+?) to (?<to>.+?)$',
                    replace: 'Update dependency $<dependency> to $<to>',
                    versionGroup: 'to'
                }
            ]
        }
    });
    const createChangelog = createChangelogFactory({
        getCurrentDate() {
            return new Date(0);
        },
        config: {
            ...config,
            validLabels: new Map([ [ 'upgrade', 'Dependency Upgrades' ] ]),
            versionBumps: { major: [], minor: [], patch: [ 'upgrade' ] }
        }
    });

    const changelog = createChangelog({
        unreleased: false,
        versionNumber: createVersionNumber('1.0.0'),
        githubRepo: 'any/repo',
        mergedPullRequests: [
            { id: 3, title: 'Update dependency @packtory/cli to v0.0.96', label: 'upgrade' },
            { id: 4, title: 'Refresh dependency metadata', label: 'upgrade' },
            { id: 2, title: 'Update dependency @packtory/cli to v0.0.97', label: 'upgrade' },
            { id: 1, title: 'Update dependency @packtory/cli to v0.0.95', label: 'upgrade' }
        ]
    });

    const expectedChangelog = [
        '### Dependency Upgrades',
        '',
        '* Update dependency @packtory/cli to v0.0.97 ([#3](https://github.com/any/repo/pull/3), [#2](https://github.com/any/repo/pull/2), [#1](https://github.com/any/repo/pull/1))',
        '* Refresh dependency metadata ([#4](https://github.com/any/repo/pull/4))',
        ''
    ]
        .join('\n');

    assert.ok(changelog.includes(expectedChangelog));
});

test('throws when a highest-version collapse rule matches a non-semver version', function () {
    const createChangelog = createChangelogFactory({
        getCurrentDate() {
            return new Date(0);
        },
        config: createPrLogConfigFromPackageInfo({
            'pr-log': {
                collapseRules: [
                    {
                        label: 'upgrade',
                        pattern: '^Update dependency (?<dependency>.+?) to (?<to>.+?)$',
                        replace: 'Update dependency $<dependency> to $<to>',
                        versionGroup: 'to'
                    }
                ]
            }
        })
    });

    assert.throws(
        function () {
            createChangelog({
                unreleased: false,
                versionNumber: createVersionNumber('1.0.0'),
                githubRepo: 'any/repo',
                mergedPullRequests: [
                    { id: 1, title: 'Update dependency @packtory/cli to next', label: 'upgrade' }
                ]
            });
        },
        { message: 'Collapse rule for label "upgrade" requires semver capture group "to"' }
    );
});

test('throws when a highest-version collapse rule is missing the version capture group', function () {
    const createChangelog = createChangelogFactory({
        getCurrentDate() {
            return new Date(0);
        },
        config: createPrLogConfigFromPackageInfo({
            'pr-log': {
                collapseRules: [
                    {
                        label: 'upgrade',
                        pattern: '^Update dependency (?<dependency>.+?)$',
                        replace: 'Update dependency $<dependency> to $<to>',
                        versionGroup: 'to'
                    }
                ]
            }
        })
    });

    assert.throws(
        function () {
            createChangelog({
                unreleased: false,
                versionNumber: createVersionNumber('1.0.0'),
                githubRepo: 'any/repo',
                mergedPullRequests: [
                    { id: 1, title: 'Update dependency @packtory/cli', label: 'upgrade' }
                ]
            });
        },
        { message: 'Collapse rule for label "upgrade" requires capture group "to"' }
    );
});
