import assert from 'node:assert';
import { createChangelogFactory } from './create-changelog.ts';
import { createPrLogConfigFromPackageInfo } from './pr-log-config.ts';
import { createVersionNumber } from './version-number.ts';

test('collapses repeated pull requests without version captures', function () {
    const config = createPrLogConfigFromPackageInfo({
        'pr-log': {
            collapseRules: [
                {
                    label: 'upgrade',
                    pattern: '^⬆️ Update (?<dependency>.+?)$',
                    replace: '⬆️ Update $<dependency>',
                    collapse: 'same'
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
            { id: 665, title: '⬆️ Update eslint', label: 'upgrade' },
            { id: 660, title: '⬆️ Update @overkill-dev dependencies', label: 'upgrade' },
            { id: 658, title: '⬆️ Update eslint', label: 'upgrade' },
            { id: 650, title: '⬆️ Update Linting-related dependencies', label: 'upgrade' },
            { id: 649, title: '⬆️ Update group:monorepos', label: 'upgrade' },
            { id: 648, title: '⬆️ Update @overkill-dev dependencies', label: 'upgrade' },
            { id: 647, title: 'Refresh dependency metadata', label: 'upgrade' }
        ]
    });

    const expectedChangelog = [
        '### Dependency Upgrades',
        '',
        '* ⬆️ Update eslint ([#665](https://github.com/any/repo/pull/665), [#658](https://github.com/any/repo/pull/658))',
        '* ⬆️ Update @overkill-dev dependencies ([#660](https://github.com/any/repo/pull/660), [#648](https://github.com/any/repo/pull/648))',
        '* ⬆️ Update Linting-related dependencies ([#650](https://github.com/any/repo/pull/650))',
        '* ⬆️ Update group:monorepos ([#649](https://github.com/any/repo/pull/649))',
        '* Refresh dependency metadata ([#647](https://github.com/any/repo/pull/647))',
        ''
    ]
        .join('\n');

    assert.ok(changelog.includes(expectedChangelog));
});

test('throws when a versionless collapse rule is missing the key capture group', function () {
    const createChangelog = createChangelogFactory({
        getCurrentDate() {
            return new Date(0);
        },
        config: createPrLogConfigFromPackageInfo({
            'pr-log': {
                collapseRules: [
                    {
                        label: 'upgrade',
                        pattern: '^⬆️ Update (?<dependency>.+?)$',
                        replace: '⬆️ Update $<dependency>',
                        keyGroup: 'name',
                        collapse: 'same'
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
                    { id: 1, title: '⬆️ Update eslint', label: 'upgrade' }
                ]
            });
        },
        { message: 'Collapse rule for label "upgrade" requires capture group "name"' }
    );
});
